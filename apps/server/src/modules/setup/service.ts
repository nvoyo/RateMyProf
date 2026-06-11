import { randomUUID } from 'node:crypto'
import { eq, inArray } from 'drizzle-orm'
import { status } from 'elysia'
import { db } from '../../db/index.ts'
import { schools, users } from '../../db/schema.ts'
import { hashPassword, slugify } from '../../lib/utils.ts'
import type { SetupBody } from './model.ts'

export abstract class SetupService {
  /**
   * The system is considered initialized once at least one admin/owner exists.
   */
  static async isInitialized(): Promise<boolean> {
    const [admin] = await db
      .select({ id: users.id })
      .from(users)
      .where(inArray(users.role, ['admin', 'owner']))
      .limit(1)
    return Boolean(admin)
  }

  /**
   * Creates the first school + owner account.
   * The owner is a super-admin that other admins cannot modify.
   * Locked once any admin/owner already exists.
   */
  static async initialize(body: SetupBody) {
    if (await SetupService.isInitialized()) {
      return status(409, 'System has already been initialized')
    }

    const passwordHash = await hashPassword(body.password)

    const result = await db.transaction(async (tx) => {
      const baseSlug = slugify(body.schoolName) || 'school'
      const schoolId = randomUUID()
      await tx
        .insert(schools)
        .values({ id: schoolId, name: body.schoolName, slug: baseSlug })
      const [school] = await tx
        .select()
        .from(schools)
        .where(eq(schools.id, schoolId))
        .limit(1)

      const adminId = randomUUID()
      await tx.insert(users).values({
        id: adminId,
        email: body.email.toLowerCase(),
        passwordHash,
        displayName: body.displayName,
        role: 'owner',
        schoolId: school!.id,
      })
      const [admin] = await tx
        .select()
        .from(users)
        .where(eq(users.id, adminId))
        .limit(1)

      return { school: school!, admin: admin! }
    })

    return {
      school: { id: result.school.id, name: result.school.name },
      admin: { id: result.admin.id, email: result.admin.email },
    }
  }
}
