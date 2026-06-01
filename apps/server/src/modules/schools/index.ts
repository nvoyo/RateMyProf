import { Elysia, t } from 'elysia'
import { authPlugin } from '../../plugins/auth.ts'
import { createSchoolBody } from './model.ts'
import { SchoolService } from './service.ts'

/**
 * Schools resource.
 *   GET  /schools       -> list all schools (public)
 *   GET  /schools/:id   -> school details (public)
 *   POST /schools       -> create a school (admin)
 */
export const schoolsModule = new Elysia({ prefix: '/schools' })
  .use(authPlugin)
  .get('/', () => SchoolService.list())
  .get('/:id', ({ params }) => SchoolService.get(params.id), {
    params: t.Object({ id: t.String() }),
  })
  .post('/', ({ body }) => SchoolService.create(body), {
    requireAdmin: true,
    body: createSchoolBody,
  })
