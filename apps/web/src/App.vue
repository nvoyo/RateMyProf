<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, RouterView, useRouter } from 'vue-router'
import { useAuthStore } from './stores/auth'
import { logout } from './services/api'

const auth = useAuthStore()
const router = useRouter()
const isAuthed = computed(() => auth.isAuthenticated)
const isAdmin = computed(() => auth.isAdmin)

async function handleLogout() {
  await logout()
  router.push({ name: 'home' })
}
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <header class="sticky top-0 z-50 bg-bg/80 backdrop-blur-xl border-b border-border">
      <div class="flex items-center justify-between max-w-[1100px] mx-auto px-6 h-14">
        <RouterLink to="/" class="flex items-center gap-2 text-[17px] font-bold tracking-tight text-text no-underline hover:text-text">
          <span class="inline-flex items-center justify-center w-9 h-9 bg-text text-white rounded-lg text-2xl font-extrabold -mr-1">R</span>ateMyProf
        </RouterLink>
        <nav class="flex items-center gap-1">
          <RouterLink to="/professors" class="px-3.5 py-1.5 rounded-lg text-sm font-medium text-text-secondary transition-all hover:text-text hover:bg-accent-soft router-link-active:text-text router-link-active:bg-accent-soft">Professors</RouterLink>
          <RouterLink v-if="isAdmin" to="/admin" class="px-3.5 py-1.5 rounded-lg text-sm font-medium text-text-secondary transition-all hover:text-text hover:bg-accent-soft router-link-active:text-text router-link-active:bg-accent-soft">Admin</RouterLink>
          <template v-if="isAuthed">
            <span class="text-[13px] text-text-tertiary px-2">{{ auth.user?.displayName }}</span>
            <button class="border border-border text-text-secondary px-3.5 py-1.5 rounded-lg text-[13px] font-medium cursor-pointer transition-all hover:bg-accent-soft hover:border-border-hover hover:text-text" @click="handleLogout">Log out</button>
          </template>
          <template v-else>
            <RouterLink to="/login" class="bg-accent text-white px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all hover:bg-accent-hover">Log in</RouterLink>
          </template>
        </nav>
      </div>
    </header>

    <main class="flex-1 w-full max-w-[1100px] mx-auto px-6 py-8 pb-20">
      <RouterView />
    </main>

    <footer class="text-center py-6 text-text-tertiary text-[13px] border-t border-border">
      RateMyProf
    </footer>
  </div>
</template>
