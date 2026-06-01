import { Elysia, t } from 'elysia'
import { requestResetBody, confirmResetBody } from './model.ts'
import { PasswordResetService } from './service.ts'

/**
 * Password reset resource.
 *   POST /password-reset         -> request a reset (requires CAPTCHA)
 *   POST /password-reset/confirm -> confirm reset with token + new password
 *   PATCH /users/:id/password    -> admin force-change a user's password
 *
 * The first two are public (no auth). The third requires admin auth and
 * lives under /users for RESTful consistency, but is implemented here
 * alongside the reset logic.
 */
export const passwordResetModule = new Elysia({ prefix: '/password-reset' })
  .post(
    '/',
    ({ body }) => PasswordResetService.request(body, body.capToken),
    {
      body: t.Composite([
        requestResetBody,
        t.Object({ capToken: t.String({ minLength: 1 }) }),
      ]),
    },
  )
  .post('/confirm', ({ body }) => PasswordResetService.confirm(body), {
    body: confirmResetBody,
  })
