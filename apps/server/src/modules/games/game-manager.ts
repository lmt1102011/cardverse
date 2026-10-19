import { randomUUID } from 'node:crypto'
import type {
  Room, RoomPlayer, GameMode, Card, OwnedMagicCard, MagicCardDef,
  RoundPlayerResult
} from '@cardverse/shared'
import {
  createDeck, blackjackScore, isBlackjack, isBust, baCaoScore, baCaoHandRank, MAGIC_CARDS
} from '@cardverse/shared'
import { config } from '../../config/env.js'

export interface PlayerFlags {
  noBust?: boolean
  doubleBet?: boolean
  counter?: boolean
  blindUntil?: number
}

export interface ServerRoom extends Room {
  deck: Card[]
  phase: 'waiting' | 'betting' | 'dealing' | 'playing' | 'reveal' | 'settled'
  currentTurnIndex: number
  roundNumber: number
  roundResults: RoundPlayerResult[]
  magicQueue: Array<{ casterId: string; effect: string; targetId?: string }>
  flags: Record<string, PlayerFlags>
  password?: string
}

export interface PlayerSession {
  id: string
  name: string
  avatar: string
  chips: number
  roomId: string | null
  socketId: string | null
  magicCards: OwnedMagicCard[]
}

const AVATARS = ['🎭', '🦊', '🐼', '🦁', '🐯', '🐸', '🐵', '🦄', '🐲', '🐺', '🐨', '🐷']

const RARITY_WEIGHTS: Record<string, number> = {
  common: 55, rare: 25, epic: 12, legendary: 6, mythic: 2
}

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let r = ''
  for (let i = 0; i < 6; i++) r += chars[Math.floor(Math.random() * chars.length)]
  return r
}

export class GameManager {
  private rooms = new Map<string, ServerRoom>()
  private sessions = new Map<string, PlayerSession>()
  private playerRooms = new Map<string, string>()

  createSession(name: string): PlayerSession {
    const session: PlayerSession = {
      id: randomUUID(),
      name: name.slice(0, 16) || 'Người chơi',
      avatar: AVATARS[Math.floor(Math.random() * AVATARS.length)],
      chips: config.initialChips,
      roomId: null,
      socketId: null,
      magicCards: []
    }
    this.grantMagicCards(session, config.magicCardsInitial)
    this.sessions.set(session.id, session)
    return session
  }

  getSession(id: string): PlayerSession | undefined {
    return this.sessions.get(id)
  }

  updateSession(id: string, data: Partial<PlayerSession>) {
    const s = this.sessions.get(id)
    if (s) Object.assign(s, data)
  }

  private rollMagicCard(): MagicCardDef {
    const total = MAGIC_CARDS.reduce((s, c) => s + (RARITY_WEIGHTS[c.rarity] || 0), 0)
    let r = Math.random() * total
    for (const c of MAGIC_CARDS) {
      r -= RARITY_WEIGHTS[c.rarity] || 0
      if (r <= 0) return c
    }
    return MAGIC_CARDS[0]
  }

  grantMagicCards(owner: { magicCards: OwnedMagicCard[] }, count: number) {
    for (let i = 0; i < count; i++) {
      const def = this.rollMagicCard()
      const existing = owner.magicCards.find((m) => m.slug === def.slug)
      if (existing) existing.quantity++
      else owner.magicCards.push({ id: randomUUID(), slug: def.slug, quantity: 1, usedInRound: false })
    }
  }

