<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { listSchools } from '../services/api'

const router = useRouter()
const schools = ref<Array<{ id: string; name: string }>>([])
const selectedSchool = ref('')
const query = ref('')
const loading = ref(true)

onMounted(async () => {
  try {
    schools.value = await listSchools()
    if (schools.value.length === 1) selectedSchool.value = schools.value[0]!.id
  } finally { loading.value = false }
})

function search() {
  router.push({
    name: 'professors',
    query: {
      ...(selectedSchool.value ? { schoolId: selectedSchool.value } : {}),
      ...(query.value ? { q: query.value } : {}),
    },
  })
}
</script>

<template>
  <section class="text-center pt-10 sm:pt-20 pb-10">
    <div class="inline-block px-3.5 py-1.5 bg-accent-soft border border-border rounded-full text-xs font-semibold text-text-secondary uppercase tracking-wider mb-6">
      Campus professor reviews
    </div>
    <h1 class="text-[clamp(36px,6vw,56px)] font-extrabold tracking-tight leading-[1.1] mb-5">
      Know your professor<br />
      <span class="text-text-tertiary">before the first class.</span>
    </h1>
    <p class="max-w-md mx-auto text-text-secondary text-base leading-relaxed mb-10">
      Real reviews from real students. Search by name, filter by department, and find the professor that fits you.
    </p>

    <form class="flex flex-col sm:flex-row gap-2 max-w-xl mx-auto" @submit.prevent="search">
      <div class="flex-1 relative">
        <svg class="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-text-tertiary pointer-events-none" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clip-rule="evenodd" />
        </svg>
        <input v-model="query" class="w-full py-3 pl-11 pr-3.5 border border-border rounded-[10px] text-[15px] bg-white transition-all focus:outline-none focus:border-accent focus:ring-[3px] focus:ring-accent/10 placeholder:text-text-tertiary" placeholder="Search professor name…" />
      </div>
      <select v-model="selectedSchool" class="py-3 px-3.5 border border-border rounded-[10px] text-sm text-text-secondary sm:min-w-[150px] bg-white transition-all focus:outline-none focus:border-accent">
        <option value="">All schools</option>
        <option v-for="s in schools" :key="s.id" :value="s.id">{{ s.name }}</option>
      </select>
      <button class="bg-accent text-white py-3 px-6 rounded-[10px] text-sm font-semibold cursor-pointer transition-all hover:bg-accent-hover hover:-translate-y-px whitespace-nowrap" type="submit">Search</button>
    </form>

    <p v-if="loading" class="mt-5 text-text-tertiary text-[13px]">Loading schools…</p>
    <p v-else-if="!schools.length" class="mt-5 text-text-tertiary text-[13px]">No schools configured yet.</p>
  </section>
</template>
