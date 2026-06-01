<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    value: number | null
    max?: number
    label?: string
  }>(),
  { max: 5 },
)

const filled = computed(() => Math.round(props.value ?? 0))
const stars = computed(() => Array.from({ length: props.max }, (_, i) => i < filled.value))
</script>

<template>
  <span class="inline-flex items-center gap-px" :title="label ?? ''">
    <span
      v-for="(on, i) in stars"
      :key="i"
      class="text-sm transition-colors"
      :class="on ? 'text-amber-400' : 'text-zinc-200'"
    >★</span>
    <span v-if="value !== null" class="ml-1.5 text-[13px] font-semibold text-zinc-900">{{ value.toFixed(1) }}</span>
    <span v-else class="ml-1.5 text-[13px] text-zinc-400">—</span>
  </span>
</template>
