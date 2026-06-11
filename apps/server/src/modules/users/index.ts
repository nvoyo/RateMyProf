import { Elysia, t } from 'elysia'
import { authPlugin } from '../../plugins/auth.ts'
import { cap } from '../captcha/cap.ts'
import { adminChangePasswordBody } from '../password-reset/model.ts'
import { PasswordResetService } from '../password-reset/service.ts'
import { registerBody, updateUserBody } from './model.ts'
import { UserService } from './service.ts'

/**
 * Users resource.
 *   POST  /users        -> register a new account via an invite token (public, requires CAPTCHA)
 *   GET   /users/me     -> current authenticated user
 *   GET   /users        -> list users (admin)
 *   PATCH /users/:id    -> enable/disable or change role (admin)
 *   PATCH /users/:id/password -> admin force-change a user's password
 */
export const usersModule = new Elysia({ prefix: '/users' })
  .use(authPlugin)
  .post(
    '/',
    async ({ body, status }) => {
      const { success } = await cap.validateToken(body.capToken)
      if (!success) {
        return status(400, 'CAPTCHA verification failed. Please try again.')
      }
      return UserService.register(body)
    },
    {
      body: t.Composite([
        registerBody,
        t.Object({ capToken: t.String({ minLength: 1 }) }),
      ]),
    },
  )
  .get('/me', ({ currentUser }) => UserService.toPublic(currentUser), {
    requireAuth: true,
  })
  .get('/', () => UserService.list(), {
    requireAdmin: true,
  })
  .patch(
    '/:id',
    ({ params, body, currentUser }) =>
      UserService.update(params.id, body, currentUser.id),
    {
      requireAdmin: true,
      params: t.Object({ id: t.String() }),
      body: updateUserBody,
    },
  )
  .patch(
    '/:id/password',
    ({ params, body, currentUser }) =>
      PasswordResetService.adminChangePassword(
        params.id,
        body.password,
        currentUser.id,
      ),
    {
      requireAdmin: true,
      params: t.Object({ id: t.String({ format: 'uuid' }) }),
      body: adminChangePasswordBody,
    },
  )
