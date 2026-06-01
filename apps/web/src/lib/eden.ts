import { treaty } from '@elysiajs/eden'
import type { App } from 'app'

/**
 * Base URL for the backend API. Used by Eden Treaty and the cap.js widget.
 * In dev, Vite proxies `/api` to http://localhost:3000 (see vite.config.ts).
 * In production, set VITE_API_URL to the backend's public URL.
 */
export const API_ORIGIN =
  import.meta.env.VITE_API_URL ||
  (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173')

export const api = treaty<App>(API_ORIGIN, {
  fetch: {
    credentials: 'include',
  },
})

/**
 * Small helper that unwraps an Eden response, throwing a normalized Error
 * on failure so callers can use try/catch.
 */
export function unwrap<T>(result: {
  data: T | null
  error: { status?: unknown; value?: unknown } | null
}): T {
  if (result.error) {
    const value = result.error.value
    const message =
      typeof value === 'string'
        ? value
        : value && typeof value === 'object' && 'error' in value
          ? String((value as { error: unknown }).error)
          : 'Request failed'
    throw new Error(message)
  }
  return result.data as T
}
