import Redis from 'ioredis'
import { env } from '../env.ts'

/**
 * Shared Redis client singleton. Created once, reused across modules.
 * Closes cleanly on process exit.
 */
export const redis = new Redis(env.redisUrl, {
  maxRetriesPerRequest: 3,
})

redis.on('error', (err) => {
  console.error('[redis] Connection error:', err.message)
})

redis.on('connect', () => {
  console.log('[redis] Connected to', env.redisUrl)
})

process.on('SIGTERM', () => redis.disconnect())
process.on('SIGINT', () => redis.disconnect())