  createRoom(hostId: string, opts: {
    name: string; mode: GameMode; isPrivate: boolean; password?: string
    maxPlayers: number; minBet: number; maxBet: number
  }): ServerRoom {
    const host = this.sessions.get(hostId)
    if (!host) throw new Error('No session')

    const hostPlayer: RoomPlayer = {
      id: host.id, name: host.name, avatar: host.avatar, chips: host.chips,
      isHost: true, isDealer: false, seatIndex: 0, connected: true, ready: true,
      bet: 0, betConfirmed: false, status: 'idle', hand: null,
      magicCards: host.magicCards.map((m) => ({ ...m, usedInRound: false })),
      magicUsedThisRound: false, magicShield: false, magicLocked: false
    }

    const room: ServerRoom = {
      id: randomUUID(),
      name: opts.name.slice(0, 24) || 'Phòng mới',
      code: generateCode(),
      mode: opts.mode,
      isPrivate: !!opts.isPrivate,
      password: opts.isPrivate ? (opts.password || '') : undefined,
      maxPlayers: Math.min(Math.max(opts.maxPlayers || 8, 2), 8),
      minPlayers: 2,
      minBet: opts.minBet || 10,
      maxBet: opts.maxBet || 100,
      status: 'waiting',
      hostId: host.id,
      players: [hostPlayer],
      dealerId: null,
      currentRoundId: null,
      createdAt: Date.now(),
      deck: [],
      phase: 'waiting',
      currentTurnIndex: 0,
      roundNumber: 0,
      roundResults: [],
      magicQueue: [],
      flags: {}
    }

    this.rooms.set(room.id, room)
    this.playerRooms.set(host.id, room.id)
    host.roomId = room.id
    return room
  }

  getRoom(id: string): ServerRoom | undefined {
    return this.rooms.get(id)
  }

  getRoomByCode(code: string): ServerRoom | undefined {
    return Array.from(this.rooms.values()).find((r) => r.code === code.toUpperCase())
  }

  listRooms(mode?: GameMode): ServerRoom[] {
    return Array.from(this.rooms.values()).filter((r) => {
      if (r.status === 'closed') return false
      if (mode && r.mode !== mode) return false
      return true
    })
  }

  joinRoom(playerId: string, roomId: string, password?: string): { room: ServerRoom; error?: string } {
    const room = this.rooms.get(roomId)
    const session = this.sessions.get(playerId)
    if (!room || !session) return { room: room!, error: 'Phòng không tồn tại' }
    if (room.players.some((p) => p.id === playerId)) return { room, error: 'Bạn đã ở trong phòng' }
    if (room.status === 'closed') return { room, error: 'Phòng đã đóng' }
    if (room.players.length >= room.maxPlayers) return { room, error: 'Phòng đã đầy' }
    if (room.phase !== 'waiting') return { room, error: 'Ván đang diễn ra' }
    if (room.isPrivate) {
      const ok = password === room.password || password === room.code
      if (!ok) return { room, error: 'Mật khẩu sai' }
    }

    const usedSeats = room.players.map((p) => p.seatIndex)
    let seatIndex = 0
    while (usedSeats.includes(seatIndex) && seatIndex < 8) seatIndex++
    if (seatIndex >= 8) return { room, error: 'Không còn ghế trống' }

    const player: RoomPlayer = {
      id: session.id, name: session.name, avatar: session.avatar, chips: session.chips,
      isHost: false, isDealer: false, seatIndex, connected: true, ready: true,
      bet: 0, betConfirmed: false, status: 'idle', hand: null,
      magicCards: session.magicCards.map((m) => ({ ...m, usedInRound: false })),
      magicUsedThisRound: false, magicShield: false, magicLocked: false
    }

    room.players.push(player)
    this.playerRooms.set(playerId, roomId)
    session.roomId = roomId

    if (room.players.length >= room.maxPlayers) room.status = 'full'
    return { room }
  }

