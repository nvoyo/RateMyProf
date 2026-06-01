import { and, desc, eq, inArray, sql } from 'drizzle-orm'
import { randomUUID } from 'node:crypto'
import { status } from 'elysia'
import { db } from '../../db/index.ts'
import {
  professors,
  reviewTags,
  reviews,
  users,
  votes,
} from '../../db/schema.ts'
import type {
  CreateReviewBody,
  ListReviewsQuery,
  ModerateReviewBody,
  ResolveDeletionBody,
  UpdateReviewBody,
  VoteBody,
} from './model.ts'

async function replaceTags(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  reviewId: string,
  rawTags: string[] | undefined,
) {
  if (rawTags === undefined) return
  await tx.delete(reviewTags).where(eq(reviewTags.reviewId, reviewId))
  const tags = rawTags.map((t) => t.trim().toLowerCase()).filter(Boolean)
  const uniqueTags = [...new Set(tags)]
  if (uniqueTags.length) {
    await tx
      .insert(reviewTags)
      .values(uniqueTags.map((tag) => ({ id: randomUUID(), reviewId, tag })))
  }
}

export abstract class ReviewService {
  /**
   * Submits a review. Always created with status 'pending' so it must be
   * approved by an admin before becoming publicly visible.
   * A user can only review a given professor once.
   */
  static async create(
    professorId: string,
    body: CreateReviewBody,
    authorId: string,
  ) {
    const [prof] = await db
      .select({ id: professors.id })
      .from(professors)
      .where(eq(professors.id, professorId))
      .limit(1)
    if (!prof) return status(404, 'Professor not found')

    const [existing] = await db
      .select({ id: reviews.id })
      .from(reviews)
      .where(
        and(
          eq(reviews.professorId, professorId),
          eq(reviews.authorId, authorId),
        ),
      )
      .limit(1)
    if (existing) {
      return status(
        409,
        'You have already reviewed this professor. Edit your existing review instead.',
      )
    }

    const review = await db.transaction(async (tx) => {
      const reviewId = randomUUID()
      await tx.insert(reviews).values({
        id: reviewId,
        professorId,
        authorId,
        courseCode: body.courseCode ?? null,
        qualityRating: body.qualityRating,
        difficultyRating: body.difficultyRating,
        wouldTakeAgain: body.wouldTakeAgain,
        grade: body.grade ?? null,
        comment: body.comment,
        status: 'pending',
      })

      await replaceTags(tx, reviewId, body.tags)

      const [created] = await tx
        .select()
        .from(reviews)
        .where(eq(reviews.id, reviewId))
        .limit(1)
      return created!
    })

    return status(201, {
      id: review.id,
      status: review.status,
      message: 'Review submitted and is pending moderation.',
    })
  }

  /**
   * Edits the author's own review. Any edit sends the review back to
   * 'pending' so it must be re-approved before it is publicly visible again.
   */
  static async update(
    reviewId: string,
    body: UpdateReviewBody,
    authorId: string,
  ) {
    const [existing] = await db
      .select()
      .from(reviews)
      .where(eq(reviews.id, reviewId))
      .limit(1)
    if (!existing) return status(404, 'Review not found')
    if (existing.authorId !== authorId) {
      return status(403, 'You can only edit your own review')
    }

    const updated = await db.transaction(async (tx) => {
      await tx
        .update(reviews)
        .set({
          ...(body.courseCode !== undefined
            ? { courseCode: body.courseCode }
            : {}),
          ...(body.qualityRating !== undefined
            ? { qualityRating: body.qualityRating }
            : {}),
          ...(body.difficultyRating !== undefined
            ? { difficultyRating: body.difficultyRating }
            : {}),
          ...(body.wouldTakeAgain !== undefined
            ? { wouldTakeAgain: body.wouldTakeAgain }
            : {}),
          ...(body.grade !== undefined ? { grade: body.grade } : {}),
          ...(body.comment !== undefined ? { comment: body.comment } : {}),
          // Edits require re-moderation.
          status: 'pending',
          moderatedBy: null,
          moderatedAt: null,
        })
        .where(eq(reviews.id, reviewId))

      await replaceTags(tx, reviewId, body.tags)

      const [row] = await tx
        .select()
        .from(reviews)
        .where(eq(reviews.id, reviewId))
        .limit(1)
      return row!
    })

    return { id: updated.id, status: updated.status }
  }

