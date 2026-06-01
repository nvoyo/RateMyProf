import { Elysia, t } from 'elysia'
import { authPlugin } from '../../plugins/auth.ts'
import {
  listReviewsQuery,
  moderateReviewBody,
  resolveDeletionBody,
  updateReviewBody,
  voteBody,
} from './model.ts'
import { ReviewService } from './service.ts'

/**
 * Reviews resource (author edits/deletes, moderation, deletion requests, votes).
 * Creating and listing reviews per professor lives under the nested
 * /professors/:id/reviews route. These endpoints cover cross-cutting actions.
 *
 *   GET    /reviews?status=pending          -> moderation queue (admin)
 *   GET    /reviews/deletion-requests       -> deletion request queue (admin)
 *   PATCH  /reviews/:id                      -> edit own review (author, -> pending)
 *   DELETE /reviews/:id                      -> request deletion of own review (author)
 *   PATCH  /reviews/:id/moderation           -> approve/reject (admin)
 *   PATCH  /reviews/:id/deletion             -> confirm/reject deletion (admin)
 *   POST   /reviews/:id/votes                -> cast a helpfulness vote (authenticated)
 */
export const reviewsModule = new Elysia({ prefix: '/reviews' })
  .use(authPlugin)
  .get('/', ({ query }) => ReviewService.listForAdmin(query), {
    requireAdmin: true,
    query: listReviewsQuery,
  })
  .get('/deletion-requests', () => ReviewService.listDeletionRequests(), {
    requireAdmin: true,
  })
  // ---- Author actions on their own review ----
  .patch(
    '/:id',
    ({ params, body, currentUser }) =>
      ReviewService.update(params.id, body, currentUser.id),
    {
      requireAuth: true,
      params: t.Object({ id: t.String({ format: 'uuid' }) }),
      body: updateReviewBody,
    },
  )
  .delete(
    '/:id',
    ({ params, currentUser }) =>
      ReviewService.requestDeletion(params.id, currentUser.id),
    {
      requireAuth: true,
      params: t.Object({ id: t.String({ format: 'uuid' }) }),
    },
  )
  // ---- Admin moderation ----
  .patch(
    '/:id/moderation',
    ({ params, body, currentUser }) =>
      ReviewService.moderate(params.id, body, currentUser.id),
    {
      requireAdmin: true,
      params: t.Object({ id: t.String({ format: 'uuid' }) }),
      body: moderateReviewBody,
    },
  )
  // ---- Admin resolving a deletion request ----
  .patch(
    '/:id/deletion',
    ({ params, body }) => ReviewService.resolveDeletion(params.id, body),
    {
      requireAdmin: true,
      params: t.Object({ id: t.String({ format: 'uuid' }) }),
      body: resolveDeletionBody,
    },
  )
  .post(
    '/:id/votes',
    ({ params, body, currentUser }) =>
      ReviewService.vote(params.id, currentUser.id, body),
    {
      requireAuth: true,
      params: t.Object({ id: t.String({ format: 'uuid' }) }),
      body: voteBody,
    },
  )
