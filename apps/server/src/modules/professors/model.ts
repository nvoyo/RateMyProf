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

/**
 * Bulk import. Supply professors as a structured array and/or as raw roster
 * text (one professor per line). At least one of the two must be non-empty.
 *
 * Each text line is split on comma or tab into:
 *   firstName, lastName, department, title
 * `department` falls back to `defaultDepartment` when a line omits it.
 */
export const bulkCreateProfessorsBody = t.Object({
  schoolId: t.String(),
  professors: t.Optional(
    t.Array(
      t.Object({
        firstName: t.String({ minLength: 1, maxLength: 80 }),
        lastName: t.String({ minLength: 1, maxLength: 80 }),
        department: t.String({ minLength: 1, maxLength: 120 }),
        title: t.Optional(t.String({ maxLength: 120 })),
      }),
      { maxItems: 2000 },
    ),
  ),
  text: t.Optional(t.String({ maxLength: 200_000 })),
  defaultDepartment: t.Optional(t.String({ minLength: 1, maxLength: 120 })),
})

export type ListProfessorsQuery = typeof listProfessorsQuery.static
export type CreateProfessorBody = typeof createProfessorBody.static
export type UpdateProfessorBody = typeof updateProfessorBody.static
export type BulkCreateProfessorsBody = typeof bulkCreateProfessorsBody.static
