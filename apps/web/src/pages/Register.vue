<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import 'cap-widget'
import { register, verifyInvite } from '../services/api'
import { API_ORIGIN } from '../lib/eden'

const route = useRoute()
const router = useRouter()
const token = ref((route.query.token as string) || '')
const invite = ref<{ email: string; schoolName: string } | null>(null)
const verifying = ref(true)
const verifyError = ref('')
const form = reactive({ displayName: '', password: '' })
const error = ref('')
const submitting = ref(false)
const capToken = ref('')

function onSolve(e: CustomEvent<{ token: string }>) { capToken.value = e.detail.token }

onMounted(async () => {
  if (!token.value) { verifyError.value = 'No invite token provided.'; verifying.value = false; return }
  try { const r = await verifyInvite(token.value); invite.value = { email: r.email, schoolName: r.schoolName } }
  catch (e) { verifyError.value = e instanceof Error ? e.message : 'Invalid invite' }
  finally { verifying.value = false }
})

async function submit() {
  error.value = ''
  if (!capToken.value) { error.value = 'Please complete the verification.'; return }
  if (form.password.length < 8) { error.value = 'Password must be at least 8 characters.'; return }
  submitting.value = true
  try { await register({ token: token.value, password: form.password, displayName: form.displayName, capToken: capToken.value }); router.push({ name: 'login' }) }
  catch (e) { error.value = e instanceof Error ? e.message : 'Registration failed' }
  finally { submitting.value = false }
}
</script>

<template>
  <div class="flex justify-center pt-16">
    <div class="max-w-[380px] w-full">
      <div class="text-center mb-8">
        <div class="mb-5"><span class="inline-flex items-center justify-center w-11 h-11 bg-text text-white rounded-xl text-xl font-extrabold">R</span></div>
        <h1 class="text-2xl font-bold mb-1.5">Complete registration</h1>
        <p v-if="verifying" class="text-text-secondary text-sm">Verifying your invite…</p>
        <p v-else-if="verifyError" class="text-danger text-[13px] font-medium">{{ verifyError }}</p>
        <p v-else class="text-text-secondary text-sm">Joining <strong>{{ invite?.schoolName }}</strong> as <strong>{{ invite?.email }}</strong></p>
      </div>
      <form v-if="!verifying && !verifyError" @submit.prevent="submit">
        <div class="mb-4">
          <label class="block text-[13px] font-semibold text-text mb-1.5">Display name</label>
          <input v-model="form.displayName" class="w-full py-2.5 px-3.5 border border-border rounded-[10px] text-sm bg-white transition-all focus:outline-none focus:border-accent focus:ring-[3px] focus:ring-accent/10 placeholder:text-text-tertiary" placeholder="Jane Student" required />
        </div>
        <div class="mb-4">
          <label class="block text-[13px] font-semibold text-text mb-1.5">Password</label>
          <input v-model="form.password" type="password" class="w-full py-2.5 px-3.5 border border-border rounded-[10px] text-sm bg-white transition-all focus:outline-none focus:border-accent focus:ring-[3px] focus:ring-accent/10 placeholder:text-text-tertiary" placeholder="At least 8 characters" required />
        </div>
        <div class="flex justify-center mb-4">
          <cap-widget :data-cap-api-endpoint="`${API_ORIGIN}/api/cap`" @solve="onSolve" />
        </div>
        <p v-if="error" class="text-danger text-[13px] font-medium mb-2">{{ error }}</p>
        <button class="w-full py-3 bg-accent text-white rounded-[10px] text-[15px] font-semibold cursor-pointer transition-all hover:bg-accent-hover hover:-translate-y-px disabled:opacity-40 disabled:cursor-not-allowed" type="submit" :disabled="submitting">
          {{ submitting ? 'Creating account…' : 'Create account' }}
        </button>
      </form>
    </div>
  </div>
</template>
