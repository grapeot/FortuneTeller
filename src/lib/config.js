/**
 * Centralized configuration - all tunables in one place.
 * Override via env vars (VITE_ prefix for Vite client exposure).
 */

export const AI_CONFIG = {
  /** OpenAI-compatible API base URL */
  baseUrl: import.meta.env.VITE_AI_API_BASE_URL || 'https://space.ai-builders.com/backend/v1',
  /** Bearer token */
  apiToken: import.meta.env.VITE_AI_API_TOKEN || '',
  /** Model identifier – switch between grok-4-fast, gemini-3-flash-preview, etc. */
  model: import.meta.env.VITE_AI_MODEL || 'grok-4-fast',
}

export const TIMING = {
  /** Minimum duration of the analyzing animation (ms) */
  analyzeDuration: 2500,
  /** Max time to wait for AI response before falling back (ms) */
  aiTimeout: 8000,
}

export const BRAND = {
  name: 'Superlinear Academy',
  tagline: '马年大吉 · 马到成功',
}
