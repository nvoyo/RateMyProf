import { api, unwrap } from '../lib/eden'
import { useAuthStore, type CurrentUser } from '../stores/auth'

/**
 * Thin service layer over the Eden client.
 * Each method unwraps the response and throws a normalized Error on failure.
 */

// ---- Setup ----
export async function getSetupStatus() {
  return unwrap(await api.api.setup.get())
}

export async function runSetup(body: {
  email: string
  password: string
  displayName: string
  schoolName: string
}) {
  return unwrap(await api.api.setup.post(body))
}

// ---- Auth ----
export async function login(email: string, password: string, capToken: string) {
  const result = unwrap(await api.api.sessions.post({ email, password, capToken }))
  const auth = useAuthStore()
  auth.setUser(result.user as CurrentUser)
  return result
}

export async function fetchMe() {
  const auth = useAuthStore()
  const result = await api.api.users.me.get()
  if (result.error) {
    auth.clear()
    return null
  }
  auth.setUser(result.data as CurrentUser)
  return result.data
}

export async function logout() {
  const auth = useAuthStore()
  try {
    await api.api.sessions.current.delete()
  } catch {
    // ignore — clear locally regardless
  }
  auth.clear()
}

export async function register(body: {
  token: string
  password: string
  displayName: string
  capToken: string
}) {
  return unwrap(await api.api.users.post(body))
}

// ---- Invites (public verify) ----
export async function verifyInvite(token: string) {
  return unwrap(await api.api.invites.verify({ token }).get())
}

// ---- Password Reset ----
export async function requestPasswordReset(email: string, capToken: string) {
  return unwrap(await api.api['password-reset'].post({ email, capToken }))
}

export async function confirmPasswordReset(token: string, password: string) {
  return unwrap(await api.api['password-reset'].confirm.post({ token, password }))
}

// ---- Admin ----
export async function adminChangePassword(userId: string, password: string) {
  return unwrap(await api.api.users({ id: userId }).password.patch({ password }))
}

// ---- Schools ----
export async function listSchools() {
  return unwrap(await api.api.schools.get())
}

// ---- Professors ----
export async function listProfessors(query: {
  schoolId?: string
  q?: string
  department?: string
}) {
  return unwrap(await api.api.professors.get({ query }))
}

export async function getProfessor(id: string) {
  return unwrap(await api.api.professors({ id }).get())
}

export async function listProfessorReviews(id: string) {
  return unwrap(await api.api.professors({ id }).reviews.get())
}

export async function getMyReview(professorId: string) {
  const result = unwrap(await api.api.professors({ id: professorId }).reviews.mine.get())
  return result.review
}

export async function submitReview(
  professorId: string,
  body: {
    courseCode?: string
    qualityRating: number
    difficultyRating: number
    wouldTakeAgain: boolean
    grade?: string
    comment: string
    tags?: string[]
  },
) {
  return unwrap(await api.api.professors({ id: professorId }).reviews.post(body))
}

export async function updateReview(
  reviewId: string,
  body: {
    courseCode?: string
    qualityRating?: number
    difficultyRating?: number
    wouldTakeAgain?: boolean
    grade?: string
    comment?: string
    tags?: string[]
  },
) {
  return unwrap(await api.api.reviews({ id: reviewId }).patch(body))
}

export async function requestReviewDeletion(reviewId: string) {
  return unwrap(await api.api.reviews({ id: reviewId }).delete())
}

export async function voteReview(reviewId: string, value: 1 | -1) {
  return unwrap(await api.api.reviews({ id: reviewId }).votes.post({ value }))
}

// ---- Admin ----
export async function adminCreateSchool(body: { name: string; domain?: string }) {
  return unwrap(await api.api.schools.post(body))
}

export async function adminCreateProfessor(body: {
  schoolId: string
  firstName: string
  lastName: string
  department: string
  title?: string
}) {
  return unwrap(await api.api.professors.post(body))
}

export async function adminBulkCreateProfessors(body: {
  schoolId: string
  professors?: {
    firstName: string
    lastName: string
    department: string
    title?: string
  }[]
  text?: string
  defaultDepartment?: string
}) {
  return unwrap(await api.api.professors.bulk.post(body))
}

export async function adminUpdateProfessor(
  id: string,
  body: {
    firstName?: string
    lastName?: string
    department?: string
    title?: string
  },
) {
  return unwrap(await api.api.professors({ id }).patch(body))
}

export async function adminDeleteProfessor(id: string) {
  return unwrap(await api.api.professors({ id }).delete())
}

export async function adminListUsers() {
  return unwrap(await api.api.users.get())
}

export async function adminUpdateUser(
  id: string,
  body: { status?: 'active' | 'disabled'; role?: 'student' | 'admin' },
) {
  return unwrap(await api.api.users({ id }).patch(body))
}

export async function adminListInvites() {
  return unwrap(await api.api.invites.get())
}

export async function adminCreateInvite(body: { email: string; schoolId: string }) {
  return unwrap(await api.api.invites.post(body))
}

export async function adminRevokeInvite(id: string) {
  return unwrap(await api.api.invites({ id }).delete())
}

export async function adminListReviews(status: 'pending' | 'approved' | 'rejected') {
  return unwrap(await api.api.reviews.get({ query: { status } }))
}

export async function adminModerateReview(
  id: string,
  status: 'approved' | 'rejected',
) {
  return unwrap(await api.api.reviews({ id }).moderation.patch({ status }))
}

export async function adminListDeletionRequests() {
  return unwrap(await api.api.reviews['deletion-requests'].get())
}

export async function adminResolveDeletion(
  id: string,
  action: 'confirm' | 'reject',
) {
  return unwrap(await api.api.reviews({ id }).deletion.patch({ action }))
}
