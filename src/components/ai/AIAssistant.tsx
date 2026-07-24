'use client'
import { useState, useRef, useEffect } from 'react'
import { Sparkles, X, Settings, Trash2, Copy, Send } from 'lucide-react'
import { useAIStore } from '@/store/useAIStore'
import { useAIChat } from '@/hooks/useAIChat'
import { QUICK_ACTIONS } from '@/lib/ai/prompts'
import { AISettings } from './AISettings'

interface AIAssistantProps {
  page: string
  context: string
  storeId?: string
}

const PROVIDER_LABELS: Record<string, string> = {
  gemini: '🔵 Gemini',
  ollama: '🟢 Ollama',
  openrouter: '🟣 OpenRouter',
}

export function AIAssistant({ page, context, storeId }: AIAssistantProps) {
  const { isOpen, setOpen, settings, unreadInsights, markRead } = useAIStore()
  const { messages, isLoading, error, sendMessage, clearHistory } = useAIChat(page, context, storeId)
  const [input, setInput] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const quickActions = QUICK_ACTIONS[page] || []

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || isLoading) return
    const text = input
    setInput('')
    await sendMessage(text)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content)
  }

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => { setOpen(true); markRead() }}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-3 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105"
        >
          <Sparkles size={18} />
          <span className="font-semibold text-sm">AI Analyst</span>
          {unreadInsights > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {unreadInsights}
            </span>
          )}
        </button>
      )}

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed right-0 top-0 h-full w-[420px] bg-white shadow-2xl z-40 flex flex-col border-l border-gray-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 flex items-center justify-between shrink-0">
            <div>
              <div className="flex items-center gap-2 text-white font-bold">
                <Sparkles size={18} />
                <span>Aria — AI Analyst</span>
              </div>
              <div className="flex items-center gap-1 mt-1">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-blue-100 text-xs">{PROVIDER_LABELS[settings.provider]}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowSettings(true)} className="text-blue-200 hover:text-white transition-colors">
                <Settings size={18} />
              </button>
              <button onClick={() => clearHistory()} className="text-blue-200 hover:text-white transition-colors">
                <Trash2 size={18} />
              </button>
              <button onClick={() => setOpen(false)} className="text-blue-200 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Context Badge */}
          <div className="px-4 py-2 bg-blue-50 border-b border-blue-100 text-xs text-blue-700 shrink-0">
            📍 Konteks aktif: <strong>{page}</strong>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mx-4 mt-2 p-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600 shrink-0">
              ⚠️ {error}
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="text-center text-gray-400 text-sm mt-8">
                <Sparkles className="mx-auto mb-2 text-gray-300" size={32} />
                <p>Halo! Saya Aria, AI analyst GMV Max kamu.</p>
                <p className="mt-1">Tanya apa saja tentang data bisnis kamu 👇</p>
              </div>
            )}
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`relative max-w-[85%] group ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-2xl rounded-tr-sm px-4 py-2'
                    : 'bg-gray-100 text-gray-800 rounded-2xl rounded-tl-sm px-4 py-2'
                }`}>
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  {msg.role === 'assistant' && (
                    <button
                      onClick={() => copyMessage(msg.content)}
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Copy size={12} className="text-gray-400 hover:text-gray-600" />
                    </button>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-3">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Actions */}
          {quickActions.length > 0 && (
            <div className="px-4 py-2 border-t border-gray-100 shrink-0">
              <p className="text-xs text-gray-400 mb-2">⚡ Quick Actions</p>
              <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                {quickActions.map((qa, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(qa.prompt)}
                    disabled={isLoading}
                    className="whitespace-nowrap text-xs px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full hover:bg-blue-100 disabled:opacity-50 transition-colors border border-blue-200"
                  >
                    {qa.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="p-4 border-t border-gray-200 shrink-0">
            <div className="flex gap-2">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Tanya tentang data kamu..."
                rows={2}
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                className="bg-blue-600 text-white p-3 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors self-end"
              >
                <Send size={16} />
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1 text-center">Enter untuk kirim · Shift+Enter untuk baris baru</p>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && <AISettings onClose={() => setShowSettings(false)} />}
    </>
  )
}
