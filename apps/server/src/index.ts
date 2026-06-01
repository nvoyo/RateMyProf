import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'
import { env } from './env.ts'
import { setupModule } from './modules/setup/index.ts'
import { usersModule } from './modules/users/index.ts'
import { sessionsModule } from './modules/sessions/index.ts'
import { schoolsModule } from './modules/schools/index.ts'
import { professorsModule } from './modules/professors/index.ts'
import { reviewsModule } from './modules/reviews/index.ts'
import { invitesModule } from './modules/invites/index.ts'
import { passwordResetModule } from './modules/password-reset/index.ts'
import { captchaModule } from './modules/captcha/index.ts'

const app = new Elysia()
  .use(
    cors({
      origin: env.webOrigin,
      credentials: true,
    }),
  )
  .onError(({ code, error, status }) => {
    if (code === 'VALIDATION') {
      return status(422, {
        error: 'Validation failed',
        details: error.all,
      })
    }
    if (code === 'NOT_FOUND') {
      return status(404, { error: 'Not found' })
    }
    // Postgres "invalid text representation" (e.g. a non-UUID string passed
    // where a uuid column is expected) — treat as a not-found rather than 500.
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code?: string }).code === '22P02'
    ) {
      return status(404, { error: 'Not found' })
    }
    console.error('[server] Unhandled error:', error)
    return status(500, { error: 'Internal server error' })
  })
  .get('/health', () => ({ status: 'ok' }))
  .group('/api', (api) =>
    api
      .use(setupModule)
      .use(usersModule)
      .use(sessionsModule)
      .use(schoolsModule)
      .use(professorsModule)
      .use(reviewsModule)
      .use(invitesModule)
      .use(passwordResetModule)
      .use(captchaModule),
  )
  .listen(env.port)

console.log(
  `🦊 Server running at http://${app.server?.hostname}:${app.server?.port}`,
)

export type App = typeof app
