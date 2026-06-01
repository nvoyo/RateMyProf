<script setup lang="ts">
import { RouterLink } from 'vue-router'
import StarRating from './StarRating.vue'

defineProps<{
  professor: {
    id: string
    firstName: string
    lastName: string
    department: string
    title: string | null
    avgQuality: number | null
    avgDifficulty: number | null
    reviewCount: number
    wouldTakeAgainPercent: number | null
  }
}>()
</script>

<template>
  <RouterLink
    :to="`/professors/${professor.id}`"
    class="flex items-center gap-5 rounded-[14px] border border-zinc-200 bg-white p-5 no-underline text-inherit transition-all hover:border-zinc-300 hover:shadow-sm group"
  >
    <div class="flex flex-col items-center min-w-[64px] shrink-0">
      <span class="text-[32px] font-extrabold tracking-tight leading-none text-zinc-900">
        {{ professor.avgQuality?.toFixed(1) ?? '—' }}
      </span>
      <span class="mt-1 text-[11px] uppercase tracking-widest text-zinc-400 font-semibold">quality</span>
    </div>

    <div class="flex-1 min-w-0">
      <h3 class="text-base font-bold text-zinc-900 mb-0.5">{{ professor.firstName }} {{ professor.lastName }}</h3>
      <p class="text-[13px] text-zinc-500 mb-2">
        {{ professor.title ? professor.title + ', ' : '' }}{{ professor.department }}
      </p>
      <div class="flex items-center gap-2 flex-wrap text-[13px]">
        <StarRating :value="professor.avgQuality" />
        <span class="text-zinc-300">·</span>
        <span class="text-zinc-400">{{ professor.reviewCount }} review{{ professor.reviewCount !== 1 ? 's' : '' }}</span>
        <template v-if="professor.wouldTakeAgainPercent !== null">
          <span class="text-zinc-300">·</span>
          <span class="text-zinc-400">{{ professor.wouldTakeAgainPercent }}% would take again</span>
        </template>
      </div>
    </div>

    <svg class="w-5 h-5 text-zinc-300 shrink-0 transition-all group-hover:translate-x-0.5 group-hover:text-zinc-600" viewBox="0 0 20 20" fill="currentColor">
      <path fill-rule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clip-rule="evenodd" />
    </svg>
  </RouterLink>
</template>
