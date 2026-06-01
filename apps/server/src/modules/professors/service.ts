import { and, avg, count, eq, ilike, or, sql } from 'drizzle-orm'
import { status } from 'elysia'
import { db } from '../../db/index.ts'
import { professors, reviews, schools } from '../../db/schema.ts'
import type {
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

export abstract class ProfessorService {
  static async list(query: ListProfessorsQuery) {
    const conditions = []
    if (query.schoolId) conditions.push(eq(professors.schoolId, query.schoolId))
    if (query.department)
      conditions.push(ilike(professors.department, `%${query.department}%`))
    if (query.q) {
      conditions.push(
        or(
          ilike(professors.firstName, `%${query.q}%`),
          ilike(professors.lastName, `%${query.q}%`),
          ilike(
            sql`${professors.firstName} || ' ' || ${professors.lastName}`,
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

    const [created] = await db
      .insert(professors)
      .values({
        schoolId: body.schoolId,
        firstName: body.firstName,
        lastName: body.lastName,
        department: body.department,
        title: body.title ?? null,
      })
      .returning()

    return created!
  }

  static async update(id: string, body: UpdateProfessorBody) {
    const [existing] = await db
      .select({ id: professors.id })
      .from(professors)
      .where(eq(professors.id, id))
      .limit(1)
    if (!existing) return status(404, 'Professor not found')

    const [updated] = await db
      .update(professors)
      .set({
        ...(body.firstName ? { firstName: body.firstName } : {}),
        ...(body.lastName ? { lastName: body.lastName } : {}),
        ...(body.department ? { department: body.department } : {}),
        ...(body.title !== undefined ? { title: body.title } : {}),
      })
      .where(eq(professors.id, id))
      .returning()

    return updated!
  }

  static async remove(id: string) {
    const [deleted] = await db
      .delete(professors)
      .where(eq(professors.id, id))
      .returning({ id: professors.id })
    if (!deleted) return status(404, 'Professor not found')
    return { success: true }
  }
}
