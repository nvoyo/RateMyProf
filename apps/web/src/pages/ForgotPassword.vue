<script setup lang="ts">
import { ref } from 'vue'
import 'cap-widget'
import { requestPasswordReset } from '../services/api'
import { API_ORIGIN } from '../lib/eden'

const email = ref('')
const submitted = ref(false)
const error = ref('')
const submitting = ref(false)
const capToken = ref('')

function onSolve(e: CustomEvent<{ token: string }>) { capToken.value = e.detail.token }

async function submit() {
  error.value = ''
  if (!capToken.value) { error.value = 'Please complete the verification.'; return }
  submitting.value = true
  try { await requestPasswordReset(email.value, capToken.value); submitted.value = true }
  catch (e) { error.value = e instanceof Error ? e.message : 'Request failed' }
  finally { submitting.value = false }
}
</script>

<template>
  <div class="flex justify-center pt-16">
    <div class="max-w-[380px] w-full">
      <div class="text-center mb-8">
        <div class="mb-5"><span class="inline-flex items-center justify-center w-11 h-11 bg-text text-white rounded-xl text-xl font-extrabold">R</span></div>
        <template v-if="!submitted">
          <h1 class="text-2xl font-bold mb-1.5">Reset password</h1>
          <p class="text-text-secondary text-sm">Enter your email and we'll send a reset link.</p>
        </template>
        <template v-else>
          <h1 class="text-2xl font-bold mb-1.5">Check your email</h1>
          <p class="text-text-secondary text-sm">If <strong>{{ email }}</strong> has an account, a reset link has been sent. Expires in 1 hour.</p>
        </template>
      </div>
      <form v-if="!submitted" @submit.prevent="submit">
        <div class="mb-4">
          <label class="block text-[13px] font-semibold text-text mb-1.5">Email</label>
          <input v-model="email" type="email" class="w-full py-2.5 px-3.5 border border-border rounded-[10px] text-sm bg-white transition-all focus:outline-none focus:border-accent focus:ring-[3px] focus:ring-accent/10 placeholder:text-text-tertiary" placeholder="you@school.edu" required />
        </div>
        <div class="flex justify-center mb-4">
          <cap-widget :data-cap-api-endpoint="`${API_ORIGIN}/api/cap`" @solve="onSolve" />
        </div>
        <p v-if="error" class="text-danger text-[13px] font-medium mb-2">{{ error }}</p>
        <button class="w-full py-3 bg-accent text-white rounded-[10px] text-[15px] font-semibold cursor-pointer transition-all hover:bg-accent-hover hover:-translate-y-px disabled:opacity-40" type="submit" :disabled="submitting">
          {{ submitting ? 'Sending…' : 'Send reset link' }}
        </button>
      </form>
      <router-link v-else to="/login" class="block w-full py-3 bg-accent text-white rounded-[10px] text-[15px] font-semibold text-center no-underline transition-all hover:bg-accent-hover">Back to login</router-link>
    </div>
  </div>
</template>
