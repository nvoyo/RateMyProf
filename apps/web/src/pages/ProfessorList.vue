<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ProfessorCard from '../components/ProfessorCard.vue'
import { listProfessors, listSchools } from '../services/api'

type Prof = Awaited<ReturnType<typeof listProfessors>>[number]
type SortKey = 'name' | 'quality' | 'difficulty' | 'reviews'
type SortDir = 'asc' | 'desc'

const route = useRoute()
const router = useRouter()
const schools = ref<Array<{ id: string; name: string }>>([])
const professors = ref<Prof[]>([])
const loading = ref(false)
const error = ref('')
const sort = ref<SortKey>('name')
const dir = ref<SortDir>('asc')

const filters = reactive({
  schoolId: (route.query.schoolId as string) || '',
  q: (route.query.q as string) || '',
  department: (route.query.department as string) || '',
})

function toggleDir() { dir.value = dir.value === 'asc' ? 'desc' : 'asc' }

function setSort(key: SortKey) {
  if (sort.value === key) { toggleDir(); return }
  sort.value = key
  // Default directions: name=asc, numeric=desc
  dir.value = key === 'name' ? 'asc' : 'desc'
}

const sorted = computed(() => {
  const list = [...professors.value]
  const mul = dir.value === 'asc' ? 1 : -1
  switch (sort.value) {
    case 'name': return list.sort((a, b) => mul * a.lastName.localeCompare(b.lastName))
    case 'quality': return list.sort((a, b) => mul * ((b.avgQuality ?? 0) - (a.avgQuality ?? 0)))
    case 'difficulty': return list.sort((a, b) => mul * ((b.avgDifficulty ?? 0) - (a.avgDifficulty ?? 0)))
    case 'reviews': return list.sort((a, b) => mul * (b.reviewCount - a.reviewCount))
    default: return list
  }
})

async function load() {
  loading.value = true; error.value = ''
  try {
    professors.value = await listProfessors({
      ...(filters.schoolId ? { schoolId: filters.schoolId } : {}),
      ...(filters.q ? { q: filters.q } : {}),
      ...(filters.department ? { department: filters.department } : {}),
    })
  } catch (e) { error.value = e instanceof Error ? e.message : 'Failed to load' }
  finally { loading.value = false }
}

function applyFilters() {
  router.replace({ name: 'professors', query: { ...(filters.schoolId ? { schoolId: filters.schoolId } : {}), ...(filters.q ? { q: filters.q } : {}), ...(filters.department ? { department: filters.department } : {}) } })
}

watch(() => route.query, load)
onMounted(async () => { schools.value = await listSchools(); await load() })
</script>

<template>
  <section>
    <div class="mb-6">
      <h1 class="text-[28px] font-bold tracking-tight mb-1">Professors</h1>
      <p class="text-text-secondary text-sm">Browse and search across all departments.</p>
    </div>

    <form class="flex gap-2 mb-5 flex-wrap items-center" @submit.prevent="applyFilters">
      <input v-model="filters.q" class="flex-1 min-w-[140px] py-2.5 px-3.5 border border-border rounded-[10px] text-sm bg-white transition-all focus:outline-none focus:border-accent focus:ring-[3px] focus:ring-accent/10 placeholder:text-text-tertiary" placeholder="Search name…" />
      <input v-model="filters.department" class="flex-1 min-w-[140px] py-2.5 px-3.5 border border-border rounded-[10px] text-sm bg-white transition-all focus:outline-none focus:border-accent focus:ring-[3px] focus:ring-accent/10 placeholder:text-text-tertiary" placeholder="Department…" />
      <select v-model="filters.schoolId" class="py-2.5 px-3.5 border border-border rounded-[10px] text-sm text-text-secondary bg-white transition-all focus:outline-none focus:border-accent">
        <option value="">All schools</option>
        <option v-for="s in schools" :key="s.id" :value="s.id">{{ s.name }}</option>
      </select>
      <button class="bg-accent text-white py-2.5 px-5 rounded-[10px] text-sm font-semibold cursor-pointer transition-all hover:bg-accent-hover" type="submit">Filter</button>
    </form>

    <!-- Sort tabs -->
    <div class="flex gap-1 mb-5 flex-wrap">
      <button
        v-for="opt in ([{ key: 'name', label: 'Name' }, { key: 'quality', label: 'Quality' }, { key: 'difficulty', label: 'Difficulty' }, { key: 'reviews', label: 'Reviews' }] as const)"
        :key="opt.key"
        class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[13px] font-medium border cursor-pointer transition-all"
        :class="sort === opt.key ? 'bg-accent text-white border-accent' : 'bg-white text-text-secondary border-border hover:bg-accent-soft hover:border-border-hover'"
        @click="setSort(opt.key)"
      >
        {{ opt.label }}
        <span v-if="sort === opt.key" class="text-[10px]">{{ dir === 'asc' ? '↑' : '↓' }}</span>
      </button>
    </div>

    <p v-if="loading" class="text-center py-10 text-text-tertiary text-sm">Loading…</p>
    <p v-else-if="error" class="text-danger text-[13px] font-medium">{{ error }}</p>
    <p v-else-if="!sorted.length" class="text-center py-10 text-text-tertiary text-sm">No professors found.</p>

    <div v-else class="flex flex-col gap-2">
      <ProfessorCard v-for="p in sorted" :key="p.id" :professor="p" />
    </div>
  </section>
</template>
