<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { confirmPasswordReset } from '../services/api'

const route = useRoute()
const router = useRouter()
const token = (route.query.token as string) || ''
const password = ref('')
const success = ref('')
const error = ref('')
const submitting = ref(false)

async function submit() {
  error.value = ''
  if (password.value.length < 8) { error.value = 'Password must be at least 8 characters.'; return }
  submitting.value = true
  try { await confirmPasswordReset(token, password.value); success.value = 'Password reset! Redirecting…'; setTimeout(() => router.push('/login'), 2000) }
  catch (e) { error.value = e instanceof Error ? e.message : 'Reset failed' }
  finally { submitting.value = false }
}
</script>

<template>
  <div class="flex justify-center pt-16">
    <div class="max-w-[380px] w-full">
      <div class="text-center mb-8">
        <div class="mb-5"><span class="inline-flex items-center justify-center w-11 h-11 bg-text text-white rounded-xl text-xl font-extrabold">R</span></div>
        <template v-if="!token">
          <h1 class="text-2xl font-bold mb-1.5">Invalid link</h1>
          <p class="text-text-secondary text-sm">This reset link is missing a token.</p>
        </template>
        <template v-else-if="success">
          <h1 class="text-2xl font-bold mb-1.5">Password reset</h1>
          <p class="text-success text-[13px] font-medium">{{ success }}</p>
        </template>
        <template v-else>
          <h1 class="text-2xl font-bold mb-1.5">Set a new password</h1>
        </template>
      </div>
      <router-link v-if="!token" to="/forgot-password" class="block w-full py-3 bg-accent text-white rounded-[10px] text-[15px] font-semibold text-center no-underline transition-all hover:bg-accent-hover">Request a new link</router-link>
      <form v-else-if="!success" @submit.prevent="submit">
        <div class="mb-4">
          <label class="block text-[13px] font-semibold text-text mb-1.5">New password</label>
          <input v-model="password" type="password" class="w-full py-2.5 px-3.5 border border-border rounded-[10px] text-sm bg-white transition-all focus:outline-none focus:border-accent focus:ring-[3px] focus:ring-accent/10 placeholder:text-text-tertiary" placeholder="At least 8 characters" required />
        </div>
        <p v-if="error" class="text-danger text-[13px] font-medium mb-2">{{ error }}</p>
        <button class="w-full py-3 bg-accent text-white rounded-[10px] text-[15px] font-semibold cursor-pointer transition-all hover:bg-accent-hover hover:-translate-y-px disabled:opacity-40" type="submit" :disabled="submitting">
          {{ submitting ? 'Resetting…' : 'Reset password' }}
        </button>
      </form>
    </div>
  </div>
</template>
