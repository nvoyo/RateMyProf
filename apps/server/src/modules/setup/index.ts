import { Elysia } from 'elysia'
import { jwt } from '@elysiajs/jwt'
import { AUTH_COOKIE, sessionCookieOptions } from '../../plugins/auth.ts'
import { env } from '../../env.ts'
import { setupBody } from './model.ts'
import { SetupService } from './service.ts'

/**
 * Setup / first-run bootstrap.
 *
 * RESTful: the "setup" resource represents one-time system initialization.
 *   GET  /setup   -> current initialization status
 *   POST /setup   -> create the first admin + school + auto-login (locked afterwards)
 */
export const setupModule = new Elysia({ prefix: '/setup' })
  .use(
    jwt({
      name: 'jwt',
      secret: env.jwtSecret,
      exp: '7d',
    }),
  )
  .get('/', async () => ({
    initialized: await SetupService.isInitialized(),
  }))
  .post(
    '/',
    async ({ body, jwt, cookie, status }) => {
      const result = await SetupService.initialize(body)
      if (!('admin' in result)) return result

      const token = await jwt.sign({
        sub: result.admin.id,
        role: 'admin' as const,
        schoolId: result.school.id,
      })

      cookie[AUTH_COOKIE]!.set({
        value: token,
        ...sessionCookieOptions,
      })

      return status(201, {
        school: result.school,
        admin: result.admin,
      })
    },
    {
      body: setupBody,
    },
  )
