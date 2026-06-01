import { t } from 'elysia'

export const createInviteBody = t.Object({
  email: t.String({ format: 'email' }),
  schoolId: t.String(),
})

export const publicInvite = t.Object({
  email: t.String(),
  schoolId: t.String(),
  schoolName: t.String(),
  valid: t.Boolean(),
})

export type CreateInviteBody = typeof createInviteBody.static
