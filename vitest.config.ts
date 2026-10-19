import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./', import.meta.url)) },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    // Pin the host timezone to something that is neither UTC nor Vienna, so
    // any code that silently relies on the host TZ fails here first.
    env: { TZ: 'America/New_York' },
  },
})
