import { describe, it, expect } from 'vitest'
import { GameManager, ServerRoom } from '../game-manager.js'
import type { PlayerSession } from '../game-manager.js'

function totalChips(room: ServerRoom): number {
  return room.players.reduce((s, p) => s + p.chips, 0)
}

function magicCount(s: PlayerSession): number {
  return s.magicCards.reduce((n, m) => n + m.quantity, 0)
}

function setup(mode: 'xidach' | 'baicao' = 'xidach', players = 3) {
  const gm = new GameManager()
  const sessions = Array.from({ length: players }, (_, i) => gm.createSession('P' + i))
  const room = gm.createRoom(sessions[0].id, {
    name: 'Phòng test', mode, isPrivate: false, maxPlayers: 8, minBet: 10, maxBet: 1000
  })
  for (let i = 1; i < players; i++) gm.joinRoom(sessions[i].id, room.id)
  return { gm, sessions, room }
}

function playRound(gm: GameManager, room: ServerRoom) {
  gm.startRound(room.id)
  const nonDealer = room.players.filter((p) => !p.isDealer)
  for (const p of nonDealer) {
    gm.placeBet(room.id, p.id, room.minBet)
    gm.confirmBet(room.id, p.id)
  }
  let guard = 0
  while (room.phase === 'playing' && guard++ < 50) {
    const cur = room.players.find((p) => p.seatIndex === room.currentTurnIndex)
    if (!cur) break
    gm.stand(room.id, cur.id)
  }
  return guard
}

describe('Sessions & Magic rewards', () => {
  it('grants initial magic cards on session create', () => {
    const gm = new GameManager()
    const s = gm.createSession('Alice')
    expect(s.chips).toBe(1000)
    expect(magicCount(s)).toBeGreaterThanOrEqual(2)
  })

  it('grants magic cards after a completed round', () => {
    const { gm, room } = setup('xidach', 3)

    playRound(gm, room)

    const nonDealers = room.players.filter((p) => !p.isDealer)
    for (const p of nonDealers) {
      const s = gm.getSession(p.id)!
      expect(magicCount(s)).toBeGreaterThanOrEqual(4)
    }
  })
})

describe('Xì Dách round flow', () => {
  it('reaches settled and conserves total chips', () => {
    const { gm, room } = setup('xidach', 3)
    const before = totalChips(room)
    playRound(gm, room)
    expect(room.phase).toBe('settled')
    expect(room.roundResults.length).toBe(2)
    expect(totalChips(room)).toBe(before)
  })

  it('exposes the current turn while playing', () => {
    const { gm, room } = setup('xidach', 3)
    gm.startRound(room.id)
    const nonDealer = room.players.filter((p) => !p.isDealer)
    for (const p of nonDealer) {
      gm.placeBet(room.id, p.id, 10)
      gm.confirmBet(room.id, p.id)
    }
    expect(room.phase).toBe('playing')
    const pub = gm.getPublicRoom(room)
    expect([...room.players.map((p) => p.id)]).toContain(pub.currentTurnPlayerId)
  })

  it('hides other players hands during play', () => {
    const { gm, sessions, room } = setup('xidach', 3)
    gm.startRound(room.id)
    const nonDealer = room.players.filter((p) => !p.isDealer)
    for (const p of nonDealer) {
      gm.placeBet(room.id, p.id, 10)
      gm.confirmBet(room.id, p.id)
    }
    const viewer = sessions[0].id
    const pub = gm.getPublicRoom(room, viewer)
    const other = pub.players.find((p) => p.id !== viewer && p.hand)
    expect(other?.hand?.score).toBe(-1)
    expect(other?.hand?.cards.every((c: any) => c.id.startsWith('hidden'))).toBe(true)
  })

  it('the dealer turn is reached and the game settles', () => {
    const { gm, room } = setup('xidach', 4)
    const guard = playRound(gm, room)
    expect(guard).toBeLessThan(50)
    expect(room.phase).toBe('settled')
  })
})

describe('Bài Cào round flow', () => {
  it('deals 3 cards and settles immediately after betting', () => {
    const { gm, sessions, room } = setup('baicao', 2)
    const before = totalChips(room)
    gm.startRound(room.id)
    const nonDealer = room.players.filter((p) => !p.isDealer)
    expect(nonDealer.length).toBe(1)
    gm.placeBet(room.id, nonDealer[0].id, 10)
    gm.confirmBet(room.id, nonDealer[0].id)

    expect(room.phase).toBe('settled')
    expect(room.roundResults.length).toBe(1)
    expect(nonDealer[0].hand!.cards.length).toBe(3)
    const dealer = room.players.find((p) => p.isDealer)!
    expect(dealer.hand!.cards.length).toBe(3)
    void sessions
    expect(totalChips(room)).toBe(before)
  })
})

describe('Rooms', () => {
  it('rejects wrong password on private rooms', () => {
    const gm = new GameManager()
    const a = gm.createSession('A')
    const b = gm.createSession('B')
    const room = gm.createRoom(a.id, {
      name: 'Private', mode: 'xidach', isPrivate: true, password: 'secret', maxPlayers: 4, minBet: 10, maxBet: 100
    })
    const bad = gm.joinRoom(b.id, room.id, 'nope')
    expect(bad.error).toBeTruthy()
    const ok = gm.joinRoom(b.id, room.id, 'secret')
    expect(ok.error).toBeUndefined()
  })

  it('prevents placing a bet above the table maximum', () => {
    const { gm, room } = setup('xidach', 2)
    gm.startRound(room.id)
    const nonDealer = room.players.find((p) => !p.isDealer)!
    const res = gm.placeBet(room.id, nonDealer.id, 99999)
    expect(res.error).toBeTruthy()
  })

  it('transfers host when the host leaves', () => {
    const { gm, sessions, room } = setup('xidach', 3)
    gm.leaveRoom(sessions[0].id)
    expect(room.hostId).not.toBe(sessions[0].id)
    expect(room.players.find((p) => p.isHost)).toBeTruthy()
  })
})
