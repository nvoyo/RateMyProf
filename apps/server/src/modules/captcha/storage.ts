import Redis from 'ioredis'
import { env } from '../../env.ts'

/**
 * Dedicated Redis client for cap.js storage.
 */
const capRedis = new Redis(env.redisUrl, {
  maxRetriesPerRequest: 3,
})

capRedis.on('error', (err) => {
  console.error('[cap-redis] Connection error:', err.message)
})

const CHALLENGE_PREFIX = 'cap:ch:'
const TOKEN_PREFIX = 'cap:tok:'

/**
 * Redis-backed storage adapter for @cap.js/server.
 */
export const capRedisStorage = {
  challenges: {
    store: async (token: string, challengeData: { challenge: { c: number; s: number; d: number }; expires: number }) => {
      const key = CHALLENGE_PREFIX + token
      await capRedis.set(key, JSON.stringify(challengeData))
      await capRedis.pexpireat(key, challengeData.expires)
    },

    read: async (token: string) => {
      const key = CHALLENGE_PREFIX + token
      const raw = await capRedis.get(key)
      if (!raw) return null
      try {
        return JSON.parse(raw) as { challenge: { c: number; s: number; d: number }; expires: number }
      } catch {
        return null
      }
    },

    delete: async (token: string) => {
      await capRedis.del(CHALLENGE_PREFIX + token)
    },

    deleteExpired: async () => {},
  },

  tokens: {
    store: async (tokenKey: string, expires: number) => {
      const key = TOKEN_PREFIX + tokenKey
      await capRedis.set(key, '1')
      await capRedis.pexpireat(key, expires)
    },

    get: async (tokenKey: string) => {
      const key = TOKEN_PREFIX + tokenKey
      const exists = await capRedis.exists(key)
      if (!exists) return null
      const ttl = await capRedis.pttl(key)
      if (ttl <= 0) return null
      return Date.now() + ttl
    },

    delete: async (tokenKey: string) => {
      await capRedis.del(TOKEN_PREFIX + tokenKey)
    },

    deleteExpired: async () => {},
  },
}
