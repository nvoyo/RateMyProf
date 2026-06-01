<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { adminListUsers, adminUpdateUser, adminChangePassword } from '../../services/api'
import { useAuthStore } from '../../stores/auth'

type User = Awaited<ReturnType<typeof adminListUsers>>[number]
const auth = useAuthStore()
const users = ref<User[]>([])
const loading = ref(true)
const error = ref('')
const success = ref('')
const busyId = ref('')
const pwTarget = ref<User | null>(null)
const pwValue = ref('')
const pwBusy = ref(false)

async function load() {
  loading.value = true
  try { users.value = await adminListUsers() }
  catch (e) { error.value = e instanceof Error ? e.message : 'Failed' }
  finally { loading.value = false }
}

async function toggleStatus(u: User) {
  busyId.value = u.id; error.value = ''
  try { const updated = await adminUpdateUser(u.id, { status: u.status === 'active' ? 'disabled' : 'active' }); Object.assign(u, updated) }
  catch (e) { error.value = e instanceof Error ? e.message : 'Failed' }
  finally { busyId.value = '' }
}

async function toggleRole(u: User) {
  busyId.value = u.id; error.value = ''
  try { const updated = await adminUpdateUser(u.id, { role: u.role === 'admin' ? 'student' : 'admin' }); Object.assign(u, updated) }
  catch (e) { error.value = e instanceof Error ? e.message : 'Failed' }
  finally { busyId.value = '' }
}

function openPw(u: User) { pwTarget.value = u; pwValue.value = ''; error.value = ''; success.value = '' }
function closePw() { pwTarget.value = null; pwValue.value = '' }

async function changePw() {
  if (!pwTarget.value) return; error.value = ''; success.value = ''
  if (pwValue.value.length < 8) { error.value = 'Password must be at least 8 characters.'; return }
  pwBusy.value = true
  try { await adminChangePassword(pwTarget.value.id, pwValue.value); success.value = `Password updated for ${pwTarget.value.email}.`; closePw() }
  catch (e) { error.value = e instanceof Error ? e.message : 'Failed' }
  finally { pwBusy.value = false }
}

onMounted(load)
</script>

<template>
  <div>
    <h1 class="text-[28px] font-bold tracking-tight mb-4">Users</h1>
    <p v-if="loading" class="text-text-secondary text-sm">Loading…</p>
    <p v-else-if="error" class="text-danger text-[13px] font-medium">{{ error }}</p>
    <p v-else-if="success" class="text-success text-[13px] font-medium">{{ success }}</p>
    <div v-else class="rounded-[14px] border border-border bg-white overflow-x-auto">
      <table class="w-full border-collapse min-w-[640px]">
        <thead><tr>
          <th class="text-left py-3 px-4 text-text-tertiary text-[11px] uppercase tracking-widest font-semibold border-b border-border">Name</th>
          <th class="text-left py-3 px-4 text-text-tertiary text-[11px] uppercase tracking-widest font-semibold border-b border-border">Email</th>
          <th class="text-left py-3 px-4 text-text-tertiary text-[11px] uppercase tracking-widest font-semibold border-b border-border">Role</th>
          <th class="text-left py-3 px-4 text-text-tertiary text-[11px] uppercase tracking-widest font-semibold border-b border-border">Status</th>
          <th class="text-right py-3 px-4 text-text-tertiary text-[11px] uppercase tracking-widest font-semibold border-b border-border"></th>
        </tr></thead>
        <tbody>
          <tr v-for="u in users" :key="u.id" class="border-b border-border last:border-b-0">
            <td class="py-3 px-4 text-sm">{{ u.displayName }}</td>
            <td class="py-3 px-4 text-sm text-text-secondary">{{ u.email }}</td>
            <td class="py-3 px-4"><span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold" :class="{ 'bg-zinc-100 text-zinc-800': u.role==='owner', 'bg-green-50 text-green-700': u.role==='admin', 'bg-yellow-50 text-yellow-800': u.role==='student' }">{{ u.role }}</span></td>
            <td class="py-3 px-4"><span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold" :class="u.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'">{{ u.status }}</span></td>
            <td class="py-3 px-4 text-right">
              <template v-if="u.role === 'owner'"><span class="text-text-tertiary text-[13px]">Owner</span></template>
              <template v-else-if="u.id === auth.user?.id"><span class="text-text-tertiary text-[13px]">You</span></template>
              <template v-else>
                <div class="flex gap-1.5 justify-end flex-wrap">
                  <button class="border border-border text-text-secondary py-1 px-2.5 rounded-lg text-[13px] font-medium cursor-pointer transition-all hover:bg-accent-soft disabled:opacity-40" :disabled="busyId === u.id" @click="openPw(u)">Password</button>
                  <button class="border border-border text-text-secondary py-1 px-2.5 rounded-lg text-[13px] font-medium cursor-pointer transition-all hover:bg-accent-soft disabled:opacity-40" :disabled="busyId === u.id" @click="toggleRole(u)">{{ u.role === 'admin' ? 'Make student' : 'Make admin' }}</button>
                  <button class="py-1 px-2.5 rounded-lg text-[13px] font-medium cursor-pointer transition-all disabled:opacity-40" :class="u.status === 'active' ? 'bg-danger text-white hover:bg-red-600' : 'bg-success text-white hover:bg-green-600'" :disabled="busyId === u.id" @click="toggleStatus(u)">{{ u.status === 'active' ? 'Disable' : 'Enable' }}</button>
                </div>
              </template>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Inline password change -->
    <div v-if="pwTarget" class="rounded-[14px] border border-border bg-white p-5 mt-5 max-w-lg">
      <h3 class="text-sm font-semibold mb-3">Change password for {{ pwTarget.email }}</h3>
      <div class="flex flex-col sm:flex-row gap-2 sm:items-center">
        <input v-model="pwValue" type="password" class="flex-1 py-2.5 px-3.5 border border-border rounded-[10px] text-sm bg-white placeholder:text-text-tertiary" placeholder="New password (min 8 chars)" @keyup.enter="changePw" />
        <button class="bg-accent text-white py-2 px-3.5 rounded-lg text-[13px] font-medium cursor-pointer transition-all hover:bg-accent-hover disabled:opacity-40" :disabled="pwBusy" @click="changePw">{{ pwBusy ? 'Saving…' : 'Save' }}</button>
        <button class="border border-border text-text-secondary py-2 px-3.5 rounded-lg text-[13px] font-medium cursor-pointer transition-all hover:bg-accent-soft" @click="closePw">Cancel</button>
      </div>
    </div>
  </div>
</template>
