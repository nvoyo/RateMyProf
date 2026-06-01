import { t } from 'elysia'

export const loginBody = t.Object({
  email: t.String({ format: 'email' }),
  password: t.String({ minLength: 1, maxLength: 128 }),
})

export type LoginBody = typeof loginBody.static
