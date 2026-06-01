import { Elysia, t } from 'elysia'
import { authPlugin } from '../../plugins/auth.ts'
import { createInviteBody } from './model.ts'
import { InviteService } from './service.ts'

/**
 * Invites resource (admin whitelist + public token verification).
 *   GET    /invites               -> list invites (admin)
 *   POST   /invites               -> create invite + send email (admin)
 *   DELETE /invites/:id           -> revoke an invite (admin)
 *   GET    /invites/verify/:token -> verify a token for the registration page (public)
 */
export const invitesModule = new Elysia({ prefix: '/invites' })
  .use(authPlugin)
  .get('/', () => InviteService.list(), {
    requireAdmin: true,
  })
  .post('/', ({ body, currentUser }) => InviteService.create(body, currentUser.id), {
    requireAdmin: true,
    body: createInviteBody,
  })
  .delete('/:id', ({ params }) => InviteService.revoke(params.id), {
    requireAdmin: true,
    params: t.Object({ id: t.String() }),
  })
  // Public verification used by the registration page.
  .get('/verify/:token', ({ params }) => InviteService.verify(params.token), {
    params: t.Object({ token: t.String() }),
  })
