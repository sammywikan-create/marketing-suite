import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

// Next.js 16.2.4 + React 19 testing setup.
// Per node_modules/next/dist/docs/01-app/02-guides/testing/vitest.md the
// recommended wiring is `@vitejs/plugin-react` (JSX/automatic runtime) plus
// `vite-tsconfig-paths` so the `@/*` alias from tsconfig.json resolves in tests.
export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    // Component renders + async effects can be a little slow under jsdom.
    testTimeout: 20000,
  },
})
