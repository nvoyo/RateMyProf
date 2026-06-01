import { Elysia, t } from 'elysia'
import { AUTH_COOKIE, authPlugin, sessionCookieOptions } from '../../plugins/auth.ts'
import { cap } from '../captcha/cap.ts'
import { UserService } from '../users/service.ts'
import { loginBody } from './model.ts'
import { SessionService } from './service.ts'

/**
 * Sessions resource (authentication).
 *   POST   /sessions          -> create a session (login); sets HttpOnly cookie
 *   DELETE /sessions/current  -> log out; clears the cookie
 *
 * The session JWT is stored in an HttpOnly cookie (not the response body),
 * so it is never exposed to JavaScript.
 */
export const sessionsModule = new Elysia({ prefix: '/sessions' })
  .use(authPlugin)
  .post(
    '/',
    async ({ body, jwt, cookie, status }) => {
      const { success } = await cap.validateToken(body.capToken)
      if (!success) {
        return status(400, 'CAPTCHA verification failed. Please try again.')
      }

      const result = await SessionService.authenticate(body)
      // On failure the service returns an Elysia status object (no passwordHash).
      if (!('passwordHash' in result)) return result

      const user = result
      const token = await jwt.sign({
        sub: user.id,
        role: user.role,
        schoolId: user.schoolId,
      })

      cookie[AUTH_COOKIE]!.set({
        value: token,
        ...sessionCookieOptions,
      })

      return status(201, {
        user: UserService.toPublic(user),
      })
    },
    {
      body: t.Composite([
        loginBody,
        t.Object({ capToken: t.String({ minLength: 1 }) }),
      ]),
    },
  )
  // Log out: clear the session cookie.
  .delete('/current', ({ cookie }) => {
    cookie[AUTH_COOKIE]!.remove()
    return { success: true }
  }, {
    requireAuth: true,
  })
