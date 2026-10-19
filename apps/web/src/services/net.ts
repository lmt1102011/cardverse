import { joinRoom, selfId } from 'trystero'
import {
  GameManager, DEFAULT_GAME_CONFIG,
  type ServerRoom, type PlayerSession
} from '@cardverse/shared'

const APP_ID = 'cardverse-v1'
const LOBBY_ID = 'cardverse-lobby-v1'
const GAME_PREFIX = 'cardverse-room-'
const ANNOUNCE_MS = 4000
const ANNOUNCE_TTL = 12000
const RPC_TIMEOUT = 8000

const AVATARS = ['🦊', '🐯', '🐸', '🐼', '🦁', '🐵', '🐨', '🐧', '🦄', '🐶', '🐱', '🦉']

type Handler = (...args: any[]) => void

type GameRoom = ReturnType<typeof joinRoom>

export interface RoomListItem {
  id: string; name: string; code: string; mode: string; isPrivate: boolean
  maxPlayers: number; playerCount: number; status: string
  minBet: number; maxBet: number; hostName: string
}

class Emitter {
  private map = new Map<string, Set<Handler>>()
  on(event: string, handler: Handler) {
    let set = this.map.get(event)
    if (!set) { set = new Set(); this.map.set(event, set) }
    set.add(handler)
  }
  off(event: string, handler?: Handler) {
    if (!handler) { this.map.delete(event); return }
    this.map.get(event)?.delete(handler)
  }
  emit(event: string, ...args: any[]) {
    const set = this.map.get(event)
    if (!set) return
    for (const h of Array.from(set)) {
      try { h(...args) } catch { /* ignore */ }
    }
  }
}

class P2PNet {
  connected = true
  private emitter = new Emitter()

  private session: PlayerSession | null = null
  private mode: 'idle' | 'host' | 'client' = 'idle'
  private gm: GameManager | null = null
  private gmRoomId: string | null = null
  private hostPeerId: string | null = null
  private joinPassword: string | undefined
  private joined = false
  private joining = false

  private gameRoom: GameRoom | null = null
  private ev: any = null
  private rpc: any = null
  private hello: any = null

  private lobbyRoom: GameRoom | null = null
  private lobbyAnn: any = null
  private announced = new Map<string, RoomListItem & { ts: number }>()

  private announceTimer: any = null
  private pruneTimer: any = null
  private joinTimer: any = null
  private pendingJoin: ((res: any) => void) | null = null
  private inited = false

  on(event: string, handler: Handler) { this.emitter.on(event, handler) }
  off(event: string, handler?: Handler) { this.emitter.off(event, handler) }
  private local(event: string, data?: any) { this.emitter.emit(event, data) }

  init() {
    if (this.inited) return
    this.inited = true
    this.joinLobby()
    this.pruneTimer = setInterval(() => this.prune(), 4000)
    this.connected = true
    setTimeout(() => this.local('connect'), 0)
  }

  disconnect() {
    this.cleanupGame()
    if (this.pruneTimer) clearInterval(this.pruneTimer)
    this.lobbyRoom?.leave().catch(() => {})
    this.inited = false
    this.connected = false
    this.local('disconnect')
  }

  emit(event: string, ...args: any[]) {
    const cb = typeof args[args.length - 1] === 'function' ? args.pop() : undefined
    switch (event) {
      case 'session:create': this.createSession(args[0], cb); break
      case 'room:list': cb?.(this.listRooms(args[0])); break
      case 'room:create': this.createRoom(args[0], cb); break
      case 'room:join': this.joinRoom(args[0], cb); break
      case 'room:leave': this.leaveRoom(cb); break
      case 'room:start': this.action('room:start', {}, cb); break
      case 'game:placeBet': this.action('game:placeBet', args[0], cb); break
      case 'game:confirmBet': this.action('game:confirmBet', args[0], cb); break
      case 'game:draw': this.action('game:draw', args[0], cb); break
      case 'game:stand': this.action('game:stand', args[0], cb); break
      case 'game:nextRound': this.action('game:nextRound', args[0], cb); break
      case 'magic:use': this.action('magic:use', args[0], cb); break
      default: break
    }
  }

  // ---- local session ----
  private createSession(name: string, cb?: Function) {
    this.session = {
      id: selfId,
      name: (name || '').trim().slice(0, 16) || 'Người chơi',
      avatar: AVATARS[Math.floor(Math.random() * AVATARS.length)],
      chips: 1000,
      roomId: null
    }
    cb?.(this.session)
  }

