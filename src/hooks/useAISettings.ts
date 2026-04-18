'use client'
import { useAIStore } from '@/store/useAIStore'

export function useAISettings() {
  const { settings, updateSettings } = useAIStore()
  return { settings, updateSettings }
}
