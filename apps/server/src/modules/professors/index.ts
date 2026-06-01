import { Elysia, t } from 'elysia'
import { authPlugin } from '../../plugins/auth.ts'
import { ReviewService } from '../reviews/service.ts'
import { createReviewBody } from '../reviews/model.ts'
import {
  createProfessorBody,
  listProfessorsQuery,
  updateProfessorBody,
} from './model.ts'
import { ProfessorService } from './service.ts'

/**
 * Professors resource (+ nested reviews subresource).
 *   GET    /professors                 -> list/search (public)
 *   GET    /professors/:id             -> details with aggregate scores (public)
 *   POST   /professors                 -> create (admin)
 *   PATCH  /professors/:id             -> update (admin)
 *   DELETE /professors/:id             -> delete (admin)
 *   GET    /professors/:id/reviews     -> approved reviews for a professor (public)
 *   GET    /professors/:id/reviews/mine -> the current user's own review (auth)
 *   POST   /professors/:id/reviews     -> submit a review (authenticated, pending)
 */
export const professorsModule = new Elysia({ prefix: '/professors' })
  .use(authPlugin)
  .get('/', ({ query }) => ProfessorService.list(query), {
    query: listProfessorsQuery,
  })
  .get('/:id', ({ params }) => ProfessorService.get(params.id), {
    params: t.Object({ id: t.String({ format: 'uuid' }) }),
  })
  .post('/', ({ body }) => ProfessorService.create(body), {
    requireAdmin: true,
    body: createProfessorBody,
  })
  .patch('/:id', ({ params, body }) => ProfessorService.update(params.id, body), {
    requireAdmin: true,
    params: t.Object({ id: t.String({ format: 'uuid' }) }),
    body: updateProfessorBody,
  })
  .delete('/:id', ({ params }) => ProfessorService.remove(params.id), {
    requireAdmin: true,
    params: t.Object({ id: t.String({ format: 'uuid' }) }),
  })
  // ---- Nested reviews subresource ----
  .get(
    '/:id/reviews',
    ({ params }) => ReviewService.listApprovedForProfessor(params.id),
    {
      params: t.Object({ id: t.String({ format: 'uuid' }) }),
    },
  )
  .get(
    '/:id/reviews/mine',
    ({ params, currentUser }) =>
      ReviewService.getMineForProfessor(params.id, currentUser.id),
    {
      requireAuth: true,
      params: t.Object({ id: t.String({ format: 'uuid' }) }),
    },
  )
  .post(
    '/:id/reviews',
    ({ params, body, currentUser }) =>
      ReviewService.create(params.id, body, currentUser.id),
    {
      requireAuth: true,
      params: t.Object({ id: t.String({ format: 'uuid' }) }),
      body: createReviewBody,
    },
  )
