import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { io as ioClient, type Socket as ClientSocket } from 'socket.io-client'
import { buildServer, serverAddress, type App } from '../server.js'

let app: App
let url: string
const clients: ClientSocket[] = []

beforeAll(async () => {
  app = await buildServer(0, '127.0.0.1')
  url = serverAddress(app)
})

afterAll(async () => {
  for (const c of clients) c.close()
  await app.close()
})

async function connect(): Promise<ClientSocket> {
  const s = ioClient(url, { transports: ['websocket'], forceNew: true })
  clients.push(s)
  await new Promise<void>((resolve, reject) => {
    s.once('connect', () => resolve())
    s.once('connect_error', (e) => reject(e))
  })
  return s
}

function emit<T = any>(socket: ClientSocket, event: string, ...args: any[]): Promise<T> {
  return new Promise((resolve) => socket.emit(event, ...args, (res: T) => resolve(res)))
}

function nextUpdate(socket: ClientSocket): Promise<any> {
  return new Promise((resolve) => socket.once('room:update', resolve))
}

function magicQty(player: any): number {
  return (player?.magicCards ?? []).reduce((n: number, m: any) => n + m.quantity, 0)
}

describe('Socket flow (end-to-end)', () => {
  it('plays a full Xì Dách round and delivers reward Magic Cards', async () => {
    const a = await connect()
    const b = await connect()

    const sa = await emit(a, 'session:create', 'Alice')
    const sb = await emit(b, 'session:create', 'Bob')
    expect(sa.playerId).toBeTruthy()
    expect(sb.playerId).toBeTruthy()

    const sockets: Record<string, ClientSocket> = { [sa.playerId]: a, [sb.playerId]: b }

    const created = await emit(a, 'room:create', {
      name: 'Bàn test', mode: 'xidach', isPrivate: false, maxPlayers: 4, minBet: 10, maxBet: 100
    })
    expect(created.error).toBeUndefined()
    const roomId = created.room.id

    const joined = await emit(b, 'room:join', { roomId })
    expect(joined.error).toBeUndefined()
    expect(joined.room.players.length).toBe(2)

    const started = await emit(a, 'room:start', roomId)
    expect(started.error).toBeUndefined()
    const dealer = started.room.players.find((p: any) => p.isDealer)
    const nonDealer = started.room.players.find((p: any) => !p.isDealer)
    expect(dealer).toBeTruthy()
    expect(nonDealer).toBeTruthy()

    const nSocket = sockets[nonDealer.id]
    const dSocket = sockets[dealer.id]

    await emit(nSocket, 'game:placeBet', { roomId, amount: 10 })
    const confirmed = await emit(nSocket, 'game:confirmBet', { roomId })
    expect(confirmed.error).toBeUndefined()
    expect(confirmed.room.phase).toBe('playing')
    expect(confirmed.room.currentTurnPlayerId).toBe(nonDealer.id)

    await emit(nSocket, 'game:stand', { roomId })
    const waitN = nextUpdate(nSocket)
    const settled = await emit(dSocket, 'game:stand', { roomId })
    expect(settled.error).toBeUndefined()
    expect(settled.room.phase).toBe('settled')
    expect(settled.room.roundResults.length).toBe(1)

    const update = await waitN
    const me = update.players.find((p: any) => p.id === nonDealer.id)
    expect(magicQty(me)).toBeGreaterThanOrEqual(4)
  })

  it('rejects joining a private room with the wrong password', async () => {
    const a = await connect()
    const b = await connect()

    const sa = await emit(a, 'session:create', 'Host')
    await emit(b, 'session:create', 'Guest')

    const created = await emit(a, 'room:create', {
      name: 'Phòng kín', mode: 'baicao', isPrivate: true, password: 'secret', maxPlayers: 4, minBet: 10, maxBet: 100
    })
    expect(created.error).toBeUndefined()

    const bad = await emit(b, 'room:join', { roomId: created.room.id, password: 'wrong' })
    expect(bad.error).toBeTruthy()

    const ok = await emit(b, 'room:join', { roomId: created.room.id, password: 'secret' })
    expect(ok.error).toBeUndefined()
    void sa
  })
})
