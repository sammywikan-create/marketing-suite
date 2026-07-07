import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type AIProvider = 'gemini' | 'ollama' | 'openrouter'


export interface AISettings {
  provider: AIProvider
  geminiModel: string
  ollamaModel: string
  ollamaBaseUrl: string
  ollamaApiKey: string
  openrouterModel: string
  temperature: number
  maxTokens: number
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  page?: string
}

interface AIStore {
  settings: AISettings
  chatHistory: Record<string, ChatMessage[]>
  isOpen: boolean
  unreadInsights: number
  updateSettings: (s: Partial<AISettings>) => void
  addMessage: (page: string, msg: ChatMessage) => void
  clearHistory: (page: string) => void
  setOpen: (open: boolean) => void
  markRead: () => void
}

export const useAIStore = create<AIStore>()(
  persist(
    (set) => ({
      settings: {
        provider: 'gemini',
        geminiModel: 'gemini-1.5-flash',
        ollamaModel: 'llama3.2',
        ollamaBaseUrl: 'http://localhost:11434',
        ollamaApiKey: '',
        openrouterModel: 'google/gemini-flash-1.5',
        temperature: 0.7,
        maxTokens: 600,
      },
      chatHistory: {},
      isOpen: false,
      unreadInsights: 0,
      updateSettings: (s) =>
        set((state) => ({ settings: { ...state.settings, ...s } })),
      addMessage: (page, msg) =>
        set((state) => ({
          chatHistory: {
            ...state.chatHistory,
            [page]: [...(state.chatHistory[page] || []), msg],
          },
        })),
      clearHistory: (page) =>
        set((state) => ({
          chatHistory: { ...state.chatHistory, [page]: [] },
        })),
      setOpen: (open) => set({ isOpen: open }),
      markRead: () => set({ unreadInsights: 0 }),
    }),
    { name: 'gmv-ai-settings' }
  )
)
