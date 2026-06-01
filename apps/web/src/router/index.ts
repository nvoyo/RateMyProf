import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { fetchMe, getSetupStatus } from '../services/api'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/setup',
      name: 'setup',
      component: () => import('../pages/Setup.vue'),
      meta: { public: true },
    },
    {
      path: '/',
      name: 'home',
      component: () => import('../pages/Home.vue'),
      meta: { public: true },
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../pages/Login.vue'),
      meta: { public: true },
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('../pages/Register.vue'),
      meta: { public: true },
    },
    {
      path: '/forgot-password',
      name: 'forgot-password',
      component: () => import('../pages/ForgotPassword.vue'),
      meta: { public: true },
    },
    {
      path: '/reset-password',
      name: 'reset-password',
      component: () => import('../pages/ResetPassword.vue'),
      meta: { public: true },
    },
    {
      path: '/professors',
      name: 'professors',
      component: () => import('../pages/ProfessorList.vue'),
      meta: { public: true },
    },
    {
      path: '/professors/:id',
      name: 'professor-detail',
      component: () => import('../pages/ProfessorDetail.vue'),
      meta: { public: true },
    },
    {
      path: '/professors/:id/review',
      name: 'submit-review',
      component: () => import('../pages/SubmitReview.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/admin',
      component: () => import('../pages/admin/AdminLayout.vue'),
      meta: { requiresAdmin: true },
      children: [
        {
          path: '',
          name: 'admin-dashboard',
          component: () => import('../pages/admin/Dashboard.vue'),
        },
        {
          path: 'moderation',
          name: 'admin-moderation',
          component: () => import('../pages/admin/Moderation.vue'),
        },
        {
          path: 'professors',
          name: 'admin-professors',
          component: () => import('../pages/admin/Professors.vue'),
        },
        {
          path: 'invites',
          name: 'admin-invites',
          component: () => import('../pages/admin/Invites.vue'),
        },
        {
          path: 'users',
          name: 'admin-users',
          component: () => import('../pages/admin/Users.vue'),
        },
      ],
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
})

// Cache the initialization check so we don't hit the API on every navigation.
let initializedCache: boolean | null = null

router.beforeEach(async (to) => {
  const auth = useAuthStore()

  // 1. First-run check: if the system has no admin yet, force the setup wizard.
  if (initializedCache === null) {
    try {
      const status = await getSetupStatus()
      initializedCache = status.initialized
    } catch {
      // If the API is unreachable, let the route proceed; pages handle errors.
      initializedCache = true
    }
  }

  if (!initializedCache) {
    return to.name === 'setup' ? true : { name: 'setup' }
  }

  // Once initialized, the setup page is locked.
  if (to.name === 'setup') {
    return { name: 'home' }
  }

  // 2. Hydrate the current user once per app load. The session lives in an
  //    HttpOnly cookie, so we ask the server who we are rather than reading JS.
  if (!auth.loaded) {
    auth.loaded = true
    await fetchMe()
  }

  // 3. Route guards.
  if (to.meta.requiresAdmin) {
    if (!auth.isAuthenticated) return { name: 'login', query: { redirect: to.fullPath } }
    if (!auth.isAdmin) return { name: 'home' }
  }
  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  return true
})

/** Allows pages (e.g. after running setup) to invalidate the cached flag. */
export function markInitialized() {
  initializedCache = true
}

export default router
