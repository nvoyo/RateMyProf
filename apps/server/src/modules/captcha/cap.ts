import Cap from '@cap.js/server'
import { capRedisStorage } from './storage.ts'

/**
 * Cap.js instance backed by Redis storage.
 * Creates SHA-256 proof-of-work challenges that the frontend widget solves.
 */
export const cap = new Cap({
  noFSState: true,
  storage: capRedisStorage,
})
