import { and, avg, count, eq, inArray, like, or, sql } from 'drizzle-orm'
import { randomUUID } from 'node:crypto'
import { status } from 'elysia'
import { db } from '../../db/index.ts'
import { professors, reviews, schools } from '../../db/schema.ts'
import type {
  BulkCreateProfessorsBody,
  CreateProfessorBody,
  ListProfessorsQuery,
  UpdateProfessorBody,
} from './model.ts'

/**
 * Aggregate rating columns computed from approved, not-deleted reviews only.
 */
const aggregateColumns = {
  avgQuality: avg(
    sql`case when ${reviews.status} = 'approved' and ${reviews.deletionRequested} = false then ${reviews.qualityRating} end`,
  ).as('avg_quality'),
  avgDifficulty: avg(
    sql`case when ${reviews.status} = 'approved' and ${reviews.deletionRequested} = false then ${reviews.difficultyRating} end`,
  ).as('avg_difficulty'),
  reviewCount: count(
    sql`case when ${reviews.status} = 'approved' and ${reviews.deletionRequested} = false then ${reviews.id} end`,
  ).as('review_count'),
  wouldTakeAgainCount: count(
    sql`case when ${reviews.status} = 'approved' and ${reviews.deletionRequested} = false and ${reviews.wouldTakeAgain} then ${reviews.id} end`,
  ).as('would_take_again_count'),
}

function shapeProfessor(row: {
  id: string
  schoolId: string
  firstName: string
  lastName: string
  department: string
  title: string | null
  createdAt: Date
  avgQuality: string | null
  avgDifficulty: string | null
  reviewCount: number
  wouldTakeAgainCount: number
}) {
  const reviewCount = Number(row.reviewCount)
  const wouldTakeAgainCount = Number(row.wouldTakeAgainCount)
  return {
    id: row.id,
    schoolId: row.schoolId,
    firstName: row.firstName,
    lastName: row.lastName,
    department: row.department,
    title: row.title,
    createdAt: row.createdAt,
    avgQuality: row.avgQuality ? Number(Number(row.avgQuality).toFixed(2)) : null,
    avgDifficulty: row.avgDifficulty
      ? Number(Number(row.avgDifficulty).toFixed(2))
      : null,
    reviewCount,
    wouldTakeAgainPercent:
      reviewCount > 0 ? Math.round((wouldTakeAgainCount / reviewCount) * 100) : null,
  }
}

type ParsedProfessor = {
  firstName: string
  lastName: string
  department: string
  title: string | null
}

type SkippedRow = {
  line: number
  raw: string
  reason: string
}

/**
 * Parses raw roster text into professor rows. One professor per line; fields
 * separated by comma or tab in the order: firstName, lastName, department, title.
 * Blank lines and lines starting with `#` are ignored. A line missing the
 * department falls back to `defaultDepartment` (if provided).
 */
function parseRosterText(
  text: string,
  defaultDepartment: string | null,
): { rows: ParsedProfessor[]; skipped: SkippedRow[] } {
  const rows: ParsedProfessor[] = []
  const skipped: SkippedRow[] = []

  const lines = text.split(/\r?\n/)
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]!
    const trimmed = raw.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const parts = trimmed.split(/[,\t]/).map((p) => p.trim())
    const [firstName, lastName, departmentRaw, titleRaw] = parts
    const department = departmentRaw || defaultDepartment

    if (!firstName || !lastName) {
      skipped.push({
        line: i + 1,
        raw: trimmed,
        reason: 'Expected at least "firstName, lastName"',
      })
      continue
    }
    if (!department) {
      skipped.push({
        line: i + 1,
        raw: trimmed,
        reason: 'Missing department and no defaultDepartment provided',
      })
      continue
    }

    rows.push({
      firstName: firstName.slice(0, 80),
      lastName: lastName.slice(0, 80),
      department: department.slice(0, 120),
      title: titleRaw ? titleRaw.slice(0, 120) : null,
    })
  }

  return { rows, skipped }
}

