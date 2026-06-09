import '@testing-library/jest-dom/vitest'
import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

// Tear down the rendered React tree between tests so each render starts clean.
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})
