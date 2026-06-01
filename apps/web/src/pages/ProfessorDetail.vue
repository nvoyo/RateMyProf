<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import StarRating from '../components/StarRating.vue'
import ReviewCard from '../components/ReviewCard.vue'
import { getProfessor, getMyReview, listProfessorReviews, requestReviewDeletion } from '../services/api'
import { useAuthStore } from '../stores/auth'

type Prof = Awaited<ReturnType<typeof getProfessor>>
type Rev = Awaited<ReturnType<typeof listProfessorReviews>>[number]
type Mine = Awaited<ReturnType<typeof getMyReview>>

const route = useRoute()
const auth = useAuthStore()
const id = route.params.id as string
const professor = ref<Prof | null>(null)
const reviews = ref<Rev[]>([])
const myReview = ref<Mine>(null)
const loading = ref(true)
const error = ref('')
const deleting = ref(false)
type ReviewSort = 'newest' | 'oldest' | 'highest' | 'lowest'
const reviewSort = ref<ReviewSort>('newest')

const statusLabel: Record<string, string> = { pending: 'pending', approved: 'published', rejected: 'rejected' }

const sortedReviews = computed(() => {
  const list = [...reviews.value]
  switch (reviewSort.value) {
    case 'oldest': return list.reverse()
    case 'highest': return list.sort((a, b) => b.qualityRating - a.qualityRating)
    case 'lowest': return list.sort((a, b) => a.qualityRating - b.qualityRating)
    default: return list // newest = API default order
  }
})

async function loadMine() {
  if (!auth.isAuthenticated) { myReview.value = null; return }
  try { myReview.value = await getMyReview(id) } catch { myReview.value = null }
}

async function requestDelete() {
  if (!myReview.value) return
  if (!confirm('Request deletion? Hidden immediately, removed after admin confirms.')) return
  deleting.value = true
  try { await requestReviewDeletion(myReview.value.id); await loadMine() }
  catch (e) { error.value = e instanceof Error ? e.message : 'Failed' }
  finally { deleting.value = false }
}

onMounted(async () => {
  try {
    const [prof, revs] = await Promise.all([getProfessor(id), listProfessorReviews(id)])
    professor.value = prof; reviews.value = revs; await loadMine()
  } catch (e) { error.value = e instanceof Error ? e.message : 'Failed to load' }
  finally { loading.value = false }
})
</script>

