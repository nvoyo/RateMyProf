import { t } from 'elysia'

export const createReviewBody = t.Object({
  courseCode: t.Optional(t.String({ maxLength: 32 })),
  qualityRating: t.Integer({ minimum: 1, maximum: 5 }),
  difficultyRating: t.Integer({ minimum: 1, maximum: 5 }),
  wouldTakeAgain: t.Boolean(),
  grade: t.Optional(t.String({ maxLength: 8 })),
  comment: t.String({ minLength: 1, maxLength: 5000 }),
  tags: t.Optional(t.Array(t.String({ maxLength: 40 }), { maxItems: 10 })),
})

// Authors editing their own review. All fields optional (partial update).
export const updateReviewBody = t.Object({
  courseCode: t.Optional(t.String({ maxLength: 32 })),
  qualityRating: t.Optional(t.Integer({ minimum: 1, maximum: 5 })),
  difficultyRating: t.Optional(t.Integer({ minimum: 1, maximum: 5 })),
  wouldTakeAgain: t.Optional(t.Boolean()),
  grade: t.Optional(t.String({ maxLength: 8 })),
  comment: t.Optional(t.String({ minLength: 1, maxLength: 5000 })),
  tags: t.Optional(t.Array(t.String({ maxLength: 40 }), { maxItems: 10 })),
})

export const listReviewsQuery = t.Object({
  status: t.Optional(
    t.Union([
      t.Literal('pending'),
      t.Literal('approved'),
      t.Literal('rejected'),
    ]),
  ),
})

export const moderateReviewBody = t.Object({
  status: t.Union([t.Literal('approved'), t.Literal('rejected')]),
})

// Admin resolving a deletion request: confirm (delete) or reject (restore).
export const resolveDeletionBody = t.Object({
  action: t.Union([t.Literal('confirm'), t.Literal('reject')]),
})

export const voteBody = t.Object({
  value: t.Union([t.Literal(1), t.Literal(-1)]),
})

export type CreateReviewBody = typeof createReviewBody.static
export type UpdateReviewBody = typeof updateReviewBody.static
export type ListReviewsQuery = typeof listReviewsQuery.static
export type ModerateReviewBody = typeof moderateReviewBody.static
export type ResolveDeletionBody = typeof resolveDeletionBody.static
export type VoteBody = typeof voteBody.static