  // ---- lobby ----
  private joinLobby() {
    try {
      const room = joinRoom({ appId: APP_ID }, 'cardverse-lobby')
      this.lobbyRoom = room
      const ann = room.makeAction('ann')
      ann.onMessage = (data: any, ctx: any) => {
        if (!data || !data.code) return
        this.announced.set(ctx.peerId, { ...data, ts: Date.now() })
        this.local('rooms', this.listRooms())
      }
      this.lobbyAnn = ann
      room.onPeerJoin = () => { if (this.mode === 'host') this.announceRoom() }
      room.onPeerLeave = (peerId: string) => {
        this.announced.delete(peerId)
        this.local('rooms', this.listRooms())
      }
    } catch { /* lobby optional */ }
  }

  private prune() {
    let changed = false
    const now = Date.now()
    for (const [id, info] of this.announced) {
      if (now - info.ts > 12000) { this.announced.delete(id); changed = true }
    }
    if (changed) this.local('rooms', this.listRooms())
  }

  private listRooms(mode?: string): RoomListItem[] {
    const now = Date.now()
    return Array.from(this.announced.values())
      .filter((r) => now - r.ts <= 12000)
      .filter((r) => !mode || r.mode === mode)
      .map(({ ts, ...rest }) => rest)
  }

  private announceRoom() {
    if (this.mode !== 'host' || !this.gm || !this.gmRoomId || !this.lobbyAnn) return
    const room = this.gm.getRoom(this.gmRoomId)
    if (!room) return
    const info: RoomListItem = {
      id: room.id, name: room.name, code: room.code, mode: room.mode,
      isPrivate: room.isPrivate, maxPlayers: room.maxPlayers,
      playerCount: room.players.length, status: room.status,
      minBet: room.minBet, maxBet: room.maxBet,
      hostName: room.players.find((p) => p.isHost)?.name || 'Chủ phòng'
    }
    this.lobbyAnn.send(info).catch(() => {})
  }

  private startAnnounce() {
    this.stopAnnounce()
    this.announceRoom()
    this.announceTimer = setInterval(() => this.announceRoom(), 4000)
  }

  private stopAnnounce() {
    if (this.announceTimer) clearInterval(this.announceTimer)
    this.announceTimer = null
  }

  // ---- host ----
  private createRoom(opts: any, cb?: Function) {
    if (!this.session) return cb?.({ error: 'Chưa đăng nhập' })
    try {
      this.cleanupGame()
      this.mode = 'host'
      const gm = new GameManager()
      this.gm = gm
      gm.createSession(this.session.name, selfId)
      const room = gm.createRoom(selfId, {
        name: opts.name, mode: opts.mode, isPrivate: !!opts.isPrivate,
        password: opts.password, maxPlayers: opts.maxPlayers,
        minBet: opts.minBet, maxBet: opts.maxBet
      })
      this.gmRoomId = room.id
      const cfg: any = { appId: APP_ID }
      if (room.isPrivate && room.password) cfg.password = room.password
      const gameRoom = joinRoom(cfg, 'cardverse-' + room.code)
      this.gameRoom = gameRoom
      this.setupHost(gameRoom)
      this.pushState()
      this.startAnnounce()
      const pub = gm.getPublicRoom(room, selfId)
      cb?.({ room: pub })
    } catch (e: any) {
      cb?.({ error: e?.message || 'Không tạo được phòng' })
    }
  }

  private setupHost(room: GameRoom) {
    const ev = room.makeAction('ev')
    const hello = room.makeAction('hello')
    const rpc = room.makeAction('rpc', {
      kind: 'request',
      onRequest: (data: any, ctx: any) => this.hostHandle(ctx.peerId, data)
    } as any)
    this.ev = ev; this.hello = hello; this.rpc = rpc

    room.onPeerJoin = (peerId: string) => {
      hello.send({ hostId: selfId }, { target: peerId }).catch(() => {})
      const roomState = this.currentRoom()
      if (roomState) ev.send({ event: 'state', data: { room: roomState } } as any, { target: peerId }).catch(() => {})
    }
    room.onPeerLeave = (peerId: string) => {
      if (!this.gm) return
      const { room: r } = this.gm.disconnect(peerId)
      this.pushState()
      this.broadcastEvent('player:left', { playerId: peerId })
      if (r && r.phase === 'settled') this.broadcastEvent('game:roundEnded', { results: r.roundResults })
    }
  }

  private currentRoom() {
    if (!this.gm || !this.gmRoomId) return null
    const room = this.gm.getRoom(this.gmRoomId)
    if (!room) return null
    return room
  }

