<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { adminCreateProfessor, adminDeleteProfessor, listProfessors, listSchools } from '../../services/api'

type Prof = Awaited<ReturnType<typeof listProfessors>>[number]
const professors = ref<Prof[]>([])
const schools = ref<Array<{ id: string; name: string }>>([])
const loading = ref(true)
const error = ref('')
const busyId = ref('')
const form = reactive({ schoolId: '', firstName: '', lastName: '', department: '', title: '' })
const creating = ref(false)
const formError = ref('')

async function load() {
  loading.value = true
  try { [professors.value, schools.value] = await Promise.all([listProfessors({}), listSchools()]); if (!form.schoolId && schools.value.length) form.schoolId = schools.value[0]!.id }
  catch (e) { error.value = e instanceof Error ? e.message : 'Failed' }
  finally { loading.value = false }
}

async function create() {
  formError.value = ''
  if (!form.schoolId || !form.firstName || !form.lastName || !form.department) { formError.value = 'School, name and department are required.'; return }
  creating.value = true
  try { await adminCreateProfessor({ schoolId: form.schoolId, firstName: form.firstName, lastName: form.lastName, department: form.department, ...(form.title ? { title: form.title } : {}) }); form.firstName = ''; form.lastName = ''; form.department = ''; form.title = ''; await load() }
  catch (e) { formError.value = e instanceof Error ? e.message : 'Failed' }
  finally { creating.value = false }
}

async function remove(id: string) {
  if (!confirm('Delete this professor and all their reviews?')) return
  busyId.value = id
  try { await adminDeleteProfessor(id); professors.value = professors.value.filter(p => p.id !== id) }
  catch (e) { error.value = e instanceof Error ? e.message : 'Failed' }
  finally { busyId.value = '' }
}

onMounted(load)
</script>

<template>
  <div>
    <h1 class="text-[28px] font-bold tracking-tight mb-4">Professors</h1>

    <div class="rounded-[14px] border border-border bg-white p-5 mb-5">
      <h3 class="text-sm font-semibold mb-3">Add a professor</h3>
      <form @submit.prevent="create">
        <div class="grid grid-cols-[repeat(auto-fit,minmax(130px,1fr))] gap-2.5 items-center">
          <select v-model="form.schoolId" class="py-2.5 px-3.5 border border-border rounded-[10px] text-sm bg-white"><option v-for="s in schools" :key="s.id" :value="s.id">{{ s.name }}</option></select>
          <input v-model="form.firstName" class="py-2.5 px-3.5 border border-border rounded-[10px] text-sm bg-white placeholder:text-text-tertiary" placeholder="First name" />
          <input v-model="form.lastName" class="py-2.5 px-3.5 border border-border rounded-[10px] text-sm bg-white placeholder:text-text-tertiary" placeholder="Last name" />
          <input v-model="form.department" class="py-2.5 px-3.5 border border-border rounded-[10px] text-sm bg-white placeholder:text-text-tertiary" placeholder="Department" />
          <input v-model="form.title" class="py-2.5 px-3.5 border border-border rounded-[10px] text-sm bg-white placeholder:text-text-tertiary" placeholder="Title (optional)" />
          <button class="bg-accent text-white py-2.5 px-5 rounded-[10px] text-sm font-semibold cursor-pointer transition-all hover:bg-accent-hover disabled:opacity-40" type="submit" :disabled="creating">{{ creating ? 'Adding…' : 'Add' }}</button>
        </div>
        <p v-if="formError" class="text-danger text-[13px] font-medium mt-2">{{ formError }}</p>
      </form>
    </div>

    <p v-if="loading" class="text-text-secondary text-sm">Loading…</p>
    <p v-else-if="error" class="text-danger text-[13px] font-medium">{{ error }}</p>
    <div v-else class="rounded-[14px] border border-border bg-white overflow-x-auto">
      <table class="w-full border-collapse min-w-[560px]">
        <thead><tr>
          <th class="text-left py-3 px-4 text-text-tertiary text-[11px] uppercase tracking-widest font-semibold border-b border-border">Name</th>
          <th class="text-left py-3 px-4 text-text-tertiary text-[11px] uppercase tracking-widest font-semibold border-b border-border">Department</th>
          <th class="text-left py-3 px-4 text-text-tertiary text-[11px] uppercase tracking-widest font-semibold border-b border-border">Reviews</th>
          <th class="text-left py-3 px-4 text-text-tertiary text-[11px] uppercase tracking-widest font-semibold border-b border-border">Avg quality</th>
          <th class="text-right py-3 px-4 text-text-tertiary text-[11px] uppercase tracking-widest font-semibold border-b border-border"></th>
        </tr></thead>
        <tbody>
          <tr v-for="p in professors" :key="p.id" class="border-b border-border last:border-b-0">
            <td class="py-3 px-4 text-sm">{{ p.firstName }} {{ p.lastName }}</td>
            <td class="py-3 px-4 text-sm text-text-secondary">{{ p.department }}</td>
            <td class="py-3 px-4 text-sm">{{ p.reviewCount }}</td>
            <td class="py-3 px-4 text-sm">{{ p.avgQuality?.toFixed(1) ?? '—' }}</td>
            <td class="py-3 px-4 text-right"><button class="bg-danger text-white py-1 px-2.5 rounded-lg text-[13px] font-medium cursor-pointer transition-all hover:bg-red-600 disabled:opacity-40" :disabled="busyId === p.id" @click="remove(p.id)">Delete</button></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
