import type { Server, Socket } from 'socket.io'
import { GameManager } from '../modules/games/game-manager.js'
import { MAGIC_CARDS } from '@cardverse/shared'

const NEGATIVE_EFFECTS = ['lock_magic', 'blind', 'swap_card']

export function setupSocketHandlers(io: Server, gameManager: GameManager) {
  const pushRoom = async (roomId: string) => {
    const room = gameManager.getRoom(roomId)
    if (!room) return
    const sockets = await io.in(roomId).fetchSockets()
    for (const s of sockets) {
      s.emit('room:update', gameManager.getPublicRoom(room, s.data.playerId as string | undefined))
    }
  }

  const emitTurn = (roomId: string) => {
    const room = gameManager.getRoom(roomId)
    if (!room || room.phase !== 'playing') return
    const cur = room.players.find((p) => p.seatIndex === room.currentTurnIndex)
    if (cur) io.to(roomId).emit('game:turnChanged', { roomId, playerId: cur.id })
  }

  const afterAction = (room: any, roomId: string) => {
    void pushRoom(roomId)
    if (room.phase === 'settled') {
      io.to(roomId).emit('game:roundEnded', { roomId, results: room.roundResults })
    } else {
      emitTurn(roomId)
    }
  }

  const finish = (
    room: any, socket: Socket, def: any, message: string, revealedCards: unknown[],
    meta: { casterId: string; targetId?: string }
  ) => {
    const isPrivateReveal = def.effectType === 'peek_card' || def.effectType === 'reveal_all' || def.effectType === 'reveal_total'
    if (!isPrivateReveal) {
      io.to(room.id).emit('magic:effect', { casterId: meta.casterId, targetId: meta.targetId, message })
    } else {
      socket.emit('magic:effect', { casterId: meta.casterId, message, revealedCards })
    }
    void pushRoom(room.id)
  }

  io.on('connection', (socket: Socket) => {
    let playerId: string | null = null

    socket.on('session:create' as any, (name: string, cb: Function) => {
      const session = gameManager.createSession(name)
      playerId = session.id
      socket.data.playerId = session.id
      cb({ playerId: session.id, name: session.name, avatar: session.avatar, chips: session.chips })
    })

    socket.on('room:list' as any, (mode: string | undefined, cb: Function) => {
      cb(gameManager.listRoomsPublic(mode as any))
    })

    socket.on('room:create' as any, (opts: any, cb: Function) => {
      if (!playerId) return cb({ error: 'Chưa đăng nhập' })
      try {
        const room = gameManager.createRoom(playerId, opts)
        socket.join(room.id)
        cb({ room: gameManager.getPublicRoom(room, playerId) })
      } catch (e: any) {
        cb({ error: e.message })
      }
    })

    socket.on('room:join' as any, (opts: any, cb: Function) => {
      if (!playerId) return cb({ error: 'Chưa đăng nhập' })
      const { room, error } = gameManager.joinRoom(playerId, opts.roomId, opts.password)
      if (error) return cb({ error })
      socket.join(room.id)
      void pushRoom(room.id)
      io.to(room.id).emit('player:joined', { roomId: room.id, playerName: gameManager.getSession(playerId)?.name })
      cb({ room: gameManager.getPublicRoom(room, playerId) })
    })

    socket.on('room:leave' as any, (roomId: string, cb: Function) => {
      if (!playerId) return cb({ ok: false })
      socket.leave(roomId)
      const { room } = gameManager.leaveRoom(playerId)
      if (room) {
        void pushRoom(roomId)
        io.to(roomId).emit('player:left', { roomId, playerId })
      }
      cb({ ok: true })
    })

    socket.on('room:start' as any, (roomId: string, cb: Function) => {
      if (!playerId) return cb({ error: 'Chưa đăng nhập' })
      const { room, error } = gameManager.startRound(roomId)
      if (error) return cb({ error })
      void pushRoom(roomId)
      const dealer = room.players.find((p) => p.isDealer)
      if (dealer) io.to(roomId).emit('notification', { type: 'info', message: `${dealer.name} là Nhà cái ván ${room.roundNumber}` })
      cb({ room: gameManager.getPublicRoom(room, playerId) })
    })

    socket.on('game:placeBet' as any, (opts: any, cb: Function) => {
      if (!playerId) return cb({ error: 'Chưa đăng nhập' })
      const { room, error } = gameManager.placeBet(opts.roomId, playerId, opts.amount)
      if (error) return cb({ error })
      void pushRoom(opts.roomId)
      cb({ room: gameManager.getPublicRoom(room, playerId) })
    })

    socket.on('game:confirmBet' as any, (opts: any, cb: Function) => {
      if (!playerId) return cb({ error: 'Chưa đăng nhập' })
      const { room, error } = gameManager.confirmBet(opts.roomId, playerId)
      if (error) return cb({ error })
      void pushRoom(opts.roomId)
      if (room.phase === 'playing') {
        io.to(opts.roomId).emit('game:dealt', { roomId: opts.roomId })
        emitTurn(opts.roomId)
      } else if (room.phase === 'settled') {
        io.to(opts.roomId).emit('game:roundEnded', { roomId: opts.roomId, results: room.roundResults })
      }
      cb({ room: gameManager.getPublicRoom(room, playerId) })
    })

    socket.on('game:draw' as any, (opts: any, cb: Function) => {
      if (!playerId) return cb({ error: 'Chưa đăng nhập' })
      const { room, error } = gameManager.drawCard(opts.roomId, playerId)
      if (error) return cb({ error })
      afterAction(room, opts.roomId)
      cb({ room: gameManager.getPublicRoom(room, playerId) })
    })

    socket.on('game:stand' as any, (opts: any, cb: Function) => {
      if (!playerId) return cb({ error: 'Chưa đăng nhập' })
      const { room, error } = gameManager.stand(opts.roomId, playerId)
      if (error) return cb({ error })
      afterAction(room, opts.roomId)
      cb({ room: gameManager.getPublicRoom(room, playerId) })
    })

    socket.on('game:nextRound' as any, (opts: any, cb: Function) => {
      if (!playerId) return cb({ error: 'Chưa đăng nhập' })
      const { room, error } = gameManager.nextRound(opts.roomId)
      if (error) return cb({ error })
      void pushRoom(opts.roomId)
      cb({ room: gameManager.getPublicRoom(room) })
    })

    socket.on('magic:use' as any, (opts: any, cb: Function) => {
      if (!playerId) return cb({ success: false, message: 'Chưa đăng nhập' })
      const room = gameManager.getRoom(opts.roomId)
      if (!room) return cb({ success: false, message: 'Phòng không tồn tại' })
      const player = room.players.find((p) => p.id === playerId)
      if (!player) return cb({ success: false, message: 'Không tìm thấy người chơi' })
      if (player.magicLocked) return cb({ success: false, message: 'Bạn đang bị khóa Magic Card' })
      if (player.magicUsedThisRound) return cb({ success: false, message: 'Mỗi ván chỉ dùng được 1 lá phép' })

      const owned = player.magicCards.find((m) => m.id === opts.magicCardId && m.quantity > 0 && !m.usedInRound)
      if (!owned) return cb({ success: false, message: 'Không có lá phép này' })

      const def = MAGIC_CARDS.find((c) => c.slug === owned.slug)
      if (!def) return cb({ success: false, message: 'Lá phép không hợp lệ' })
      if (!def.compatibleModes.includes(room.mode)) return cb({ success: false, message: `Không hỗ trợ chế độ này` })
      if (def.phase === 'betting' && room.phase !== 'betting') return cb({ success: false, message: 'Chỉ dùng được khi đặt cược' })
      if (def.phase === 'playing' && room.phase !== 'playing') return cb({ success: false, message: 'Chỉ dùng được khi đang chơi' })
      if ((def.phase === 'betting' || def.phase === 'playing') && room.phase === 'settled') return cb({ success: false, message: 'Ván đã kết thúc' })

      const flags = room.flags
      const target = opts.targetPlayerId ? room.players.find((p) => p.id === opts.targetPlayerId) : undefined
      if (def.targetType !== 'self' && def.targetType !== 'none' && !target) {
        return cb({ success: false, message: 'Chưa chọn mục tiêu' })
      }

      let message = `Đã dùng "${def.name}"`
      let revealedCards: unknown[] = []
      let consumed = false

      const consume = () => {
        owned.quantity--
        owned.usedInRound = true
        player.magicUsedThisRound = true
        consumed = true
      }

      const isNegative = NEGATIVE_EFFECTS.includes(def.effectType) && target && target.id !== playerId
      if (isNegative && target) {
        const tf = flags[target.id] || (flags[target.id] = {})
        if (tf.counter) {
          tf.counter = false
          consume()
          message = `${target.name} đã phản đòn! Phép bị vô hiệu hóa.`
          finish(room, socket, def, message, revealedCards, { casterId: playerId, targetId: target.id })
          return cb({ success: true, message, result: { revealedCards } })
        }
        if (target.magicShield) {
          target.magicShield = false
          consume()
          message = `Khiên của ${target.name} đã chặn "${def.name}"!`
          finish(room, socket, def, message, revealedCards, { casterId: playerId, targetId: target.id })
          return cb({ success: true, message, result: { revealedCards } })
        }
      }

      switch (def.effectType) {
        case 'peek_card': {
          const card = target?.hand?.cards.find((c) => c.id === opts.targetCardId) || target?.hand?.cards[0]
          if (card) {
            revealedCards = [card]
            message = `Bạn liếc được lá ${card.rank} ${suitGlyph(card.suit)}`
          } else {
            return cb({ success: false, message: 'Đối thủ chưa có bài' })
          }
          consume()
          break
        }
        case 'reveal_total': {
          if (!target?.hand) return cb({ success: false, message: 'Đối thủ chưa có bài' })
          message = `Tổng điểm của ${target.name}: ${target.hand.score}`
          consume()
          break
        }
        case 'reveal_all': {
          if (!target?.hand) return cb({ success: false, message: 'Đối thủ chưa có bài' })
          revealedCards = target.hand.cards
          message = `Toàn bộ bài của ${target.name}`
          consume()
          break
        }
        case 'lucky_refund': {
          const refund = Math.min(Math.floor(player.bet * 0.1), 20)
          player.chips += refund
          const s = gameManager.getSession(playerId)
          if (s) s.chips = player.chips
          message = `Hoàn lại ${refund} chip!`
          consume()
          break
        }
        case 'block_negative': {
          flags[playerId] = { ...flags[playerId], noBust: true }
          message = 'Bùa hộ mệnh đã kích hoạt — lần quắc tới sẽ được cứu!'
          consume()
          break
        }
        case 'shield': {
          player.magicShield = true
          message = 'Khiên bảo vệ đã bật — chặn phép tiêu cực tới!'
          consume()
          break
        }
        case 'counter': {
          flags[playerId] = { ...flags[playerId], counter: true }
          message = 'Quả báo đã cài — phép tiêu cực tới sẽ bị phản!'
          consume()
          break
        }
        case 'lock_magic': {
          if (target) target.magicLocked = true
          message = `Đã khóa Magic Card của ${target?.name}`
          consume()
          break
        }
        case 'blind': {
          if (target) flags[target.id] = { ...flags[target.id], blindUntil: Date.now() + 5000 }
          message = `Đã bịt mắt ${target?.name} trong 5 giây!`
          consume()
          break
        }
        case 'double_bet': {
          flags[playerId] = { ...flags[playerId], doubleBet: true }
          message = 'Nhân đôi tiền thắng đã kích hoạt!'
          consume()
          break
        }
        case 'swap_card': {
          if (!target?.hand || !player.hand || player.hand.cards.length === 0) {
            return cb({ success: false, message: 'Không thể đổi bài' })
          }
          const theirCard = target.hand.cards.find((c) => c.id === opts.targetCardId) || target.hand.cards[0]
          const myIdx = Math.floor(Math.random() * player.hand.cards.length)
          const myCard = player.hand.cards[myIdx]
          const theirIdx = target.hand.cards.findIndex((c) => c.id === theirCard.id)
          player.hand.cards[myIdx] = theirCard
          target.hand.cards[theirIdx] = myCard
          gameManager.recomputeHand(room, player)
          gameManager.recomputeHand(room, target)
          message = `Đã đổi 1 lá với ${target.name}`
          consume()
          break
        }
        case 'fate_swap': {
          if (!player.hand || player.hand.cards.length === 0 || room.deck.length === 0) {
            return cb({ success: false, message: 'Không thể tráo bài' })
          }
          const idx = opts.targetCardId
            ? player.hand.cards.findIndex((c) => c.id === opts.targetCardId)
            : Math.floor(Math.random() * player.hand.cards.length)
          const replaceIdx = idx >= 0 ? idx : 0
          const newCard = room.deck.pop()!
          room.deck.push(player.hand.cards[replaceIdx])
          player.hand.cards[replaceIdx] = newCard
          gameManager.recomputeHand(room, player)
          message = 'Đã tráo 1 lá bài của bạn!'
          consume()
          break
        }
        case 'cancel_effect':
        case 'negate':
        case 'rewind': {
          for (const p of room.players) p.magicLocked = false
          const mine = flags[playerId]
          if (mine) delete mine.blindUntil
          message = `"${def.name}" đã hóa giải các hiệu ứng phép đang chờ!`
          consume()
          break
        }
        default: {
          consume()
          break
        }
      }

      if (consumed) {
        finish(room, socket, def, message, revealedCards, { casterId: playerId, targetId: target?.id })
      }
      cb({ success: true, message, result: { revealedCards } })
    })

    socket.on('disconnect', () => {
      if (!playerId) return
      const { room } = gameManager.disconnect(playerId)
      if (room) {
        void pushRoom(room.id)
        if (room.phase === 'settled') {
          io.to(room.id).emit('game:roundEnded', { roomId: room.id, results: room.roundResults })
        }
      }
    })
  })
}

function suitGlyph(suit: string): string {
  return suit === 'hearts' ? '♥' : suit === 'diamonds' ? '♦' : suit === 'clubs' ? '♣' : '♠'
}