  leaveRoom(playerId: string): { room: ServerRoom | null } {
    const roomId = this.playerRooms.get(playerId)
    if (!roomId) return { room: null }
    const room = this.rooms.get(roomId)
    if (!room) return { room: null }

    const leaving = room.players.find((p) => p.id === playerId)
    const session = this.sessions.get(playerId)
    if (session && leaving) session.chips = leaving.chips

    room.players = room.players.filter((p) => p.id !== playerId)
    delete room.flags[playerId]
    this.playerRooms.delete(playerId)
    if (session) session.roomId = null

    if (room.players.length === 0) {
      this.rooms.delete(roomId)
      return { room: null }
    }

    if (room.hostId === playerId) {
      room.hostId = room.players[0].id
      room.players[0].isHost = true
    }
    if (room.dealerId === playerId) room.dealerId = null

    if (room.phase === 'playing' && leaving?.hand && !leaving.hand.isStand) {
      leaving.hand.isStand = true
      if (leaving.seatIndex === room.currentTurnIndex) this.advanceTurn(room)
    }

    if (room.players.length < room.maxPlayers && room.status === 'full') room.status = 'waiting'
    if (room.phase !== 'waiting' && room.players.length < 2) {
      room.phase = 'waiting'
      room.status = 'waiting'
    }

    return { room }
  }

  disconnect(playerId: string): { room: ServerRoom | null } {
    const roomId = this.playerRooms.get(playerId)
    if (!roomId) return { room: null }
    const room = this.rooms.get(roomId)
    if (!room) return { room: null }
    const player = room.players.find((p) => p.id === playerId)
    if (!player) return { room }

    player.connected = false
    if (room.phase === 'playing' && player.hand && !player.hand.isStand && player.seatIndex === room.currentTurnIndex) {
      player.status = 'stand'
      player.hand.isStand = true
      this.advanceTurn(room)
    }
    return { room }
  }

  startRound(roomId: string): { room: ServerRoom; error?: string } {
    const room = this.rooms.get(roomId)
    if (!room) return { room: room!, error: 'Phòng không tồn tại' }
    if (room.phase !== 'waiting') return { room, error: 'Ván đang diễn ra' }
    if (room.players.length < 2) return { room, error: 'Cần ít nhất 2 người' }

    const eligible = room.players.filter((p) => p.connected && p.chips >= room.minBet)
    if (eligible.length < 2) return { room, error: 'Không đủ người đủ chip' }

    room.roundNumber++
    room.currentRoundId = randomUUID()
    room.status = 'playing'
    room.phase = 'betting'
    room.deck = createDeck()
    room.currentTurnIndex = 0
    room.flags = {}
    room.roundResults = []

    const dealerIdx = Math.floor(Math.random() * eligible.length)
    room.dealerId = eligible[dealerIdx].id
    for (const p of room.players) {
      p.isDealer = p.id === room.dealerId
      p.bet = 0
      p.betConfirmed = false
      p.status = 'idle'
      p.hand = null
      p.magicUsedThisRound = false
      p.magicShield = false
      p.magicLocked = false
      p.magicCards = p.magicCards.map((m) => ({ ...m, usedInRound: false }))
    }

    return { room }
  }

  placeBet(roomId: string, playerId: string, amount: number): { room: ServerRoom; error?: string } {
    const room = this.rooms.get(roomId)
    if (!room) return { room: room!, error: 'Phòng không tồn tại' }
    if (room.phase !== 'betting') return { room, error: 'Không phải lượt cược' }
    const player = room.players.find((p) => p.id === playerId)
    if (!player) return { room, error: 'Không tìm thấy người chơi' }
    if (player.isDealer) return { room, error: 'Nhà cái không cược' }
    if (player.betConfirmed) return { room, error: 'Đã xác nhận cược' }
    if (amount < room.minBet) return { room, error: `Cược tối thiểu ${room.minBet}` }
    if (amount > room.maxBet) return { room, error: `Cược tối đa ${room.maxBet}` }
    if (amount > player.chips) return { room, error: 'Không đủ chip' }

    player.bet = amount
    return { room }
  }

