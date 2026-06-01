<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { adminListReviews, adminModerateReview, adminListDeletionRequests, adminResolveDeletion } from '../../services/api'

type Rev = Awaited<ReturnType<typeof adminListReviews>>[number]
type Del = Awaited<ReturnType<typeof adminListDeletionRequests>>[number]
type Tab = 'pending' | 'approved' | 'rejected' | 'deletions'

const tab = ref<Tab>('pending')
const reviews = ref<Rev[]>([])
const deletions = ref<Del[]>([])
const loading = ref(false)
const error = ref('')
const busyId = ref('')

async function load() {
  loading.value = true; error.value = ''
  try { if (tab.value === 'deletions') deletions.value = await adminListDeletionRequests(); else reviews.value = await adminListReviews(tab.value) }
  catch (e) { error.value = e instanceof Error ? e.message : 'Failed' }
  finally { loading.value = false }
}

async function moderate(id: string, s: 'approved' | 'rejected') {
  busyId.value = id
  try { await adminModerateReview(id, s); reviews.value = reviews.value.filter(r => r.id !== id) }
  catch (e) { error.value = e instanceof Error ? e.message : 'Failed' }
  finally { busyId.value = '' }
}

async function resolveDeletion(id: string, action: 'confirm' | 'reject') {
  busyId.value = id
  try { await adminResolveDeletion(id, action); deletions.value = deletions.value.filter(r => r.id !== id) }
  catch (e) { error.value = e instanceof Error ? e.message : 'Failed' }
  finally { busyId.value = '' }
}

function switchTab(t: Tab) { tab.value = t; load() }
onMounted(load)
</script>

<template>
  <div>
    <h1 class="text-[28px] font-bold tracking-tight mb-4">Moderation</h1>
    <div class="flex gap-1.5 mb-5">
      <button v-for="t in ([{ key: 'pending', label: 'Pending' }, { key: 'approved', label: 'Approved' }, { key: 'rejected', label: 'Rejected' }, { key: 'deletions', label: 'Deletion requests' }] as const)" :key="t.key" class="px-3.5 py-1.5 rounded-lg text-sm font-medium border cursor-pointer transition-all" :class="tab === t.key ? 'bg-accent text-white border-accent' : 'bg-white text-text-secondary border-border hover:bg-accent-soft'" @click="switchTab(t.key)">{{ t.label }}</button>
    </div>

    <p v-if="loading" class="text-text-secondary text-sm">Loading…</p>
    <p v-else-if="error" class="text-danger text-[13px] font-medium">{{ error }}</p>

    <template v-else-if="tab === 'deletions'">
      <p v-if="!deletions.length" class="text-text-tertiary text-sm">No deletion requests.</p>
      <div v-else class="flex flex-col gap-3">
        <div v-for="r in deletions" :key="r.id" class="rounded-[14px] border border-border bg-white p-5">
          <div class="flex items-center gap-2.5 mb-1.5">
            <strong class="text-sm">{{ r.professorFirstName }} {{ r.professorLastName }}</strong>
            <span v-if="r.courseCode" class="bg-accent-soft text-text-secondary text-xs font-semibold px-2 py-0.5 rounded-md">{{ r.courseCode }}</span>
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700">deletion requested</span>
          </div>
          <p class="whitespace-pre-wrap text-sm text-text mb-3">{{ r.comment }}</p>
          <p class="text-[12px] text-text-tertiary mb-3">by {{ r.authorName }} ({{ r.authorEmail }})</p>
          <div class="flex gap-2">
            <button class="bg-danger text-white py-1.5 px-3 rounded-lg text-[13px] font-medium cursor-pointer transition-all hover:bg-red-600 disabled:opacity-40" :disabled="busyId === r.id" @click="resolveDeletion(r.id, 'confirm')">Confirm deletion</button>
            <button class="border border-border text-text py-1.5 px-3 rounded-lg text-[13px] font-medium cursor-pointer transition-all hover:bg-accent-soft disabled:opacity-40" :disabled="busyId === r.id" @click="resolveDeletion(r.id, 'reject')">Reject (restore)</button>
          </div>
        </div>
      </div>
    </template>

    <template v-else>
      <p v-if="!reviews.length" class="text-text-tertiary text-sm">Nothing here.</p>
      <div v-else class="flex flex-col gap-3">
        <div v-for="r in reviews" :key="r.id" class="rounded-[14px] border border-border bg-white p-5">
          <div class="flex items-center gap-2.5 mb-1.5">
            <strong class="text-sm">{{ r.professorFirstName }} {{ r.professorLastName }}</strong>
            <span v-if="r.courseCode" class="bg-accent-soft text-text-secondary text-xs font-semibold px-2 py-0.5 rounded-md">{{ r.courseCode }}</span>
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold" :class="{ 'bg-yellow-50 text-yellow-800': r.status==='pending', 'bg-green-50 text-green-700': r.status==='approved', 'bg-red-50 text-red-700': r.status==='rejected' }">{{ r.status }}</span>
          </div>
          <p class="text-[13px] text-text-secondary mb-1">Quality {{ r.qualityRating }}/5 · Difficulty {{ r.difficultyRating }}/5<template v-if="r.wouldTakeAgain"> · would take again</template><template v-if="r.grade"> · grade {{ r.grade }}</template></p>
          <p class="whitespace-pre-wrap text-sm text-text mb-2">{{ r.comment }}</p>
          <p class="text-[12px] text-text-tertiary mb-3">by {{ r.authorName }} ({{ r.authorEmail }})</p>
          <div v-if="tab === 'pending'" class="flex gap-2">
            <button class="bg-success text-white py-1.5 px-3 rounded-lg text-[13px] font-medium cursor-pointer transition-all hover:bg-green-600 disabled:opacity-40" :disabled="busyId === r.id" @click="moderate(r.id, 'approved')">Approve</button>
            <button class="bg-danger text-white py-1.5 px-3 rounded-lg text-[13px] font-medium cursor-pointer transition-all hover:bg-red-600 disabled:opacity-40" :disabled="busyId === r.id" @click="moderate(r.id, 'rejected')">Reject</button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