  /**
   * Author requests deletion of their own review. Soft-deletes it (hidden
   * from public immediately) and queues it for admin confirmation.
   */
  static async requestDeletion(reviewId: string, authorId: string) {
    const [existing] = await db
      .select()
      .from(reviews)
      .where(eq(reviews.id, reviewId))
      .limit(1)
    if (!existing) return status(404, 'Review not found')
    if (existing.authorId !== authorId) {
      return status(403, 'You can only delete your own review')
    }
    if (existing.deletionRequested) {
      return status(409, 'Deletion has already been requested for this review')
    }

    await db
      .update(reviews)
      .set({ deletionRequested: true, deletionRequestedAt: new Date() })
      .where(eq(reviews.id, reviewId))

    return {
      id: reviewId,
      deletionRequested: true,
      message: 'Deletion requested. An admin will review it shortly.',
    }
  }

  /**
   * The author's own review for a professor (any status), so the UI can
   * decide whether to show "rate" vs "edit/delete".
   */
  static async getMineForProfessor(professorId: string, authorId: string) {
    const [row] = await db
      .select()
      .from(reviews)
      .where(
        and(
          eq(reviews.professorId, professorId),
          eq(reviews.authorId, authorId),
        ),
      )
      .limit(1)

    if (!row) return { review: null }

    const tagRows = await db
      .select({ tag: reviewTags.tag })
      .from(reviewTags)
      .where(eq(reviewTags.reviewId, row.id))

    return {
      review: {
        id: row.id,
        professorId: row.professorId,
        courseCode: row.courseCode,
        qualityRating: row.qualityRating,
        difficultyRating: row.difficultyRating,
        wouldTakeAgain: row.wouldTakeAgain,
        grade: row.grade,
        comment: row.comment,
        status: row.status,
        deletionRequested: row.deletionRequested,
        createdAt: row.createdAt,
        tags: tagRows.map((t) => t.tag),
      },
    }
  }

  /**
   * Public listing: only approved, not-soft-deleted reviews for a professor,
   * including tags and a net helpfulness score.
   */
  static async listApprovedForProfessor(professorId: string) {
    const rows = await db
      .select({
        id: reviews.id,
        courseCode: reviews.courseCode,
        qualityRating: reviews.qualityRating,
        difficultyRating: reviews.difficultyRating,
        wouldTakeAgain: reviews.wouldTakeAgain,
        grade: reviews.grade,
        comment: reviews.comment,
        createdAt: reviews.createdAt,
        authorId: reviews.authorId,
        authorName: users.displayName,
        score: sql<number>`coalesce(sum(${votes.value}), 0)`.as('score'),
      })
      .from(reviews)
      .leftJoin(users, eq(users.id, reviews.authorId))
      .leftJoin(votes, eq(votes.reviewId, reviews.id))
      .where(
        and(
          eq(reviews.professorId, professorId),
          eq(reviews.status, 'approved'),
          eq(reviews.deletionRequested, false),
        ),
      )
      .groupBy(reviews.id, users.displayName)
      .orderBy(desc(reviews.createdAt))

    // Attach tags per review.
    const ids = rows.map((r) => r.id)
    const tagRows = ids.length
      ? await db
          .select({ reviewId: reviewTags.reviewId, tag: reviewTags.tag })
          .from(reviewTags)
          .where(inArray(reviewTags.reviewId, ids))
      : []

    const tagMap = new Map<string, string[]>()
    for (const { reviewId, tag } of tagRows) {
      const list = tagMap.get(reviewId) ?? []
      list.push(tag)
      tagMap.set(reviewId, list)
    }

    return rows.map((r) => ({
      ...r,
      score: Number(r.score),
      tags: tagMap.get(r.id) ?? [],
    }))
  }

