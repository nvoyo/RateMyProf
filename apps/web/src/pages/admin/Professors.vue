<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { adminBulkCreateProfessors, adminCreateProfessor, adminDeleteProfessor, listProfessors, listSchools } from '../../services/api'

type Prof = Awaited<ReturnType<typeof listProfessors>>[number]
type BulkResult = Awaited<ReturnType<typeof adminBulkCreateProfessors>>
const professors = ref<Prof[]>([])
const schools = ref<Array<{ id: string; name: string }>>([])
const loading = ref(true)
const error = ref('')
const busyId = ref('')
const form = reactive({ schoolId: '', firstName: '', lastName: '', department: '', title: '' })
const creating = ref(false)
const formError = ref('')

const bulk = reactive({ schoolId: '', defaultDepartment: '', text: '' })
const importing = ref(false)
const bulkError = ref('')
const bulkResult = ref<BulkResult | null>(null)

async function load() {
  loading.value = true
  try { [professors.value, schools.value] = await Promise.all([listProfessors({}), listSchools()]); if (schools.value.length) { if (!form.schoolId) form.schoolId = schools.value[0]!.id; if (!bulk.schoolId) bulk.schoolId = schools.value[0]!.id } }
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

async function importBulk() {
  bulkError.value = ''
  bulkResult.value = null
  if (!bulk.schoolId) { bulkError.value = 'Please choose a school.'; return }
  if (!bulk.text.trim()) { bulkError.value = 'Paste at least one professor line.'; return }
  importing.value = true
  try {
    bulkResult.value = await adminBulkCreateProfessors({
      schoolId: bulk.schoolId,
      text: bulk.text,
      ...(bulk.defaultDepartment.trim() ? { defaultDepartment: bulk.defaultDepartment.trim() } : {}),
    })
    if (bulkResult.value.imported > 0) { bulk.text = ''; await load() }
  }
  catch (e) { bulkError.value = e instanceof Error ? e.message : 'Failed' }
  finally { importing.value = false }
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

    <div class="rounded-[14px] border border-border bg-white p-5 mb-5">
      <h3 class="text-sm font-semibold mb-1">Bulk import</h3>
      <p class="text-text-secondary text-[13px] mb-3">One professor per line, fields separated by comma or tab: <code class="text-text">first, last, department, title</code>. Department is optional if you set a default below. Lines starting with <code class="text-text">#</code> are ignored.</p>
      <form @submit.prevent="importBulk">
        <div class="flex flex-wrap gap-2.5 items-center mb-2.5">
          <select v-model="bulk.schoolId" class="py-2.5 px-3.5 border border-border rounded-[10px] text-sm bg-white"><option v-for="s in schools" :key="s.id" :value="s.id">{{ s.name }}</option></select>
          <input v-model="bulk.defaultDepartment" class="py-2.5 px-3.5 border border-border rounded-[10px] text-sm bg-white placeholder:text-text-tertiary flex-1 min-w-[160px]" placeholder="Default department (optional)" />
        </div>
        <textarea v-model="bulk.text" rows="6" class="w-full py-2.5 px-3.5 border border-border rounded-[10px] text-sm bg-white placeholder:text-text-tertiary font-mono resize-y" placeholder="Jane, Doe, Computer Science, Professor&#10;John, Smith, Mathematics&#10;# comment lines are skipped"></textarea>
        <div class="flex items-center gap-3 mt-2.5">
          <button class="bg-accent text-white py-2.5 px-5 rounded-[10px] text-sm font-semibold cursor-pointer transition-all hover:bg-accent-hover disabled:opacity-40" type="submit" :disabled="importing">{{ importing ? 'Importing…' : 'Import' }}</button>
          <p v-if="bulkError" class="text-danger text-[13px] font-medium">{{ bulkError }}</p>
          <p v-else-if="bulkResult" class="text-success text-[13px] font-medium">Imported {{ bulkResult.imported }}, skipped {{ bulkResult.skipped }} of {{ bulkResult.total }}.</p>
        </div>
        <div v-if="bulkResult && bulkResult.skippedRows.length" class="mt-3 rounded-[10px] border border-border bg-bg overflow-hidden">
          <table class="w-full border-collapse text-[13px]">
            <thead><tr>
              <th class="text-left py-2 px-3 text-text-tertiary text-[11px] uppercase tracking-widest font-semibold border-b border-border">Line</th>
              <th class="text-left py-2 px-3 text-text-tertiary text-[11px] uppercase tracking-widest font-semibold border-b border-border">Row</th>
              <th class="text-left py-2 px-3 text-text-tertiary text-[11px] uppercase tracking-widest font-semibold border-b border-border">Reason skipped</th>
            </tr></thead>
            <tbody>
              <tr v-for="(row, i) in bulkResult.skippedRows" :key="i" class="border-b border-border last:border-b-0">
                <td class="py-2 px-3 text-text-secondary">{{ row.line || '—' }}</td>
                <td class="py-2 px-3 font-mono">{{ row.raw }}</td>
                <td class="py-2 px-3 text-text-secondary">{{ row.reason }}</td>
              </tr>
            </tbody>
          </table>
        </div>
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
