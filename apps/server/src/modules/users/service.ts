import { and, desc, eq, gt } from 'drizzle-orm'
import { status } from 'elysia'
import { db } from '../../db/index.ts'
import { invites, users } from '../../db/schema.ts'
import { hashPassword } from '../../lib/utils.ts'
import type { RegisterBody, UpdateUserBody } from './model.ts'

export abstract class UserService {
  /**
   * Registers a new student account by consuming a valid invite token.
   * The account is bound to the school recorded on the invite.
   */
  static async register(body: RegisterBody) {
    const [invite] = await db
      .select()
      .from(invites)
      .where(
        and(
          eq(invites.token, body.token),
          eq(invites.status, 'pending'),
          gt(invites.expiresAt, new Date()),
        ),
      )
      .limit(1)

    if (!invite) {
      return status(400, 'Invite is invalid, expired, or already used')
    }

    const email = invite.email.toLowerCase()

    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1)

    if (existing) {
      return status(409, 'An account with this email already exists')
    }

    const passwordHash = await hashPassword(body.password)

    const user = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(users)
        .values({
          email,
          passwordHash,
          displayName: body.displayName,
          role: 'student',
          schoolId: invite.schoolId,
        })
        .returning()

      await tx
        .update(invites)
        .set({ status: 'accepted' })
        .where(eq(invites.id, invite.id))

      return created!
    })

    return UserService.toPublic(user)
  }

  static async list() {
    const rows = await db.select().from(users).orderBy(desc(users.createdAt))
    return rows.map(UserService.toPublic)
  }

  static async update(id: string, body: UpdateUserBody, actingUserId: string) {
    const [target] = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1)

    if (!target) return status(404, 'User not found')

    // Guard: an admin cannot disable or demote themselves and lock the system.
    if (id === actingUserId) {
      if (body.status === 'disabled' || body.role === 'student') {
        return status(400, 'You cannot disable or demote your own admin account')
      }
    }

    const [updated] = await db
      .update(users)
      .set({
        ...(body.status ? { status: body.status } : {}),
        ...(body.role ? { role: body.role } : {}),
      })
      .where(eq(users.id, id))
      .returning()

    return UserService.toPublic(updated!)
  }

  static toPublic(user: typeof users.$inferSelect) {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      status: user.status,
      schoolId: user.schoolId,
      createdAt: user.createdAt,
    }
  }
}
