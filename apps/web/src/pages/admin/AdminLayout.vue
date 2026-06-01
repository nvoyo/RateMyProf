<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <div class="flex flex-col md:flex-row gap-6 items-start">
    <aside class="w-full md:w-[180px] shrink-0">
      <h2 class="text-[11px] uppercase tracking-widest text-text-tertiary font-semibold mb-2.5">Admin</h2>
      <nav class="flex flex-row md:flex-col gap-0.5 overflow-x-auto">
        <RouterLink to="/admin" exact-active-class="bg-accent-soft text-text" class="whitespace-nowrap py-2.5 px-3 rounded-lg text-sm font-medium text-text-secondary no-underline transition-all hover:bg-accent-soft">Dashboard</RouterLink>
        <RouterLink to="/admin/moderation" active-class="bg-accent-soft text-text" class="whitespace-nowrap py-2.5 px-3 rounded-lg text-sm font-medium text-text-secondary no-underline transition-all hover:bg-accent-soft">Moderation</RouterLink>
        <RouterLink to="/admin/professors" active-class="bg-accent-soft text-text" class="whitespace-nowrap py-2.5 px-3 rounded-lg text-sm font-medium text-text-secondary no-underline transition-all hover:bg-accent-soft">Professors</RouterLink>
        <RouterLink to="/admin/invites" active-class="bg-accent-soft text-text" class="whitespace-nowrap py-2.5 px-3 rounded-lg text-sm font-medium text-text-secondary no-underline transition-all hover:bg-accent-soft">Invites</RouterLink>
        <RouterLink to="/admin/users" active-class="bg-accent-soft text-text" class="whitespace-nowrap py-2.5 px-3 rounded-lg text-sm font-medium text-text-secondary no-underline transition-all hover:bg-accent-soft">Users</RouterLink>
      </nav>
    </aside>
    <div class="flex-1 min-w-0 w-full">
      <RouterView />
    </div>
  </div>
</template>
