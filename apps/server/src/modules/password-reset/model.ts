import { t } from 'elysia'

export const requestResetBody = t.Object({
  email: t.String({ format: 'email' }),
})

export const confirmResetBody = t.Object({
  token: t.String({ minLength: 1 }),
  password: t.String({ minLength: 8, maxLength: 128 }),
})

// Admin changing a user's password.
export const adminChangePasswordBody = t.Object({
  password: t.String({ minLength: 8, maxLength: 128 }),
})

export type RequestResetBody = typeof requestResetBody.static
export type ConfirmResetBody = typeof confirmResetBody.static
export type AdminChangePasswordBody = typeof adminChangePasswordBody.static
