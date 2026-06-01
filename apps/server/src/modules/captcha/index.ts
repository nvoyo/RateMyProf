import { Elysia, t } from 'elysia'
import { cap } from './cap.ts'

/**
 * CAPTCHA resource — exposes the two endpoints the cap.js widget needs.
 *   POST /cap/challenge -> create a PoW challenge
 *   POST /cap/redeem    -> redeem a solved challenge for a token
 *
 * The resulting token must be passed to protected endpoints (e.g. password-reset).
 */
export const captchaModule = new Elysia({ prefix: '/cap' })
  .post('/challenge', () => cap.createChallenge())
  .post(
    '/redeem',
    async ({ body }) => {
      if (!body.token || !body.solutions) {
        return { success: false }
      }
      return await cap.redeemChallenge({
        token: body.token,
        solutions: body.solutions,
      })
    },
    {
      body: t.Object({
        token: t.String(),
        solutions: t.Array(t.Number()),
      }),
    },
  )
