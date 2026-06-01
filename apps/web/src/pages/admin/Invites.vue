<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { adminCreateInvite, adminListInvites, adminRevokeInvite, listSchools } from '../../services/api'

type Inv = Awaited<ReturnType<typeof adminListInvites>>[number]
const invites = ref<Inv[]>([])
const schools = ref<Array<{ id: string; name: string }>>([])
const loading = ref(true)
const error = ref('')
const busyId = ref('')
const form = reactive({ email: '', schoolId: '' })
const creating = ref(false)
const formError = ref('')
const notice = ref('')

async function load() {
  loading.value = true
  try { [invites.value, schools.value] = await Promise.all([adminListInvites(), listSchools()]); if (!form.schoolId && schools.value.length) form.schoolId = schools.value[0]!.id }
  catch (e) { error.value = e instanceof Error ? e.message : 'Failed' }
  finally { loading.value = false }
}

async function create() {
  formError.value = ''; notice.value = ''
  if (!form.email || !form.schoolId) { formError.value = 'Email and school are required.'; return }
  creating.value = true
  try { const r = await adminCreateInvite({ email: form.email, schoolId: form.schoolId }); notice.value = r.emailDelivered ? `Invite emailed to ${r.email}.` : `Invite created for ${r.email}, but email delivery failed.`; form.email = ''; await load() }
  catch (e) { formError.value = e instanceof Error ? e.message : 'Failed' }
  finally { creating.value = false }
}

async function revoke(id: string) {
  busyId.value = id
  try { await adminRevokeInvite(id); await load() }
  catch (e) { error.value = e instanceof Error ? e.message : 'Failed' }
  finally { busyId.value = '' }
}

function fmt(d: string | Date) { return new Date(d).toLocaleDateString() }
onMounted(load)
</script>

<template>
  <div>
    <h1 class="text-[28px] font-bold tracking-tight mb-1">Invites</h1>
    <p class="text-text-secondary text-sm mb-5">Whitelist students by email. Only invited people can register.</p>

    <div class="rounded-[14px] border border-border bg-white p-5 mb-5">
      <form @submit.prevent="create">
        <div class="grid grid-cols-1 sm:grid-cols-[2fr_1fr_auto] gap-2.5">
          <input v-model="form.email" type="email" class="py-2.5 px-3.5 border border-border rounded-[10px] text-sm bg-white placeholder:text-text-tertiary" placeholder="student@example.com" />
          <select v-model="form.schoolId" class="py-2.5 px-3.5 border border-border rounded-[10px] text-sm bg-white"><option v-for="s in schools" :key="s.id" :value="s.id">{{ s.name }}</option></select>
          <button class="bg-accent text-white py-2.5 px-5 rounded-[10px] text-sm font-semibold cursor-pointer transition-all hover:bg-accent-hover disabled:opacity-40" type="submit" :disabled="creating">{{ creating ? 'Sending…' : 'Send invite' }}</button>
        </div>
        <p v-if="formError" class="text-danger text-[13px] font-medium mt-2">{{ formError }}</p>
        <p v-if="notice" class="text-success text-[13px] font-medium mt-2">{{ notice }}</p>
      </form>
    </div>

    <p v-if="loading" class="text-text-secondary text-sm">Loading…</p>
    <p v-else-if="error" class="text-danger text-[13px] font-medium">{{ error }}</p>
    <div v-else class="rounded-[14px] border border-border bg-white overflow-x-auto">
      <table class="w-full border-collapse min-w-[560px]">
        <thead><tr>
          <th class="text-left py-3 px-4 text-text-tertiary text-[11px] uppercase tracking-widest font-semibold border-b border-border">Email</th>
          <th class="text-left py-3 px-4 text-text-tertiary text-[11px] uppercase tracking-widest font-semibold border-b border-border">School</th>
          <th class="text-left py-3 px-4 text-text-tertiary text-[11px] uppercase tracking-widest font-semibold border-b border-border">Status</th>
          <th class="text-left py-3 px-4 text-text-tertiary text-[11px] uppercase tracking-widest font-semibold border-b border-border">Expires</th>
          <th class="text-right py-3 px-4 text-text-tertiary text-[11px] uppercase tracking-widest font-semibold border-b border-border"></th>
        </tr></thead>
        <tbody>
          <tr v-for="i in invites" :key="i.id" class="border-b border-border last:border-b-0">
            <td class="py-3 px-4 text-sm">{{ i.email }}</td>
            <td class="py-3 px-4 text-sm text-text-secondary">{{ i.schoolName }}</td>
            <td class="py-3 px-4"><span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold" :class="{ 'bg-yellow-50 text-yellow-800': i.status==='pending', 'bg-green-50 text-green-700': i.status==='accepted', 'bg-red-50 text-red-700': i.status==='revoked' }">{{ i.status }}</span></td>
            <td class="py-3 px-4 text-sm text-text-secondary">{{ fmt(i.expiresAt) }}</td>
            <td class="py-3 px-4 text-right"><button v-if="i.status === 'pending'" class="border border-border text-text-secondary py-1 px-2.5 rounded-lg text-[13px] font-medium cursor-pointer transition-all hover:bg-accent-soft disabled:opacity-40" :disabled="busyId === i.id" @click="revoke(i.id)">Revoke</button></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
