<script setup lang="ts">
import { ref } from 'vue'
import StarRating from './StarRating.vue'
import { useAuthStore } from '../stores/auth'
import { voteReview } from '../services/api'

const props = defineProps<{
  review: {
    id: string
    courseCode: string | null
    qualityRating: number
    difficultyRating: number
    wouldTakeAgain: boolean
    grade: string | null
    comment: string
    createdAt: string | Date
    authorName: string | null
    score: number
    tags: string[]
  }
}>()

const auth = useAuthStore()
const score = ref(props.review.score)
const voting = ref(false)

async function cast(value: 1 | -1) {
  voting.value = true
  try { const r = await voteReview(props.review.id, value); score.value = r.score }
  catch { /* ignore */ }
  finally { voting.value = false }
}

function fmt(d: string | Date) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
</script>

<template>
  <div class="flex gap-4 rounded-[14px] border border-zinc-200 bg-white p-5">
    <div class="flex flex-col gap-1.5 shrink-0">
      <div class="flex flex-col items-center px-2.5 py-2 bg-zinc-100 rounded-[10px] min-w-[52px]">
        <span class="text-xl font-extrabold tracking-tight leading-none text-zinc-900">{{ review.qualityRating }}</span>
        <span class="text-[10px] uppercase tracking-widest text-zinc-400 font-semibold mt-0.5">Q</span>
      </div>
      <div class="flex flex-col items-center px-2.5 py-2 bg-yellow-50 rounded-[10px] min-w-[52px]">
        <span class="text-xl font-extrabold tracking-tight leading-none text-yellow-800">{{ review.difficultyRating }}</span>
        <span class="text-[10px] uppercase tracking-widest text-zinc-400 font-semibold mt-0.5">D</span>
      </div>
    </div>

    <div class="flex-1 min-w-0">
      <div class="flex items-center gap-2.5 mb-2">
        <span v-if="review.courseCode" class="bg-zinc-900 text-white text-[11px] font-semibold px-2 py-0.5 rounded-md">{{ review.courseCode }}</span>
        <StarRating :value="review.qualityRating" />
        <span class="ml-auto text-xs text-zinc-400">{{ fmt(review.createdAt) }}</span>
      </div>

      <p class="whitespace-pre-wrap text-sm leading-relaxed text-zinc-800 mb-2.5">{{ review.comment }}</p>

      <div v-if="review.tags.length" class="flex gap-1.5 flex-wrap mb-2.5">
        <span v-for="t in review.tags" :key="t" class="bg-zinc-100 text-zinc-500 text-xs font-medium px-2.5 py-0.5 rounded-full">{{ t }}</span>
      </div>

      <div class="flex items-center justify-between text-[13px]">
        <span class="text-zinc-400">
          {{ review.authorName ?? 'Anonymous' }}
          <template v-if="review.wouldTakeAgain"> · would take again</template>
          <template v-if="review.grade"> · {{ review.grade }}</template>
        </span>
        <div class="flex items-center gap-1.5">
          <button
            class="w-7 h-7 flex items-center justify-center border border-zinc-200 bg-white rounded-lg cursor-pointer text-zinc-400 text-sm font-semibold transition-all hover:border-zinc-900 hover:text-zinc-900 hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed"
            :disabled="!auth.isAuthenticated || voting"
            @click="cast(1)"
          >+</button>
          <span class="font-bold text-[13px] min-w-[16px] text-center text-zinc-900">{{ score }}</span>
          <button
            class="w-7 h-7 flex items-center justify-center border border-zinc-200 bg-white rounded-lg cursor-pointer text-zinc-400 text-sm font-semibold transition-all hover:border-zinc-900 hover:text-zinc-900 hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed"
            :disabled="!auth.isAuthenticated || voting"
            @click="cast(-1)"
          >−</button>
        </div>
      </div>
    </div>
  </div>
</template>
