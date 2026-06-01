import { t } from 'elysia'

export const listProfessorsQuery = t.Object({
  schoolId: t.Optional(t.String()),
  q: t.Optional(t.String()),
  department: t.Optional(t.String()),
})

export const createProfessorBody = t.Object({
  schoolId: t.String(),
  firstName: t.String({ minLength: 1, maxLength: 80 }),
  lastName: t.String({ minLength: 1, maxLength: 80 }),
  department: t.String({ minLength: 1, maxLength: 120 }),
  title: t.Optional(t.String({ maxLength: 120 })),
})

export const updateProfessorBody = t.Object({
  firstName: t.Optional(t.String({ minLength: 1, maxLength: 80 })),
  lastName: t.Optional(t.String({ minLength: 1, maxLength: 80 })),
  department: t.Optional(t.String({ minLength: 1, maxLength: 120 })),
  title: t.Optional(t.String({ maxLength: 120 })),
})

export type ListProfessorsQuery = typeof listProfessorsQuery.static
export type CreateProfessorBody = typeof createProfessorBody.static
export type UpdateProfessorBody = typeof updateProfessorBody.static
