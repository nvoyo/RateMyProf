import { t } from 'elysia'

export const createSchoolBody = t.Object({
  name: t.String({ minLength: 1, maxLength: 120 }),
  domain: t.Optional(t.String({ maxLength: 120 })),
})

export type CreateSchoolBody = typeof createSchoolBody.static
