import 'dotenv/config'

const corsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

export const config = {
  port: Number(process.env.PORT) || 3001,
  host: process.env.HOST || '0.0.0.0',
  corsOrigin: (corsOrigins.length === 1 ? corsOrigins[0] : corsOrigins) as string | string[],
  databaseUrl: process.env.DATABASE_URL || '',
  redisUrl: process.env.REDIS_URL || '',
  jwtSecret: process.env.JWT_SECRET || 'dev',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  initialChips: Number(process.env.INITIAL_CHIPS) || 1000,
  maxPlayers: Number(process.env.MAX_PLAYERS) || 8,
  minPlayers: Number(process.env.MIN_PLAYERS) || 2,
  betTimeoutMs: Number(process.env.BET_TIMEOUT_MS) || 30000,
  actionTimeoutMs: Number(process.env.ACTION_TIMEOUT_MS) || 20000,
  magicCardsPerRound: Number(process.env.MAGIC_CARDS_PER_ROUND) || 2,
  magicCardsInitial: Number(process.env.MAGIC_CARDS_INITIAL) || 2,
  magicMaxActivePerRound: Number(process.env.MAGIC_MAX_ACTIVE_PER_ROUND) || 1
}