  confirmBet(roomId: string, playerId: string): { room: ServerRoom; error?: string } {
    const room = this.rooms.get(roomId)
    if (!room) return { room: room!, error: 'Phòng không tồn tại' }
    if (room.phase !== 'betting') return { room, error: 'Không phải lượt cược' }
    const player = room.players.find((p) => p.id === playerId)
    if (!player) return { room, error: 'Không tìm thấy' }
    if (player.isDealer) return { room, error: 'Nhà cái không cược' }
    if (player.bet < room.minBet) return { room, error: 'Chưa đặt cược' }
    if (player.betConfirmed) return { room, error: 'Đã xác nhận' }

    player.betConfirmed = true
    player.chips -= player.bet
    player.status = 'betting'

    const nonDealer = room.players.filter((p) => !p.isDealer && p.connected && p.hand === null)
    const allConfirmed = nonDealer.length > 0 && nonDealer.every((p) => p.betConfirmed)
    if (allConfirmed) {
      room.phase = 'dealing'
      this.dealCards(room)
    }

    return { room }
  }

  private dealCards(room: ServerRoom) {
    const cardCount = room.mode === 'baicao' ? 3 : 2
    const nonDealer = room.players.filter((p) => !p.isDealer)
    const dealer = room.players.find((p) => p.isDealer)

    for (const p of nonDealer) {
      if (!p.betConfirmed && !p.isDealer) continue
      const cards = room.deck.splice(-cardCount, cardCount)
      p.hand = { playerId: p.id, cards, score: 0, isBlackjack: false, isBust: false, isStand: false, revealed: false }
      this.updateHandScore(room, p)
      p.status = 'playing'
    }

    if (dealer) {
      const cards = room.deck.splice(-cardCount, cardCount)
      dealer.hand = { playerId: dealer.id, cards, score: 0, isBlackjack: false, isBust: false, isStand: false, revealed: false }
      this.updateHandScore(room, dealer)
      dealer.status = 'playing'
    }

    if (room.mode === 'baicao') {
      this.revealAndSettle(room)
      return
    }

    const first = nonDealer.filter((p) => p.connected).sort((a, b) => a.seatIndex - b.seatIndex)[0]
    room.currentTurnIndex = first ? first.seatIndex : 0
    room.phase = 'playing'
  }

  recomputeHand(room: ServerRoom, player: RoomPlayer) {
    this.updateHandScore(room, player)
  }

  private updateHandScore(room: ServerRoom, player: RoomPlayer) {
    if (!player.hand) return
    if (room.mode === 'xidach') {
      player.hand.score = blackjackScore(player.hand.cards)
      player.hand.isBlackjack = isBlackjack(player.hand.cards)
      player.hand.isBust = isBust(player.hand.cards)
    } else {
      player.hand.score = baCaoScore(player.hand.cards)
      player.hand.isBlackjack = false
      player.hand.isBust = false
    }
  }

  drawCard(roomId: string, playerId: string): { room: ServerRoom; error?: string } {
    const room = this.rooms.get(roomId)
    if (!room) return { room: room!, error: 'Phòng không tồn tại' }
    if (room.phase !== 'playing') return { room, error: 'Không phải lượt chơi' }
    const player = room.players.find((p) => p.id === playerId)
    if (!player) return { room, error: 'Không tìm thấy' }
    if (!player.hand || player.hand.isStand) return { room, error: 'Không thể rút' }
    if (player.seatIndex !== room.currentTurnIndex) return { room, error: 'Chưa tới lượt' }
    if (room.deck.length === 0) return { room, error: 'Hết bài' }

    const card = room.deck.pop()!
    player.hand.cards.push(card)
    this.updateHandScore(room, player)

    if (player.hand.isBust) {
      const flags = room.flags[player.id]
      if (flags?.noBust) {
        flags.noBust = false
        const removed = player.hand.cards.pop()
        if (removed) room.deck.push(removed)
        this.updateHandScore(room, player)
        player.status = 'stand'
        player.hand.isStand = true
        this.advanceTurn(room)
        return { room }
      }
      player.status = 'bust'
      player.hand.isStand = true
      this.advanceTurn(room)
    }

    return { room }
  }

