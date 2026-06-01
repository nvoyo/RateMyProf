import { defineStore } from 'pinia'

export interface CurrentUser {
  id: string
  email: string
  displayName: string
  role: 'student' | 'admin'
  status: 'active' | 'disabled'
  schoolId: string | null
  createdAt: string | Date
}

/**
 * Auth state. The session token lives in an HttpOnly cookie managed by the
 * server, so it is intentionally NOT stored here. We only keep the resolved
 * user, hydrated from GET /users/me on app load.
 */
export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as CurrentUser | null,
    loaded: false,
  }),
  getters: {
    isAuthenticated: (state) => Boolean(state.user),
    isAdmin: (state) => state.user?.role === 'admin',
  },
  actions: {
    setUser(user: CurrentUser | null) {
      this.user = user
    },
    clear() {
      this.user = null
    },
  },
})
