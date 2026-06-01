<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { runSetup } from '../services/api'
import { markInitialized } from '../router'

const router = useRouter()
const form = reactive({ schoolName: '', displayName: '', email: '', password: '' })
const error = ref('')
const submitting = ref(false)

async function submit() {
  error.value = ''
  if (form.password.length < 8) { error.value = 'Password must be at least 8 characters.'; return }
  submitting.value = true
  try { await runSetup({ ...form }); markInitialized(); router.push({ name: 'admin-dashboard' }) }
  catch (e) { error.value = e instanceof Error ? e.message : 'Setup failed' }
  finally { submitting.value = false }
}
</script>

<template>
  <div class="flex justify-center pt-16">
    <div class="max-w-[380px] w-full">
      <div class="text-center mb-8">
        <div class="mb-5"><span class="inline-flex items-center justify-center w-11 h-11 bg-text text-white rounded-xl text-xl font-extrabold">R</span></div>
        <h1 class="text-2xl font-bold mb-1.5">Welcome</h1>
        <p class="text-text-secondary text-sm">Create the first administrator and your school.</p>
      </div>
      <form @submit.prevent="submit">
        <div class="mb-4">
          <label class="block text-[13px] font-semibold text-text mb-1.5">School name</label>
          <input v-model="form.schoolName" class="w-full py-2.5 px-3.5 border border-border rounded-[10px] text-sm bg-white transition-all focus:outline-none focus:border-accent focus:ring-[3px] focus:ring-accent/10 placeholder:text-text-tertiary" placeholder="Lincoln High School" required />
        </div>
        <div class="mb-4">
          <label class="block text-[13px] font-semibold text-text mb-1.5">Your name</label>
          <input v-model="form.displayName" class="w-full py-2.5 px-3.5 border border-border rounded-[10px] text-sm bg-white transition-all focus:outline-none focus:border-accent focus:ring-[3px] focus:ring-accent/10 placeholder:text-text-tertiary" placeholder="Admin" required />
        </div>
        <div class="mb-4">
          <label class="block text-[13px] font-semibold text-text mb-1.5">Email</label>
          <input v-model="form.email" type="email" class="w-full py-2.5 px-3.5 border border-border rounded-[10px] text-sm bg-white transition-all focus:outline-none focus:border-accent focus:ring-[3px] focus:ring-accent/10 placeholder:text-text-tertiary" placeholder="admin@school.edu" required />
        </div>
        <div class="mb-4">
          <label class="block text-[13px] font-semibold text-text mb-1.5">Password</label>
          <input v-model="form.password" type="password" class="w-full py-2.5 px-3.5 border border-border rounded-[10px] text-sm bg-white transition-all focus:outline-none focus:border-accent focus:ring-[3px] focus:ring-accent/10 placeholder:text-text-tertiary" placeholder="At least 8 characters" required />
        </div>
        <p v-if="error" class="text-danger text-[13px] font-medium mb-2">{{ error }}</p>
        <button class="w-full py-3 bg-accent text-white rounded-[10px] text-[15px] font-semibold cursor-pointer transition-all hover:bg-accent-hover hover:-translate-y-px disabled:opacity-40" type="submit" :disabled="submitting">
          {{ submitting ? 'Creating…' : 'Get started' }}
        </button>
      </form>
    </div>
  </div>
</template>
