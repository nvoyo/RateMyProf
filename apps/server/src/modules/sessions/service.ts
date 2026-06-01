import { eq } from 'drizzle-orm'
import { status } from 'elysia'
import { db } from '../../db/index.ts'
import { users } from '../../db/schema.ts'
import { verifyPassword } from '../../lib/utils.ts'
import type { LoginBody } from './model.ts'

export abstract class SessionService {
  /**
   * Validates credentials and returns the matching active user.
   * Returns a 401 status on any failure (kept generic to avoid leaking
   * which part of the credentials was wrong).
   */
  static async authenticate(body: LoginBody) {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, body.email.toLowerCase()))
      .limit(1)

    if (!user) return status(401, 'Invalid email or password')
    if (user.status === 'disabled') {
      return status(403, 'This account has been disabled')
    }

    const ok = await verifyPassword(body.password, user.passwordHash)
    if (!ok) return status(401, 'Invalid email or password')

    return user
  }
}
