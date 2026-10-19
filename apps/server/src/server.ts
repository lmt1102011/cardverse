import Fastify from 'fastify'
import cors from '@fastify/cors'
import { createServer, type Server as HttpServer } from 'http'
import { Server } from 'socket.io'
import { config } from './config/env.js'
import { GameManager } from './modules/games/game-manager.js'
import { setupSocketHandlers } from './websocket/handlers.js'

export interface App {
  io: Server
  gameManager: GameManager
  httpServer: HttpServer
  close: () => Promise<void>
}

export async function buildServer(port = config.port, host = config.host): Promise<App> {
  const fastify = Fastify({ logger: false })
  const gameManager = new GameManager()

  await fastify.register(cors, { origin: config.corsOrigin, credentials: true })

  fastify.get('/health', async () => ({ status: 'ok' }))

  fastify.get('/rooms', async (req: any) => {
    const mode = req.query.mode
    return gameManager.listRoomsPublic(mode)
  })

  const httpServer = createServer(fastify.server)
  const io = new Server(httpServer, {
    cors: { origin: config.corsOrigin, credentials: true },
    pingTimeout: 30000,
    pingInterval: 10000
  })

  setupSocketHandlers(io, gameManager)

  await new Promise<void>((resolve) => httpServer.listen({ port, host }, resolve))

  return {
    io,
    gameManager,
    httpServer,
    close: () =>
      new Promise<void>((resolve) => {
        io.close()
        httpServer.close(() => resolve())
      })
  }
}

export function serverAddress(app: App): string {
  const addr = app.httpServer.address()
  if (addr && typeof addr === 'object') return `http://127.0.0.1:${addr.port}`
  return `http://127.0.0.1:${config.port}`
}
