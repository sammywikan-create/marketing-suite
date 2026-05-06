'use client'
import { useState } from 'react'
import { useAIStore, AIProvider } from '@/store/useAIStore'
import { GEMINI_MODELS } from '@/lib/ai/providers/gemini'
import { OPENROUTER_MODELS } from '@/lib/ai/providers/openrouter'
import { OLLAMA_CLOUD_MODELS } from '@/lib/ai/providers/ollama'

export function AISettings({ onClose }: { onClose: () => void }) {
  const { settings, updateSettings } = useAIStore()
  const [ollamaLocalModels, setOllamaLocalModels] = useState([
    { value: 'llama3.2', label: 'llama3.2' },
    { value: 'mistral', label: 'mistral' },
    { value: 'gemma2', label: 'gemma2' },
    { value: 'qwen2.5', label: 'qwen2.5' },
  ])

  const fetchOllamaModels = async () => {
    try {
      const res = await fetch(`${settings.ollamaBaseUrl}/api/tags`)
      const data = await res.json()
      const models = (data.models || []).map((m: any) => ({ value: m.name, label: m.name }))
      if (models.length > 0) setOllamaLocalModels(models)
    } catch { /* keep defaults */ }
  }

  const isOllamaCloud = settings.ollamaMode === 'cloud'
  const ollamaModels = isOllamaCloud ? OLLAMA_CLOUD_MODELS : ollamaLocalModels

  const providers: { value: AIProvider; label: string; desc: string }[] = [
    { value: 'gemini', label: '🔵 Google Gemini', desc: 'Gratis & powerful. Butuh Gemini API Key.' },
    { value: 'ollama', label: '🟢 Ollama', desc: 'Lokal (gratis, privat) atau Cloud (butuh API key).' },
    { value: 'openrouter', label: '🟣 OpenRouter', desc: 'Akses 100+ model AI. Ada opsi gratis.' },
  ]

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 w-[500px] max-h-[80vh] overflow-y-auto shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">⚙️ Pengaturan AI</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>

        {/* Provider Selection */}
        <div className="mb-6">
          <label className="text-sm font-semibold text-gray-600 mb-2 block">Pilih Provider AI</label>
          <div className="space-y-2">
            {providers.map(p => (
              <button
                key={p.value}
                onClick={() => updateSettings({ provider: p.value })}
                className={`w-full p-3 rounded-xl border-2 text-left transition-all ${
                  settings.provider === p.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-semibold text-sm">{p.label}</div>
                <div className="text-xs text-gray-500">{p.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Gemini Settings */}
        {settings.provider === 'gemini' && (
          <div className="space-y-3 mb-4">
            <label className="text-sm font-semibold text-gray-600">Model Gemini</label>
            <select
              value={settings.geminiModel}
              onChange={e => updateSettings({ geminiModel: e.target.value })}
              className="w-full border rounded-lg p-2 text-sm"
            >
              {GEMINI_MODELS.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
            <p className="text-xs text-blue-600">
              💡 Dapatkan API key gratis di: <strong>aistudio.google.com</strong> → tambahkan ke .env.local sebagai GEMINI_API_KEY
            </p>
          </div>
        )}

        {/* Ollama Settings */}
        {settings.provider === 'ollama' && (
          <div className="space-y-3 mb-4">
            {/* Mode Toggle */}
            <label className="text-sm font-semibold text-gray-600">Mode Ollama</label>
            <div className="flex rounded-lg border border-gray-200 overflow-hidden">
              <button
                onClick={() => updateSettings({ ollamaMode: 'local', ollamaModel: 'llama3.2' })}
                className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
                  !isOllamaCloud
                    ? 'bg-green-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                🖥️ Lokal
              </button>
              <button
                onClick={() => updateSettings({ ollamaMode: 'cloud', ollamaModel: 'qwen3.5' })}
                className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
                  isOllamaCloud
                    ? 'bg-green-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                ☁️ Cloud
              </button>
            </div>

            {/* Local-specific: Base URL */}
            {!isOllamaCloud && (
              <>
                <label className="text-sm font-semibold text-gray-600">Base URL Ollama</label>
                <input
                  value={settings.ollamaBaseUrl}
                  onChange={e => updateSettings({ ollamaBaseUrl: e.target.value })}
                  className="w-full border rounded-lg p-2 text-sm"
                  placeholder="http://localhost:11434"
                />
              </>
            )}

            {/* Model selector */}
            <label className="text-sm font-semibold text-gray-600">Model</label>
            <div className="flex gap-2 items-center">
              <select
                value={settings.ollamaModel}
                onChange={e => updateSettings({ ollamaModel: e.target.value })}
                className="flex-1 border rounded-lg p-2 text-sm"
              >
                {ollamaModels.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
              {!isOllamaCloud && (
                <button
                  onClick={fetchOllamaModels}
                  className="px-3 py-2 bg-green-100 text-green-700 rounded-lg text-sm hover:bg-green-200 transition-colors"
                >
                  🔄 Refresh
                </button>
              )}
            </div>

            {/* Cloud-specific: API Key */}
            {isOllamaCloud && (
              <>
                <label className="text-sm font-semibold text-gray-600">Ollama API Key</label>
                <input
                  type="password"
                  value={settings.ollamaApiKey}
                  onChange={e => updateSettings({ ollamaApiKey: e.target.value })}
                  className="w-full border rounded-lg p-2 text-sm"
                  placeholder="Masukkan API key Ollama Cloud"
                />
              </>
            )}

            {/* Info text */}
            {isOllamaCloud ? (
              <p className="text-xs text-green-600">
                💡 Dapatkan API key di: <strong>ollama.com</strong>
              </p>
            ) : (
              <p className="text-xs text-green-600">
                💡 Install Ollama: <strong>ollama.com</strong> → jalankan: <code className="bg-green-50 px-1 rounded">ollama run llama3.2</code>
              </p>
            )}
          </div>
        )}

        {/* OpenRouter Settings */}
        {settings.provider === 'openrouter' && (
          <div className="space-y-3 mb-4">
            <label className="text-sm font-semibold text-gray-600">Model OpenRouter</label>
            <select
              value={settings.openrouterModel}
              onChange={e => updateSettings({ openrouterModel: e.target.value })}
              className="w-full border rounded-lg p-2 text-sm"
            >
              {OPENROUTER_MODELS.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
            <p className="text-xs text-purple-600">
              💡 Dapatkan API key di: <strong>openrouter.ai</strong> → tambahkan ke .env.local sebagai OPENROUTER_API_KEY
            </p>
          </div>
        )}

        {/* Temperature & Tokens */}
        <div className="space-y-3 mb-6">
          <div>
            <label className="text-sm font-semibold text-gray-600">
              Temperature: {settings.temperature}
              <span className="text-xs text-gray-400 ml-2">(0=fokus, 1=kreatif)</span>
            </label>
            <input
              type="range" min="0" max="1" step="0.1"
              value={settings.temperature}
              onChange={e => updateSettings({ temperature: parseFloat(e.target.value) })}
              className="w-full mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-600">
              Max Tokens: {settings.maxTokens}
            </label>
            <input
              type="range" min="200" max="2000" step="100"
              value={settings.maxTokens}
              onChange={e => updateSettings({ maxTokens: parseInt(e.target.value) })}
              className="w-full mt-1"
            />
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
        >
          ✅ Simpan & Tutup
        </button>
      </div>
    </div>
  )
}
