<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import 'cap-widget'
import { login } from '../services/api'
import { API_ORIGIN } from '../lib/eden'

const route = useRoute()
const router = useRouter()
const form = reactive({ email: '', password: '' })
const error = ref('')
const submitting = ref(false)
const capToken = ref('')

function onSolve(e: CustomEvent<{ token: string }>) { capToken.value = e.detail.token }

async function submit() {
  error.value = ''
  if (!capToken.value) { error.value = 'Please complete the verification.'; return }
  submitting.value = true
  try {
    await login(form.email, form.password, capToken.value)
    router.push((route.query.redirect as string) || '/')
  } catch (e) { error.value = e instanceof Error ? e.message : 'Login failed' }
  finally { submitting.value = false }
}
</script>

<template>
  <div class="flex justify-center pt-16">
    <div class="max-w-[380px] w-full">
      <div class="text-center mb-8">
        <div class="mb-5"><span class="inline-flex items-center justify-center w-11 h-11 bg-text text-white rounded-xl text-xl font-extrabold">R</span></div>
        <h1 class="text-2xl font-bold mb-1.5">Welcome back</h1>
        <p class="text-text-secondary text-sm">Sign in to your account</p>
      </div>
      <form @submit.prevent="submit">
        <div class="mb-4">
          <label class="block text-[13px] font-semibold text-text mb-1.5">Email</label>
          <input v-model="form.email" type="email" class="w-full py-2.5 px-3.5 border border-border rounded-[10px] text-sm bg-white transition-all focus:outline-none focus:border-accent focus:ring-[3px] focus:ring-accent/10 placeholder:text-text-tertiary" placeholder="you@school.edu" required />
        </div>
        <div class="mb-4">
          <label class="block text-[13px] font-semibold text-text mb-1.5">Password</label>
          <input v-model="form.password" type="password" class="w-full py-2.5 px-3.5 border border-border rounded-[10px] text-sm bg-white transition-all focus:outline-none focus:border-accent focus:ring-[3px] focus:ring-accent/10 placeholder:text-text-tertiary" placeholder="••••••••" required />
        </div>
        <div class="flex flex-col items-start gap-2 mb-4">
          <cap-widget :data-cap-api-endpoint="`${API_ORIGIN}/api/cap`" @solve="onSolve" />
          <router-link to="/forgot-password" class="text-[13px] text-text-tertiary whitespace-nowrap hover:text-text">Forgot password?</router-link>
        </div>
        <p v-if="error" class="text-danger text-[13px] font-medium mb-2">{{ error }}</p>
        <button class="w-full py-3 bg-accent text-white rounded-[10px] text-[15px] font-semibold cursor-pointer transition-all hover:bg-accent-hover hover:-translate-y-px disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none" type="submit" :disabled="submitting">
          {{ submitting ? 'Signing in…' : 'Sign in' }}
        </button>
      </form>
      <p class="text-center mt-6 text-[13px] text-text-tertiary">Accounts are invite-only. Got an invite link? Open it to register.</p>
    </div>
  </div>
</template>