  private hostHandle(peerId: string, msg: any): any {
    const gm = this.gm
    const roomId = this.gmRoomId
    if (!gm || !roomId) return { error: 'Phòng không tồn tại' }
    const event = msg?.event
    const p = msg?.payload || {}

    switch (event) {
      case '__join': {
        let s = gm.getSession(peerId)
        if (!s) s = gm.createSession(p.name || 'Người chơi', peerId)
        const { room, error } = gm.joinRoom(peerId, roomId, p.password)
        if (error) return { error }
        this.pushState()
        this.broadcastEvent('player:joined', { playerName: s.name })
        return { room: gm.getPublicRoom(room, peerId) }
      }
      case '__leave': {
        gm.leaveRoom(peerId)
        this.pushState()
        this.broadcastEvent('player:left', { playerId: peerId })
        return { ok: true }
      }
      case 'room:start': {
        const { room, error } = gm.startRound(roomId)
        if (error) return { error }
        this.pushState()
        const dealer = room.players.find((x) => x.isDealer)
        if (dealer) this.broadcastEvent('notification', { type: 'info', message: `${dealer.name} là Nhà cái ván ${room.roundNumber}` })
        return { room: gm.getPublicRoom(room, peerId) }
      }
      case 'game:placeBet': {
        const { room, error } = gm.placeBet(roomId, peerId, p.amount)
        this.pushState()
        return { room: gm.getPublicRoom(room, peerId), error }
      }
      case 'game:confirmBet': {
        const { room, error } = gm.confirmBet(roomId, peerId)
        if (error) return { error }
        this.pushState()
        if (room.phase === 'playing') this.broadcastEvent('game:dealt', {})
        else if (room.phase === 'settled') this.broadcastEvent('game:roundEnded', { results: room.roundResults })
        return { room: gm.getPublicRoom(room, peerId) }
      }
      case 'game:draw': {
        const { room, error } = gm.drawCard(roomId, peerId)
        if (error) return { error }
        this.afterAction(room)
        return { room: gm.getPublicRoom(room, peerId) }
      }
      case 'game:stand': {
        const { room, error } = gm.stand(roomId, peerId)
        if (error) return { error }
        this.afterAction(room)
        return { room: gm.getPublicRoom(room, peerId) }
      }
      case 'game:nextRound': {
        const { room, error } = gm.nextRound(roomId)
        if (error) return { error }
        this.pushState()
        return { room: gm.getPublicRoom(room, peerId) }
      }
      case 'magic:use': {
        const out = gm.applyMagic(roomId, peerId, {
          magicCardId: p.magicCardId,
          targetPlayerId: p.targetPlayerId,
          targetCardId: p.targetCardId
        })
        if (out.success) {
          this.emitMagic(peerId, out)
          this.pushState()
        }
        return { success: out.success, message: out.message, result: { revealedCards: out.revealedCards } }
      }
      default:
        return { error: 'Hành động không hợp lệ' }
    }
  }

  private emitMagic(peerId: string, out: any) {
    const isPrivate = ['peek_card', 'reveal_all', 'reveal_total'].includes(out.effectType)
    if (isPrivate) {
      this.sendTo(peerId, 'magic:effect', {
        casterId: out.casterId, targetId: out.targetId, message: out.message, revealedCards: out.revealedCards
      })
    } else {
      this.broadcastEvent('magic:effect', { casterId: out.casterId, targetId: out.targetId, message: out.message })
    }
  }

  private afterAction(room: any) {
    this.pushState()
    if (room.phase === 'settled') this.broadcastEvent('game:roundEnded', { results: room.roundResults })
  }

  private broadcastEvent(event: string, data: any) {
    this.local(event, data)
    if (this.mode === 'host' && this.ev) this.ev.send({ event, data }).catch(() => {})
  }

  private sendTo(peerId: string, event: string, data: any) {
    if (peerId === selfId) { this.local(event, data); return }
    this.ev?.send({ event, data }, { target: peerId }).catch(() => {})
  }

  // ---- client ----
  private joinRoom(opts: any, cb?: Function) {
    if (!this.session) return cb?.({ error: 'Chưa đăng nhập' })
    this.cleanupGame()
    this.mode = 'client'
    this.joinPassword = opts.password
    this.pendingJoin = (cb as any) || null
    const code = String(opts.roomId || '').toUpperCase()
    const cfg: any = { appId: APP_ID }
    if (opts.password) cfg.password = opts.password
    try {
      const gameRoom = joinRoom(cfg, 'cardverse-' + code, {
        onJoinError: () => this.failJoin('Không kết nối được phòng (mật khẩu sai?)')
      } as any)
      this.gameRoom = gameRoom
      this.setupClient(gameRoom)
      this.joinTimer = setTimeout(() => this.failJoin('Không tìm thấy phòng'), 10000)
    } catch {
      this.failJoin('Không vào được phòng')
    }
  }

