import { randomBytes } from 'node:crypto'

/**
 * Generates a URL-safe slug from an arbitrary string.
 */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)
}

/**
 * Generates a cryptographically-random URL-safe token.
 */
export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url')
}

/**
 * Hashes a password using Bun's built-in argon2id.
 */
export function hashPassword(password: string): Promise<string> {
  return Bun.password.hash(password)
}

/**
 * Verifies a password against a stored hash.
 */
export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return Bun.password.verify(password, hash)
}