export abstract class ProfessorService {
  static async list(query: ListProfessorsQuery) {
    const conditions = []
    if (query.schoolId) conditions.push(eq(professors.schoolId, query.schoolId))
    if (query.department)
      conditions.push(like(professors.department, `%${query.department}%`))
    if (query.q) {
      conditions.push(
        or(
          like(professors.firstName, `%${query.q}%`),
          like(professors.lastName, `%${query.q}%`),
          like(
            sql`concat(${professors.firstName}, ' ', ${professors.lastName})`,
            `%${query.q}%`,
          ),
        ),
      )
    }

    const rows = await db
      .select({
        id: professors.id,
        schoolId: professors.schoolId,
        firstName: professors.firstName,
        lastName: professors.lastName,
        department: professors.department,
        title: professors.title,
        createdAt: professors.createdAt,
        ...aggregateColumns,
      })
      .from(professors)
      .leftJoin(reviews, eq(reviews.professorId, professors.id))
      .where(conditions.length ? and(...conditions) : undefined)
      .groupBy(professors.id)
      .orderBy(professors.lastName)

    return rows.map(shapeProfessor)
  }

  static async get(id: string) {
    const [row] = await db
      .select({
        id: professors.id,
        schoolId: professors.schoolId,
        firstName: professors.firstName,
        lastName: professors.lastName,
        department: professors.department,
        title: professors.title,
        createdAt: professors.createdAt,
        ...aggregateColumns,
      })
      .from(professors)
      .leftJoin(reviews, eq(reviews.professorId, professors.id))
      .where(eq(professors.id, id))
      .groupBy(professors.id)
      .limit(1)

    if (!row) return status(404, 'Professor not found')

    const [school] = await db
      .select({ id: schools.id, name: schools.name })
      .from(schools)
      .where(eq(schools.id, row.schoolId))
      .limit(1)

    return { ...shapeProfessor(row), school: school ?? null }
  }

  static async create(body: CreateProfessorBody) {
    const [school] = await db
      .select({ id: schools.id })
      .from(schools)
      .where(eq(schools.id, body.schoolId))
      .limit(1)
    if (!school) return status(400, 'School not found')

    // Reject a professor that already exists for this school (same first +
    // last name, case-insensitive) — mirrors the bulk-import dedupe rule.
    const [duplicate] = await db
      .select({ id: professors.id })
      .from(professors)
      .where(
        and(
          eq(professors.schoolId, body.schoolId),
          sql`lower(${professors.firstName}) = ${body.firstName.trim().toLowerCase()}`,
          sql`lower(${professors.lastName}) = ${body.lastName.trim().toLowerCase()}`,
        ),
      )
      .limit(1)
    if (duplicate) {
      return status(409, 'A professor with this name already exists for this school')
    }

    const id = randomUUID()
    await db.insert(professors).values({
      id,
      schoolId: body.schoolId,
      firstName: body.firstName,
      lastName: body.lastName,
      department: body.department,
      title: body.title ?? null,
    })

    const [created] = await db
      .select()
      .from(professors)
      .where(eq(professors.id, id))
      .limit(1)

    return created!
  }

  static async update(id: string, body: UpdateProfessorBody) {
    const [existing] = await db
      .select({ id: professors.id })
      .from(professors)
      .where(eq(professors.id, id))
      .limit(1)
    if (!existing) return status(404, 'Professor not found')

    await db
      .update(professors)
      .set({
        ...(body.firstName ? { firstName: body.firstName } : {}),
        ...(body.lastName ? { lastName: body.lastName } : {}),
        ...(body.department ? { department: body.department } : {}),
        ...(body.title !== undefined ? { title: body.title } : {}),
      })
      .where(eq(professors.id, id))

    const [updated] = await db
      .select()
      .from(professors)
      .where(eq(professors.id, id))
      .limit(1)

    return updated!
  }

