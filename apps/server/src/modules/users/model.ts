import { t } from 'elysia'

// POST /users — register via invite token
export const registerBody = t.Object({
  token: t.String({ minLength: 1 }),
  password: t.String({ minLength: 8, maxLength: 128 }),
  displayName: t.String({ minLength: 1, maxLength: 80 }),
})

// PATCH /users/:id — admin enable/disable
export const updateUserBody = t.Object({
  status: t.Optional(t.Union([t.Literal('active'), t.Literal('disabled')])),
  role: t.Optional(t.Union([t.Literal('student'), t.Literal('admin')])),
})

export const publicUser = t.Object({
  id: t.String(),
  email: t.String(),
  displayName: t.String(),
  role: t.Union([t.Literal('student'), t.Literal('admin'), t.Literal('owner')]),
  status: t.Union([t.Literal('active'), t.Literal('disabled')]),
  schoolId: t.Union([t.String(), t.Null()]),
  createdAt: t.Date(),
})

export type RegisterBody = typeof registerBody.static
export type UpdateUserBody = typeof updateUserBody.static
