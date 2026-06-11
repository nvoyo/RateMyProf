import { Elysia, t } from 'elysia'
import { jwt } from '@elysiajs/jwt'
import { eq } from 'drizzle-orm'
import { db } from '../db/index.ts'
import { users } from '../db/schema.ts'
import { env } from '../env.ts'

/**
 * Name of the HttpOnly cookie that carries the session JWT.
 */
export const AUTH_COOKIE = 'rmp_session'

/**
 * Shared cookie attributes for the session cookie.
 * HttpOnly so JavaScript (and therefore XSS) cannot read the token.
 * SameSite=Lax is a good default for a same-site SPA + API.
 */
export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  // `secure` only over HTTPS in production. Disabled in dev (http://localhost).
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: 7 * 24 * 60 * 60, // 7 days, matches the JWT exp
}

/**
 * JWT payload stored in the session cookie.
 */
export const jwtPayloadSchema = t.Object({
  sub: t.String(), // user id
  role: t.Union([
    t.Literal('student'),
    t.Literal('admin'),
    t.Literal('owner'),
  ]),
  schoolId: t.Optional(t.Union([t.String(), t.Null()])),
})

/**
 * Auth plugin: registers the JWT signer/verifier and exposes
 * `requireAuth` / `requireAdmin` macros for route-level protection.
 *
 * The session JWT is transported via an HttpOnly cookie (see AUTH_COOKIE),
 * which is not readable by JavaScript and therefore resistant to XSS token
 * theft. The browser sends it automatically with `credentials: 'include'`.
 */
export const authPlugin = new Elysia({ name: 'auth' })
  .use(
    jwt({
      name: 'jwt',
      secret: env.jwtSecret,
      exp: '7d',
      schema: jwtPayloadSchema,
    }),
  )
  .macro({
    /**
     * Requires a valid session cookie tied to an active user.
     * Resolves `currentUser` into the handler context.
     */
    requireAuth(_enabled: boolean) {
      return {
        async resolve({ jwt, cookie, status }) {
          const token = cookie[AUTH_COOKIE]?.value
          if (!token || typeof token !== 'string') {
            return status(401, 'Not authenticated')
          }

          const payload = await jwt.verify(token)
          if (!payload) {
            return status(401, 'Invalid or expired session')
          }

          const [user] = await db
            .select()
            .from(users)
            .where(eq(users.id, payload.sub))
            .limit(1)

          if (!user || user.status === 'disabled') {
            return status(401, 'Account not found or disabled')
          }

          return { currentUser: user }
        },
      }
    },
    /**
     * Requires an authenticated user with the admin or owner role.
     */
    requireAdmin(_enabled: boolean) {
      return {
        async resolve({ jwt, cookie, status }) {
          const token = cookie[AUTH_COOKIE]?.value
          if (!token || typeof token !== 'string') {
            return status(401, 'Not authenticated')
          }

          const payload = await jwt.verify(token)
          if (!payload) {
            return status(401, 'Invalid or expired session')
          }

          const [user] = await db
            .select()
            .from(users)
            .where(eq(users.id, payload.sub))
            .limit(1)

          if (!user || user.status === 'disabled') {
            return status(401, 'Account not found or disabled')
          }
          if (user.role !== 'admin' && user.role !== 'owner') {
            return status(403, 'Admin access required')
          }

          return { currentUser: user }
        },
      }
    },
  })
