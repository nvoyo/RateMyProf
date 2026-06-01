import { t } from 'elysia'

export const setupBody = t.Object({
  email: t.String({ format: 'email' }),
  password: t.String({ minLength: 8, maxLength: 128 }),
  displayName: t.String({ minLength: 1, maxLength: 80 }),
  schoolName: t.String({ minLength: 1, maxLength: 120 }),
})

export const setupStatusResponse = t.Object({
  initialized: t.Boolean(),
})

export type SetupBody = typeof setupBody.static
