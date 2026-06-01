import { and, desc, eq, gt } from 'drizzle-orm'
import { status } from 'elysia'
import { db } from '../../db/index.ts'
import { invites, schools, users } from '../../db/schema.ts'
import { randomToken } from '../../lib/utils.ts'
import { mail } from '../mail/index.ts'
import type { CreateInviteBody } from './model.ts'

const INVITE_TTL_DAYS = 14

export abstract class InviteService {
  static async create(body: CreateInviteBody, invitedBy: string) {
    const email = body.email.toLowerCase()

    const [school] = await db
      .select({ id: schools.id, name: schools.name })
      .from(schools)
      .where(eq(schools.id, body.schoolId))
      .limit(1)
    if (!school) return status(400, 'School not found')

    // Block inviting an email that already has an account.
    const [existingUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1)
    if (existingUser) {
      return status(409, 'An account with this email already exists')
    }

    // Revoke any prior pending invite for this email so only one is active.
    await db
      .update(invites)
      .set({ status: 'revoked' })
      .where(and(eq(invites.email, email), eq(invites.status, 'pending')))

    const token = randomToken()
    const expiresAt = new Date(
      Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000,
    )

    const [created] = await db
      .insert(invites)
      .values({
        email,
        schoolId: body.schoolId,
        token,
        invitedBy,
        expiresAt,
      })
      .returning()

    const delivery = await mail.sendInvite({
      to: email,
      schoolName: school.name,
      token,
    })

    return status(201, {
      id: created!.id,
      email: created!.email,
      schoolId: created!.schoolId,
      status: created!.status,
      expiresAt: created!.expiresAt,
      emailDelivered: delivery.delivered,
    })
  }

  static list() {
    return db
      .select({
        id: invites.id,
        email: invites.email,
        schoolId: invites.schoolId,
        schoolName: schools.name,
        status: invites.status,
        expiresAt: invites.expiresAt,
        createdAt: invites.createdAt,
      })
      .from(invites)
      .leftJoin(schools, eq(schools.id, invites.schoolId))
      .orderBy(desc(invites.createdAt))
  }

  static async revoke(id: string) {
    const [updated] = await db
      .update(invites)
      .set({ status: 'revoked' })
      .where(eq(invites.id, id))
      .returning({ id: invites.id })
    if (!updated) return status(404, 'Invite not found')
    return { success: true }
  }

  /**
   * Public: verify an invite token for the registration page.
   * Reveals only the invited email + school, never the token list.
   */
  static async verify(token: string) {
    const [invite] = await db
      .select({
        email: invites.email,
        schoolId: invites.schoolId,
        schoolName: schools.name,
        status: invites.status,
        expiresAt: invites.expiresAt,
      })
      .from(invites)
      .leftJoin(schools, eq(schools.id, invites.schoolId))
      .where(
        and(
          eq(invites.token, token),
          eq(invites.status, 'pending'),
          gt(invites.expiresAt, new Date()),
        ),
      )
      .limit(1)

    if (!invite) return status(404, 'Invite is invalid, expired, or already used')

    return {
      email: invite.email,
      schoolId: invite.schoolId,
      schoolName: invite.schoolName ?? '',
      valid: true,
    }
  }
}