  private setupClient(room: GameRoom) {
    const ev = room.makeAction('ev')
    const hello = room.makeAction('hello')
    const rpc = room.makeAction('rpc', { kind: 'request' } as any)
    this.ev = ev; this.hello = hello; this.rpc = rpc

    ev.onMessage = (data: any) => {
      if (!data || !data.event) return
      if (data.event === 'state') {
        if (this.joined) this.local('room:update', data.data.room)
      } else {
        this.local(data.event, data.data)
      }
    }
    hello.onMessage = (data: any) => {
      if (!this.hostPeerId && data?.hostId) {
        this.hostPeerId = data.hostId
        this.sendJoin()
      }
    }
    room.onPeerLeave = (peerId: string) => {
      if (peerId === this.hostPeerId) {
        this.local('notification', { type: 'error', message: 'Chủ phòng đã rời — phòng đã đóng' })
        this.local('room:closed', {})
        this.cleanupGame()
        this.mode = 'idle'
      }
    }
  }

  private sendJoin() {
    if (this.joining) return
    this.joining = true
    this.rpcRequest('__join', {
      name: this.session?.name, avatar: this.session?.avatar, password: this.joinPassword
    }).then((res) => {
      if (this.joinTimer) { clearTimeout(this.joinTimer); this.joinTimer = null }
      if (!res || res.error) { this.failJoin(res?.error || 'Không vào được phòng'); return }
      this.joined = true
      const cb = this.pendingJoin; this.pendingJoin = null
      this.local('room:update', res.room)
      cb?.({ room: res.room })
    }).catch(() => this.failJoin('Không vào được phòng'))
  }

  private failJoin(msg: string) {
    if (this.joinTimer) { clearTimeout(this.joinTimer); this.joinTimer = null }
    const cb = this.pendingJoin; this.pendingJoin = null
    this.cleanupGame()
    this.mode = 'idle'
    cb?.({ error: msg })
  }

  private rpcRequest(event: string, payload: any): Promise<any> {
    if (!this.rpc || !this.hostPeerId) return Promise.reject(new Error('Chưa kết nối chủ phòng'))
    const req = this.rpc.request({ event, payload }, { target: this.hostPeerId })
    return Promise.race([
      req,
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), RPC_TIMEOUT))
    ])
  }

  private action(event: string, payload: any, cb?: Function) {
    if (this.mode === 'host') {
      const res = this.hostHandle(selfId, { event, payload })
      cb?.(res)
    } else if (this.mode === 'client') {
      this.rpcRequest(event, payload).then((res) => cb?.(res)).catch(() => cb?.({ error: 'Lỗi kết nối' }))
    } else {
      cb?.({ error: 'Bạn chưa ở trong phòng' })
    }
  }

  private pushState() {
    if (this.mode !== 'host' || !this.gm || !this.gmRoomId) return
    const room = this.gm.getRoom(this.gmRoomId)
    if (!room) return
    this.local('room:update', this.gm.getPublicRoom(room, selfId))
    const peers = this.gameRoom?.getPeers() || {}
    for (const peerId of Object.keys(peers)) {
      this.ev?.send({ event: 'state', data: { room: this.gm.getPublicRoom(room, peerId) } }, { target: peerId }).catch(() => {})
    }
  }

  private leaveRoom(cb?: Function) {
    if (this.mode === 'host') {
      this.ev?.send({ event: 'room:closed', data: {} }).catch(() => {})
      this.stopAnnounce()
      this.announced.delete(selfId)
      if (this.gm) this.gm.leaveRoom(selfId)
    } else if (this.mode === 'client') {
      this.rpcRequest('__leave', {}).catch(() => {})
    }
    this.cleanupGame()
    this.mode = 'idle'
    this.local('rooms', this.listRooms())
    cb?.({ ok: true })
  }

  private cleanupGame() {
    this.stopAnnounce()
    if (this.joinTimer) { clearTimeout(this.joinTimer); this.joinTimer = null }
    this.pendingJoin = null
    this.joining = false
    this.joined = false
    this.hostPeerId = null
    try { this.gameRoom?.leave() } catch { /* ignore */ }
    this.gameRoom = null
    this.ev = null
    this.rpc = null
    this.hello = null
    this.gm = null
    this.gmRoomId = null
  }
}

let net: P2PNet | null = null

export function getSocket(): P2PNet {
  if (!net) {
    net = new P2PNet()
    net.init()
  }
  return net
}

export function disconnectSocket() {
  net?.disconnect()
  net = null
}
