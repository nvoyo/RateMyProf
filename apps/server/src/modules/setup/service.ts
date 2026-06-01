import { eq } from 'drizzle-orm'
import { status } from 'elysia'
import { db } from '../../db/index.ts'
import { schools, users } from '../../db/schema.ts'
import { hashPassword, slugify } from '../../lib/utils.ts'
import type { SetupBody } from './model.ts'

export abstract class SetupService {
  /**
   * The system is considered initialized once at least one admin exists.
   */
  static async isInitialized(): Promise<boolean> {
    const [admin] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.role, 'admin'))
      .limit(1)
    return Boolean(admin)
  }

  /**
   * Creates the first school + admin account.
   * Locked once any admin already exists.
   */
  static async initialize(body: SetupBody) {
    if (await SetupService.isInitialized()) {
      return status(409, 'System has already been initialized')
    }

    const passwordHash = await hashPassword(body.password)

    const result = await db.transaction(async (tx) => {
      const baseSlug = slugify(body.schoolName) || 'school'
      const [school] = await tx
        .insert(schools)
        .values({ name: body.schoolName, slug: baseSlug })
        .returning()

      const [admin] = await tx
        .insert(users)
        .values({
          email: body.email.toLowerCase(),
          passwordHash,
          displayName: body.displayName,
          role: 'admin',
          schoolId: school!.id,
        })
        .returning()

      return { school: school!, admin: admin! }
    })

    return {
      school: { id: result.school.id, name: result.school.name },
      admin: { id: result.admin.id, email: result.admin.email },
    }
  }
}