  static async remove(id: string) {
    const [existing] = await db
      .select({ id: professors.id })
      .from(professors)
      .where(eq(professors.id, id))
      .limit(1)
    if (!existing) return status(404, 'Professor not found')

    await db.delete(professors).where(eq(professors.id, id))
    return { success: true }
  }

  /**
   * Bulk-import professors for a school from a structured array and/or raw
   * roster text. Within-batch and against-existing duplicates (same first +
   * last name in the same school, case-insensitive) are skipped rather than
   * erroring the whole request, so the import is idempotent and re-runnable.
   */
  static async bulkCreate(body: BulkCreateProfessorsBody) {
    const [school] = await db
      .select({ id: schools.id })
      .from(schools)
      .where(eq(schools.id, body.schoolId))
      .limit(1)
    if (!school) return status(400, 'School not found')

    const defaultDepartment = body.defaultDepartment?.trim() || null
    const skipped: SkippedRow[] = []

    // Collect candidates from the structured array first...
    const candidates: ParsedProfessor[] = (body.professors ?? []).map((p) => ({
      firstName: p.firstName.trim(),
      lastName: p.lastName.trim(),
      department: p.department.trim(),
      title: p.title?.trim() || null,
    }))

    // ...then from the raw text block.
    if (body.text) {
      const parsed = parseRosterText(body.text, defaultDepartment)
      candidates.push(...parsed.rows)
      skipped.push(...parsed.skipped)
    }

    if (candidates.length === 0) {
      return status(
        400,
        'No professors to import. Provide "professors" and/or "text".',
      )
    }

    // De-duplicate within the batch (case-insensitive first+last name).
    const dedupeKey = (firstName: string, lastName: string) =>
      `${firstName.toLowerCase()}\u0000${lastName.toLowerCase()}`

    const seen = new Set<string>()
    const unique: ParsedProfessor[] = []
    for (const row of candidates) {
      const key = dedupeKey(row.firstName, row.lastName)
      if (seen.has(key)) {
        skipped.push({
          line: 0,
          raw: `${row.firstName} ${row.lastName}`,
          reason: 'Duplicate within import batch',
        })
        continue
      }
      seen.add(key)
      unique.push(row)
    }

    // Skip professors that already exist for this school.
    const existingRows = await db
      .select({
        firstName: professors.firstName,
        lastName: professors.lastName,
      })
      .from(professors)
      .where(eq(professors.schoolId, body.schoolId))

    const existingKeys = new Set(
      existingRows.map((r) => dedupeKey(r.firstName, r.lastName)),
    )

    const toInsert: (ParsedProfessor & { id: string })[] = []
    for (const row of unique) {
      if (existingKeys.has(dedupeKey(row.firstName, row.lastName))) {
        skipped.push({
          line: 0,
          raw: `${row.firstName} ${row.lastName}`,
          reason: 'Already exists for this school',
        })
        continue
      }
      toInsert.push({ id: randomUUID(), ...row })
    }

    if (toInsert.length > 0) {
      await db.transaction(async (tx) => {
        // Chunk inserts to keep statements well under MySQL packet limits.
        const CHUNK = 500
        for (let i = 0; i < toInsert.length; i += CHUNK) {
          const chunk = toInsert.slice(i, i + CHUNK)
          await tx.insert(professors).values(
            chunk.map((row) => ({
              id: row.id,
              schoolId: body.schoolId,
              firstName: row.firstName,
              lastName: row.lastName,
              department: row.department,
              title: row.title,
            })),
          )
        }
      })
    }

    const insertedIds = toInsert.map((r) => r.id)
    const created = insertedIds.length
      ? await db
          .select({
            id: professors.id,
            firstName: professors.firstName,
            lastName: professors.lastName,
            department: professors.department,
            title: professors.title,
          })
          .from(professors)
          .where(inArray(professors.id, insertedIds))
      : []

    return {
      imported: created.length,
      skipped: skipped.length,
      total: candidates.length,
      professors: created,
      skippedRows: skipped,
    }
  }
}