  /**
   * Admin listing across all professors, filterable by status
   * (defaults to the pending moderation queue). Excludes reviews that are
   * pending deletion — those live in the deletion-requests queue.
   */
  static async listForAdmin(query: ListReviewsQuery) {
    const targetStatus = query.status ?? 'pending'
    return db
      .select({
        id: reviews.id,
        professorId: reviews.professorId,
        professorFirstName: professors.firstName,
        professorLastName: professors.lastName,
        courseCode: reviews.courseCode,
        qualityRating: reviews.qualityRating,
        difficultyRating: reviews.difficultyRating,
        wouldTakeAgain: reviews.wouldTakeAgain,
        grade: reviews.grade,
        comment: reviews.comment,
        status: reviews.status,
        authorName: users.displayName,
        authorEmail: users.email,
        createdAt: reviews.createdAt,
      })
      .from(reviews)
      .leftJoin(professors, eq(professors.id, reviews.professorId))
      .leftJoin(users, eq(users.id, reviews.authorId))
      .where(
        and(
          eq(reviews.status, targetStatus),
          eq(reviews.deletionRequested, false),
        ),
      )
      .orderBy(desc(reviews.createdAt))
  }

  /**
   * Admin: list reviews with a pending deletion request.
   */
  static async listDeletionRequests() {
    return db
      .select({
        id: reviews.id,
        professorId: reviews.professorId,
        professorFirstName: professors.firstName,
        professorLastName: professors.lastName,
        courseCode: reviews.courseCode,
        qualityRating: reviews.qualityRating,
        difficultyRating: reviews.difficultyRating,
        comment: reviews.comment,
        status: reviews.status,
        authorName: users.displayName,
        authorEmail: users.email,
        deletionRequestedAt: reviews.deletionRequestedAt,
        createdAt: reviews.createdAt,
      })
      .from(reviews)
      .leftJoin(professors, eq(professors.id, reviews.professorId))
      .leftJoin(users, eq(users.id, reviews.authorId))
      .where(eq(reviews.deletionRequested, true))
      .orderBy(desc(reviews.deletionRequestedAt))
  }

  /**
   * Approve or reject a review.
   */
  static async moderate(
    id: string,
    body: ModerateReviewBody,
    moderatorId: string,
  ) {
    const [existing] = await db
      .select({ id: reviews.id })
      .from(reviews)
      .where(eq(reviews.id, id))
      .limit(1)
    if (!existing) return status(404, 'Review not found')

    await db
      .update(reviews)
      .set({
        status: body.status,
        moderatedBy: moderatorId,
        moderatedAt: new Date(),
      })
      .where(eq(reviews.id, id))

    const [updated] = await db
      .select({ id: reviews.id, status: reviews.status })
      .from(reviews)
      .where(eq(reviews.id, id))
      .limit(1)

    return updated!
  }

  /**
   * Admin resolves a deletion request:
   *  - confirm -> permanently delete the review
   *  - reject  -> clear the request flag, restoring the review
   */
  static async resolveDeletion(id: string, body: ResolveDeletionBody) {
    const [existing] = await db
      .select({ id: reviews.id, deletionRequested: reviews.deletionRequested })
      .from(reviews)
      .where(eq(reviews.id, id))
      .limit(1)
    if (!existing) return status(404, 'Review not found')
    if (!existing.deletionRequested) {
      return status(400, 'This review has no pending deletion request')
    }

    if (body.action === 'confirm') {
      await db.delete(reviews).where(eq(reviews.id, id))
      return { id, deleted: true }
    }

    await db
      .update(reviews)
      .set({ deletionRequested: false, deletionRequestedAt: null })
      .where(eq(reviews.id, id))
    return { id, deleted: false, restored: true }
  }

  /**
   * Cast (or change) a helpfulness vote on an approved review.
   */
  static async vote(reviewId: string, userId: string, body: VoteBody) {
    const [review] = await db
      .select({
        id: reviews.id,
        status: reviews.status,
        deletionRequested: reviews.deletionRequested,
      })
      .from(reviews)
      .where(eq(reviews.id, reviewId))
      .limit(1)
    if (!review) return status(404, 'Review not found')
    if (review.status !== 'approved' || review.deletionRequested) {
      return status(400, 'Cannot vote on a review that is not approved')
    }

    await db
      .insert(votes)
      .values({ id: randomUUID(), reviewId, userId, value: body.value })
      .onDuplicateKeyUpdate({
        set: { value: body.value },
      })

    const [{ score }] = await db
      .select({ score: sql<number>`coalesce(sum(${votes.value}), 0)` })
      .from(votes)
      .where(eq(votes.reviewId, reviewId))

    return { reviewId, score: Number(score) }
  }
}