<template>
  <section>
    <p v-if="loading" class="text-center py-10 text-text-tertiary text-sm">Loading…</p>
    <p v-else-if="error" class="text-danger text-[13px] font-medium">{{ error }}</p>

    <template v-else-if="professor">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-7">
        <div class="flex items-center gap-4">
          <div class="w-14 h-14 bg-accent-soft border border-border rounded-[14px] flex items-center justify-center text-lg font-extrabold text-text-secondary tracking-tight shrink-0">
            {{ professor.firstName[0] }}{{ professor.lastName[0] }}
          </div>
          <div class="min-w-0">
            <h1 class="text-xl sm:text-2xl font-bold mb-0.5 break-words">{{ professor.firstName }} {{ professor.lastName }}</h1>
            <p class="text-text-secondary text-sm">
              {{ professor.title ? professor.title + ', ' : '' }}{{ professor.department }}
              <template v-if="professor.school"> · {{ professor.school.name }}</template>
            </p>
          </div>
        </div>
        <RouterLink v-if="!myReview" :to="`/professors/${professor.id}/review`" class="shrink-0 inline-flex justify-center bg-accent text-white py-2.5 px-5 rounded-[10px] text-sm font-semibold no-underline transition-all hover:bg-accent-hover hover:-translate-y-px">Write a review</RouterLink>
      </div>

      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-7">
        <div class="text-center p-4 rounded-[14px] border border-border bg-white">
          <span class="block text-[28px] font-extrabold tracking-tight leading-none text-text">{{ professor.avgQuality?.toFixed(1) ?? '—' }}</span>
          <span class="block text-[11px] uppercase tracking-widest text-text-tertiary font-semibold mt-1.5">Quality</span>
        </div>
        <div class="text-center p-4 rounded-[14px] border border-border bg-white">
          <span class="block text-[28px] font-extrabold tracking-tight leading-none text-text">{{ professor.avgDifficulty?.toFixed(1) ?? '—' }}</span>
          <span class="block text-[11px] uppercase tracking-widest text-text-tertiary font-semibold mt-1.5">Difficulty</span>
        </div>
        <div class="text-center p-4 rounded-[14px] border border-border bg-white">
          <span class="block text-[28px] font-extrabold tracking-tight leading-none text-text">{{ professor.wouldTakeAgainPercent !== null ? professor.wouldTakeAgainPercent + '%' : '—' }}</span>
          <span class="block text-[11px] uppercase tracking-widest text-text-tertiary font-semibold mt-1.5">Would take again</span>
        </div>
        <div class="text-center p-4 rounded-[14px] border border-border bg-white">
          <span class="block text-[28px] font-extrabold tracking-tight leading-none text-text">{{ professor.reviewCount }}</span>
          <span class="block text-[11px] uppercase tracking-widest text-text-tertiary font-semibold mt-1.5">Reviews</span>
        </div>
      </div>

      <!-- My review -->
      <div v-if="myReview" class="rounded-[14px] border border-border-hover bg-white p-5 mb-6">
        <div class="flex items-center gap-2.5 mb-1.5">
          <strong class="text-sm">Your review</strong>
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold" :class="{ 'bg-yellow-50 text-yellow-800': myReview.status==='pending', 'bg-green-50 text-green-700': myReview.status==='approved', 'bg-red-50 text-red-700': myReview.status==='rejected' }">{{ statusLabel[myReview.status] ?? myReview.status }}</span>
          <span v-if="myReview.deletionRequested" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700">deletion requested</span>
        </div>
        <p class="text-[13px] text-text-secondary mb-1">Quality {{ myReview.qualityRating }}/5 · Difficulty {{ myReview.difficultyRating }}/5</p>
        <p class="whitespace-pre-wrap text-sm text-text mb-3">{{ myReview.comment }}</p>
        <div v-if="!myReview.deletionRequested" class="flex gap-2">
          <RouterLink :to="`/professors/${professor.id}/review`" class="inline-flex items-center border border-border text-text py-1.5 px-3 rounded-lg text-[13px] font-medium no-underline transition-all hover:bg-accent-soft">Edit</RouterLink>
          <button class="inline-flex items-center bg-danger text-white py-1.5 px-3 rounded-lg text-[13px] font-medium cursor-pointer transition-all hover:bg-red-600 disabled:opacity-40" :disabled="deleting" @click="requestDelete">Delete</button>
        </div>
        <p v-else class="text-[13px] text-text-tertiary">Deletion request pending admin confirmation.</p>
      </div>

      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <h2 class="text-lg font-bold">Reviews</h2>
        <div v-if="reviews.length > 1" class="flex gap-1 flex-wrap">
          <button
            v-for="opt in ([{ key: 'newest', label: 'Newest' }, { key: 'oldest', label: 'Oldest' }, { key: 'highest', label: 'Highest' }, { key: 'lowest', label: 'Lowest' }] as const)"
            :key="opt.key"
            class="px-3 py-1.5 rounded-lg text-[13px] font-medium border cursor-pointer transition-all"
            :class="reviewSort === opt.key ? 'bg-accent text-white border-accent' : 'bg-white text-text-secondary border-border hover:bg-accent-soft hover:border-border-hover'"
            @click="reviewSort = opt.key"
          >{{ opt.label }}</button>
        </div>
      </div>
      <p v-if="!reviews.length" class="text-center py-10 text-text-tertiary text-sm">No reviews yet. Be the first!</p>
      <div v-else class="flex flex-col gap-2.5">
        <ReviewCard v-for="r in sortedReviews" :key="r.id" :review="r" />
      </div>
    </template>
  </section>
</template>
