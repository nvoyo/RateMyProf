<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getProfessor, getMyReview, submitReview, updateReview } from '../services/api'

const route = useRoute()
const router = useRouter()
const id = route.params.id as string
const professorName = ref('')
const editing = ref(false)
const existingReviewId = ref<string | null>(null)
const loading = ref(true)
const form = reactive({ courseCode: '', qualityRating: 0, difficultyRating: 0, wouldTakeAgain: false, grade: '', comment: '', tagsInput: '' })
const error = ref('')
const success = ref('')
const submitting = ref(false)

onMounted(async () => {
  try { const prof = await getProfessor(id); professorName.value = `${prof.firstName} ${prof.lastName}` } catch {}
  try {
    const mine = await getMyReview(id)
    if (mine) { editing.value = true; existingReviewId.value = mine.id; form.courseCode = mine.courseCode ?? ''; form.qualityRating = mine.qualityRating; form.difficultyRating = mine.difficultyRating; form.wouldTakeAgain = mine.wouldTakeAgain; form.grade = mine.grade ?? ''; form.comment = mine.comment; form.tagsInput = mine.tags.join(', ') }
  } catch {} finally { loading.value = false }
})

async function submit() {
  error.value = ''; success.value = ''
  if (form.qualityRating < 1 || form.difficultyRating < 1) { error.value = 'Please rate both quality and difficulty.'; return }
  if (!form.comment.trim()) { error.value = 'Please add a comment.'; return }
  submitting.value = true
  try {
    const tags = form.tagsInput.split(',').map(t => t.trim()).filter(Boolean)
    const payload = { ...(form.courseCode ? { courseCode: form.courseCode } : {}), qualityRating: form.qualityRating, difficultyRating: form.difficultyRating, wouldTakeAgain: form.wouldTakeAgain, ...(form.grade ? { grade: form.grade } : {}), comment: form.comment, tags }
    if (editing.value && existingReviewId.value) { await updateReview(existingReviewId.value, payload); success.value = 'Review updated! Returns to pending for re-approval.' }
    else { await submitReview(id, payload); success.value = 'Review submitted! Pending moderation.' }
    setTimeout(() => router.push(`/professors/${id}`), 1800)
  } catch (e) { error.value = e instanceof Error ? e.message : 'Failed' }
  finally { submitting.value = false }
}
</script>

<template>
  <section class="max-w-[580px] mx-auto">
    <div class="mb-7">
      <h1 class="text-2xl font-bold mb-1">{{ editing ? 'Edit review' : 'Write a review' }}</h1>
      <p class="text-text-secondary text-sm">{{ professorName || 'Professor' }} · Anonymous · Moderated before publishing<template v-if="editing"> · Edited reviews return to pending</template></p>
    </div>

    <form @submit.prevent="submit">
      <div class="flex gap-8 mb-5">
        <div>
          <label class="block text-[13px] font-semibold text-text mb-2">Quality</label>
          <div class="flex gap-1">
            <button v-for="n in 5" :key="'q'+n" type="button" class="text-2xl bg-none border-none cursor-pointer p-0 leading-none transition-colors" :class="form.qualityRating >= n ? 'text-amber-400' : 'text-zinc-200'" @click="form.qualityRating = n">★</button>
          </div>
        </div>
        <div>
          <label class="block text-[13px] font-semibold text-text mb-2">Difficulty</label>
          <div class="flex gap-1">
            <button v-for="n in 5" :key="'d'+n" type="button" class="text-2xl bg-none border-none cursor-pointer p-0 leading-none transition-colors" :class="form.difficultyRating >= n ? 'text-yellow-600' : 'text-zinc-200'" @click="form.difficultyRating = n">★</button>
          </div>
        </div>
      </div>

      <div class="flex gap-3 mb-4">
        <div class="flex-1">
          <label class="block text-[13px] font-semibold text-text mb-1.5">Course</label>
          <input v-model="form.courseCode" class="w-full py-2.5 px-3.5 border border-border rounded-[10px] text-sm bg-white transition-all focus:outline-none focus:border-accent focus:ring-[3px] focus:ring-accent/10 placeholder:text-text-tertiary" placeholder="CS101" />
        </div>
        <div class="flex-1">
          <label class="block text-[13px] font-semibold text-text mb-1.5">Grade</label>
          <input v-model="form.grade" class="w-full py-2.5 px-3.5 border border-border rounded-[10px] text-sm bg-white transition-all focus:outline-none focus:border-accent focus:ring-[3px] focus:ring-accent/10 placeholder:text-text-tertiary" placeholder="A" />
        </div>
      </div>

      <label class="flex items-center gap-2.5 text-sm font-medium text-text mb-4 cursor-pointer">
        <input v-model="form.wouldTakeAgain" type="checkbox" class="w-4 h-4 accent-accent" />
        <span>I would take this professor again</span>
      </label>

      <div class="mb-4">
        <label class="block text-[13px] font-semibold text-text mb-1.5">Comment</label>
        <textarea v-model="form.comment" class="w-full py-2.5 px-3.5 border border-border rounded-[10px] text-sm bg-white transition-all focus:outline-none focus:border-accent focus:ring-[3px] focus:ring-accent/10 placeholder:text-text-tertiary resize-y" rows="5" placeholder="Teaching style, workload, exams…" required></textarea>
      </div>

      <div class="mb-4">
        <label class="block text-[13px] font-semibold text-text mb-1.5">Tags</label>
        <input v-model="form.tagsInput" class="w-full py-2.5 px-3.5 border border-border rounded-[10px] text-sm bg-white transition-all focus:outline-none focus:border-accent focus:ring-[3px] focus:ring-accent/10 placeholder:text-text-tertiary" placeholder="inspiring, tough-grader, lots-of-homework" />
      </div>

      <p v-if="error" class="text-danger text-[13px] font-medium mb-2">{{ error }}</p>
      <p v-if="success" class="text-success text-[13px] font-medium mb-2">{{ success }}</p>

      <button class="w-full py-3 bg-accent text-white rounded-[10px] text-[15px] font-semibold cursor-pointer transition-all hover:bg-accent-hover hover:-translate-y-px disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none" type="submit" :disabled="submitting || loading">
        {{ submitting ? 'Saving…' : editing ? 'Update review' : 'Submit review' }}
      </button>
    </form>
  </section>
</template>
