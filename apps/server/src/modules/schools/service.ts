import { asc, eq } from 'drizzle-orm'
import { status } from 'elysia'
import { db } from '../../db/index.ts'
import { schools } from '../../db/schema.ts'
import { slugify } from '../../lib/utils.ts'
import type { CreateSchoolBody } from './model.ts'

export abstract class SchoolService {
  static list() {
    return db.select().from(schools).orderBy(asc(schools.name))
  }

  static async get(id: string) {
    const [school] = await db
      .select()
      .from(schools)
      .where(eq(schools.id, id))
      .limit(1)
    if (!school) return status(404, 'School not found')
    return school
  }

  static async create(body: CreateSchoolBody) {
    const base = slugify(body.name) || 'school'

    // Ensure slug uniqueness by appending a counter when needed.
    let slug = base
    let counter = 1
    while (true) {
      const [existing] = await db
        .select({ id: schools.id })
        .from(schools)
        .where(eq(schools.slug, slug))
        .limit(1)
      if (!existing) break
      counter += 1
      slug = `${base}-${counter}`
    }

    const [created] = await db
      .insert(schools)
      .values({ name: body.name, slug, domain: body.domain ?? null })
      .returning()

    return created!
  }
}
