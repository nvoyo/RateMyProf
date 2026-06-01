<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { adminListInvites, adminListReviews, adminListUsers, listProfessors } from '../../services/api'

const stats = ref({ pendingReviews: 0, professors: 0, users: 0, pendingInvites: 0 })
const loading = ref(true)

onMounted(async () => {
  try {
    const [pending, profs, users, invites] = await Promise.all([
      adminListReviews('pending'), listProfessors({}), adminListUsers(), adminListInvites(),
    ])
    stats.value = { pendingReviews: pending.length, professors: profs.length, users: users.length, pendingInvites: invites.filter(i => i.status === 'pending').length }
  } finally { loading.value = false }
})
</script>

<template>
  <div>
    <h1 class="text-[28px] font-bold tracking-tight mb-4">Dashboard</h1>
    <p v-if="loading" class="text-text-secondary text-sm">Loading…</p>
    <div v-else class="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4">
      <RouterLink v-for="s in [
        { to: '/admin/moderation', num: stats.pendingReviews, label: 'Reviews awaiting moderation' },
        { to: '/admin/professors', num: stats.professors, label: 'Professors' },
        { to: '/admin/users', num: stats.users, label: 'Users' },
        { to: '/admin/invites', num: stats.pendingInvites, label: 'Pending invites' },
      ]" :key="s.to" :to="s.to" class="rounded-[14px] border border-border bg-white p-5 no-underline text-inherit flex flex-col gap-1.5 transition-all hover:border-border-hover">
        <span class="text-[38px] font-extrabold tracking-tight leading-none text-text">{{ s.num }}</span>
        <span class="text-text-secondary text-sm">{{ s.label }}</span>
      </RouterLink>
    </div>
  </div>
</template>
