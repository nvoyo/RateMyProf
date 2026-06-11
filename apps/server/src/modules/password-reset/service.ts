import { and, eq, gt } from 'drizzle-orm'
import { status } from 'elysia'
import { db } from '../../db/index.ts'
import { users } from '../../db/schema.ts'
import { hashPassword, randomToken } from '../../lib/utils.ts'
import { mail } from '../mail/index.ts'
import { cap } from '../captcha/cap.ts'
import type { RequestResetBody, ConfirmResetBody } from './model.ts'

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000 // 1 hour

export abstract class PasswordResetService {
  /**
   * Requests a password reset. Validates the CAPTCHA token first, then
   * always returns a success message regardless of whether the email
   * exists — prevents email enumeration.
   */
  static async request(body: RequestResetBody, capToken: string) {
    // Validate CAPTCHA token.
    const { success } = await cap.validateToken(capToken)
    if (!success) {
      return status(400, 'CAPTCHA verification failed. Please try again.')
    }

    const email = body.email.toLowerCase()

    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(
        and(eq(users.email, email), eq(users.status, 'active')),
      )
      .limit(1)

    if (user) {
      const token = randomToken()
      const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS)

      await db
        .update(users)
        .set({ resetToken: token, resetTokenExpiry: expiresAt })
        .where(eq(users.id, user.id))

      // Fire-and-forget email. If it fails, the token is still stored;
      // the user can just request again. We log the link for dev.
      mail.sendPasswordReset({ to: email, token }).catch((err) => {
        console.error('[password-reset] Email send failed:', err)
      })
    }

    // Always return the same message — never reveal whether the email exists.
    return {
      message:
        'If an account with that email exists, a reset link has been sent.',
    }
  }

  /**
   * Confirms a password reset using the token from the email.
   */
  static async confirm(body: ConfirmResetBody) {
    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          eq(users.resetToken, body.token),
          gt(users.resetTokenExpiry, new Date()),
        ),
      )
      .limit(1)

    if (!user) {
      return status(400, 'Invalid or expired reset token')
    }

    const passwordHash = await hashPassword(body.password)

    await db
      .update(users)
      .set({
        passwordHash,
        resetToken: null,
        resetTokenExpiry: null,
      })
      .where(eq(users.id, user.id))

    return { message: 'Password has been reset. You can now log in.' }
  }

  /**
   * Admin: force-change a user's password.
   * The owner's password can only be changed by the owner themselves.
   */
  static async adminChangePassword(
    userId: string,
    password: string,
    actingUserId: string,
  ) {
    const [existing] = await db
      .select({ id: users.id, role: users.role })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)
    if (!existing) return status(404, 'User not found')

    if (existing.role === 'owner' && existing.id !== actingUserId) {
      return status(403, "The owner account's password cannot be changed by other admins")
    }

    const passwordHash = await hashPassword(password)
    await db
      .update(users)
      .set({
        passwordHash,
        // Also clear any pending reset token.
        resetToken: null,
        resetTokenExpiry: null,
      })
      .where(eq(users.id, userId))

    return { message: 'Password updated successfully.' }
  }
}