  stand(roomId: string, playerId: string): { room: ServerRoom; error?: string } {
    const room = this.rooms.get(roomId)
    if (!room) return { room: room!, error: 'Phòng không tồn tại' }
    if (room.phase !== 'playing') return { room, error: 'Không phải lượt chơi' }
    const player = room.players.find((p) => p.id === playerId)
    if (!player) return { room, error: 'Không tìm thấy' }
    if (!player.hand || player.hand.isStand) return { room, error: 'Đã dừng' }
    if (player.seatIndex !== room.currentTurnIndex) return { room, error: 'Chưa tới lượt' }

    player.status = 'stand'
    player.hand.isStand = true
    this.advanceTurn(room)
    return { room }
  }

  private advanceTurn(room: ServerRoom) {
    const allNonDealer = room.players.filter((p) => !p.isDealer).sort((a, b) => a.seatIndex - b.seatIndex)
    const dealer = room.players.find((p) => p.isDealer)
    const order = dealer ? [...allNonDealer, dealer] : allNonDealer

    const startIdx = order.findIndex((p) => p.seatIndex === room.currentTurnIndex)
    for (let i = 1; i <= order.length; i++) {
      const cand = order[(startIdx + i + order.length) % order.length]
      if (cand.hand && !cand.hand.isStand && cand.connected) {
        room.currentTurnIndex = cand.seatIndex
        return
      }
    }
    this.revealAndSettle(room)
  }

  private revealAndSettle(room: ServerRoom) {
    room.phase = 'reveal'

    const dealer = room.players.find((p) => p.isDealer)
    for (const p of room.players) {
      if (p.hand) p.hand.revealed = true
    }
    const dealerHand = dealer?.hand

    const results: RoundPlayerResult[] = []

    if (!dealer || !dealerHand) {
      room.roundResults = results
      room.phase = 'settled'
      return
    }

    const participants = room.players.filter((p) => !p.isDealer && p.hand)

    if (room.mode === 'baicao') {
      const dRank = baCaoHandRank(dealerHand.cards)
      for (const p of participants) {
        const hand = p.hand!
        const rank = baCaoHandRank(hand.cards)
        const mult = rank.tier === 3 ? 3 : rank.tier === 2 ? 2 : 1
        let result: 'win' | 'lose' | 'push'
        let payout: number
        if (rank.tier > dRank.tier || (rank.tier === dRank.tier && rank.value > dRank.value)) {
          result = 'win'; payout = p.bet * mult
        } else if (rank.tier < dRank.tier || (rank.tier === dRank.tier && rank.value < dRank.value)) {
          result = 'lose'; payout = -p.bet
        } else {
          result = 'push'; payout = 0
        }
        if (payout > 0 && room.flags[p.id]?.doubleBet) payout *= 2
        p.chips += p.bet + payout
        results.push({
          playerId: p.id, hand: hand.cards, score: rank.value,
          isBlackjack: rank.tier > 0, isBust: false, result, payout
        })
      }
    } else {
      for (const p of participants) {
        const hand = p.hand!
        const score = hand.score
        const dealerScore = dealerHand.score
        let result: 'win' | 'lose' | 'push' | 'blackjack'
        let payout: number

        if (hand.isBust) { result = 'lose'; payout = -p.bet }
        else if (hand.isBlackjack && !dealerHand.isBlackjack) { result = 'blackjack'; payout = Math.floor(p.bet * 1.5) }
        else if (dealerHand.isBlackjack && !hand.isBlackjack) { result = 'lose'; payout = -p.bet }
        else if (dealerHand.isBust) { result = 'win'; payout = p.bet }
        else if (score > dealerScore) { result = 'win'; payout = p.bet }
        else if (score < dealerScore) { result = 'lose'; payout = -p.bet }
        else { result = 'push'; payout = 0 }

        if (payout > 0 && room.flags[p.id]?.doubleBet) payout *= 2
        p.chips += p.bet + payout
        results.push({
          playerId: p.id, hand: hand.cards, score,
          isBlackjack: hand.isBlackjack, isBust: hand.isBust, result, payout
        })
      }
    }

    const totalPayout = results.reduce((s, r) => s + r.payout, 0)
    dealer.chips = Math.max(0, dealer.chips - totalPayout)

    room.roundResults = results
    room.phase = 'settled'
    room.flags = {}

    for (const p of room.players) {
      const s = this.sessions.get(p.id)
      if (!s) continue
      s.chips = p.chips
      if (!p.isDealer && p.hand) {
        this.grantMagicCards(s, config.magicCardsPerRound)
        p.magicCards = s.magicCards.map((m) => ({ ...m, usedInRound: false }))
      }
    }
  }

  nextRound(roomId: string): { room: ServerRoom; error?: string } {
    const room = this.rooms.get(roomId)
    if (!room) return { room: room!, error: 'Phòng không tồn tại' }
    if (room.phase !== 'settled') return { room, error: 'Ván chưa kết thúc' }

    room.phase = 'waiting'
    room.status = room.players.length >= room.maxPlayers ? 'full' : 'waiting'
    room.dealerId = null
    room.currentRoundId = null
    room.roundResults = []
    room.deck = []
    room.flags = {}

    for (const p of room.players) {
      p.hand = null
      p.isDealer = false
      p.bet = 0
      p.betConfirmed = false
      p.status = 'idle'
    }

    return { room }
  }

  getPublicRoom(room: ServerRoom, forPlayerId?: string) {
    const revealed = room.phase === 'reveal' || room.phase === 'settled'
    const currentTurn = room.phase === 'playing'
      ? room.players.find((p) => p.seatIndex === room.currentTurnIndex)?.id ?? null
      : null

    const players = room.players.map((p) => {
      const own = forPlayerId === p.id
      return {
        id: p.id, name: p.name, avatar: p.avatar, chips: p.chips,
        isHost: p.isHost, isDealer: p.isDealer, seatIndex: p.seatIndex,
        connected: p.connected, ready: p.ready,
        bet: p.bet, betConfirmed: p.betConfirmed, status: p.status,
        magicUsedThisRound: p.magicUsedThisRound, magicShield: p.magicShield, magicLocked: p.magicLocked,
        blindUntil: own ? (room.flags[p.id]?.blindUntil || 0) : 0,
        hand: p.hand ? {
          playerId: p.hand.playerId,
          cards: own || revealed
            ? p.hand.cards
            : p.hand.cards.map((_, i) => ({ id: 'hidden-' + i, suit: 'hearts' as const, rank: '2' as const, value: 0 })),
          score: own || revealed ? p.hand.score : -1,
          isBlackjack: own || revealed ? p.hand.isBlackjack : false,
          isBust: p.hand.isBust,
          isStand: p.hand.isStand,
          revealed: own || revealed
        } : null,
        magicCards: own ? p.magicCards : undefined
      }
    })

    return {
      id: room.id, name: room.name, code: room.code, mode: room.mode,
      isPrivate: room.isPrivate, maxPlayers: room.maxPlayers, minPlayers: room.minPlayers,
      minBet: room.minBet, maxBet: room.maxBet, status: room.status,
      hostId: room.hostId, dealerId: room.dealerId, currentRoundId: room.currentRoundId,
      phase: room.phase, roundNumber: room.roundNumber,
      deckCount: room.deck.length,
      currentTurnPlayerId: currentTurn,
      roundResults: room.phase === 'settled' ? room.roundResults : [],
      players
    }
  }

  listRoomsPublic(mode?: GameMode) {
    return this.listRooms(mode).map((r) => ({
      id: r.id, name: r.name, code: r.code, mode: r.mode,
      isPrivate: r.isPrivate, maxPlayers: r.maxPlayers,
      playerCount: r.players.length, status: r.status,
      minBet: r.minBet, maxBet: r.maxBet,
      hostName: r.players.find((p) => p.isHost)?.name || 'Unknown'
    }))
  }
}
