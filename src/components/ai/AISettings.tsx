'use client'
import { useState, useEffect } from 'react'
import { useAIStore, AIProvider } from '@/store/useAIStore'
import { GEMINI_MODELS } from '@/lib/ai/providers/gemini'
import { OPENROUTER_MODELS } from '@/lib/ai/providers/openrouter'
import { OLLAMA_CLOUD_MODELS } from '@/lib/ai/providers/ollama'
import { OPENAI_MODELS } from '@/lib/ai/providers/openai'

export function AISettings({ onClose }: { onClose: () => void }) {
  const { settings, updateSettings } = useAIStore()
  const [ollamaLocalModels, setOllamaLocalModels] = useState([
    { value: 'llama3.2', label: 'llama3.2' },
    { value: 'mistral', label: 'mistral' },
    { value: 'gemma2', label: 'gemma2' },
    { value: 'qwen2.5', label: 'qwen2.5' },
  ])
  const [saveFlash, setSaveFlash] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null)
  const [testing, setTesting] = useState(false)

  // Auto-fetch settings from Supabase on mount
  useEffect(() => {
    async function fetchSupabaseSettings() {
      try {
        const res = await fetch('/api/ai-settings')
        if (res.ok) {
          const data = await res.json()
          if (data.settings) {
            updateSettings(data.settings)
          }
        }
      } catch {}
    }
    fetchSupabaseSettings()
  }, [])

  const fetchOllamaModels = async () => {
    try {
      const res = await fetch(`${settings.ollamaBaseUrl}/api/tags`)
      const data = await res.json()
      const models = (data.models || []).map((m: any) => ({ value: m.name, label: m.name }))
      if (models.length > 0) setOllamaLocalModels(models)
    } catch { /* keep defaults */ }
  }

  const isOllamaCloud = !settings.ollamaBaseUrl?.includes('localhost') && !settings.ollamaBaseUrl?.includes('127.0.0.1')

  // Quick test connection
  const testConnection = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Halo, tes koneksi. Jawab singkat: OK.' }],
          settings,
          systemPrompt: 'Kamu adalah AI asisten. Jawab singkat.',
          page: 'test',
        }),
      })
      if (res.ok) {
        const d = await res.json()
        setTestResult({ ok: true, msg: d.content?.slice(0, 120) || 'Koneksi berhasil!' })
      } else {
        const d = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
        setTestResult({ ok: false, msg: d.error || `Error ${res.status}` })
      }
    } catch (e: any) {
      setTestResult({ ok: false, msg: e.message || 'Gagal terhubung' })
    } finally {
      setTesting(false)
    }
  }

  const providers: { value: AIProvider; label: string; desc: string }[] = [
    { value: 'gemini', label: '🔵 Google Gemini', desc: 'Gratis & powerful. Butuh Gemini API Key (aistudio.google.com).' },
    { value: 'openai', label: '🟢 OpenAI / Compatible', desc: 'GPT-4o, GPT-4o Mini, atau Custom Base URL & API Key.' },
    { value: 'ollama', label: '🦙 Ollama', desc: 'Lokal (gratis, privat) atau Cloud (butuh API key).' },
    { value: 'openrouter', label: '🟣 OpenRouter', desc: 'Akses 100+ model AI. Ada opsi gratis.' },
  ]

  const handleSave = async () => {
    setIsSyncing(true)
    try {
      await fetch('/api/ai-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      })
    } catch {}
    setIsSyncing(false)
    setSaveFlash(true)
    setTimeout(() => {
      setSaveFlash(false)
      onClose()
    }, 1200)
  }

  const hasApiKey =
    (settings.provider === 'gemini' && settings.geminiApiKey) ||
    (settings.provider === 'openai' && settings.openaiApiKey) ||
    (settings.provider === 'ollama' && (!isOllamaCloud || settings.ollamaApiKey)) ||
    (settings.provider === 'openrouter' && settings.openrouterApiKey)

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-2xl p-6 w-[540px] max-h-[85vh] overflow-y-auto shadow-2xl border border-gray-100 dark:border-gray-800">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2">⚙️ Pengaturan AI & API Keys</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>

        {/* Status Badge */}
        <div className={`mb-4 flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium ${
          hasApiKey
            ? 'bg-green-50 text-green-700 border border-green-200 dark:bg-green-950/40 dark:text-green-300 dark:border-green-800'
            : 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
        }`}>
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${hasApiKey ? 'bg-green-500' : 'bg-amber-500 animate-pulse'}`} />
            <span>
              {settings.provider === 'gemini'
                ? (settings.geminiApiKey ? `✅ Gemini tersimpan ke Supabase & LocalStorage` : `⚠️ Gemini API Key belum diisi`)
                : settings.provider === 'openai'
                ? (settings.openaiApiKey ? `✅ OpenAI tersimpan ke Supabase & LocalStorage` : `⚠️ OpenAI API Key belum diisi`)
                : settings.provider === 'ollama'
                ? (isOllamaCloud ? (settings.ollamaApiKey ? `✅ Ollama Cloud tersimpan` : `⚠️ API Key Ollama Cloud belum diisi`) : `Ollama Lokal (${settings.ollamaBaseUrl})`)
                : (settings.openrouterApiKey ? `✅ OpenRouter tersimpan` : `⚠️ OpenRouter API Key belum diisi`)
              }
            </span>
          </div>
          <span className="text-[10px] bg-white/60 dark:bg-black/20 px-2 py-0.5 rounded-full font-bold">Auto-Sync Supabase</span>
        </div>

        {/* Provider Selection */}
        <div className="mb-5">
          <label className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2 block">Pilih Provider AI</label>
          <div className="space-y-2">
            {providers.map(p => (
              <button
                key={p.value}
                onClick={() => updateSettings({ provider: p.value })}
                className={`w-full p-3 rounded-xl border-2 text-left transition-all ${
                  settings.provider === p.value
                    ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 dark:border-blue-500'
                    : 'border-gray-200 hover:border-gray-300 dark:border-gray-700'
                }`}
              >
                <div className="font-semibold text-sm">{p.label}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{p.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Gemini Settings */}
        {settings.provider === 'gemini' && (
          <div className="space-y-4 mb-4 p-4 bg-blue-50/50 dark:bg-blue-950/30 rounded-xl border border-blue-100 dark:border-blue-900/50">
            <div>
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-200 block mb-1">Model Gemini</label>
              <select
                value={settings.geminiModel}
                onChange={e => updateSettings({ geminiModel: e.target.value })}
                className="w-full border border-gray-300 dark:border-gray-700 rounded-lg p-2.5 text-sm bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                {GEMINI_MODELS.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-bold text-gray-800 dark:text-white flex items-center gap-1.5">
                  🔑 Gemini API Key
                  <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-semibold">Tersimpan di Supabase</span>
                </label>
                <a
                  href="https://aistudio.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline font-medium"
                >
                  aistudio.google.com ↗
                </a>
              </div>
              <input
                type="password"
                value={settings.geminiApiKey || ''}
                onChange={e => updateSettings({ geminiApiKey: e.target.value })}
                className="w-full border border-blue-300 dark:border-blue-700 rounded-lg p-2.5 text-sm bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Masukkan Gemini API Key Anda (AIzaSy...)"
              />
              <div className="mt-2 bg-blue-100/70 dark:bg-blue-900/30 rounded-lg p-3 border border-blue-200 dark:border-blue-800 text-xs text-blue-800 dark:text-blue-200 leading-relaxed">
                💡 <strong>Dapatkan API key gratis di:</strong>{' '}
                <a href="https://aistudio.google.com" target="_blank" rel="noopener noreferrer" className="underline font-bold text-blue-600 dark:text-blue-400">
                  aistudio.google.com
                </a>.
                <br />Key tersimpan secara aman di database Supabase sehingga Anda tidak perlu mengisinya lagi saat membuka website di komputer baru.
              </div>
            </div>
          </div>
        )}

        {/* OpenAI Settings */}
        {settings.provider === 'openai' && (
          <div className="space-y-4 mb-4 p-4 bg-emerald-50/50 dark:bg-emerald-950/30 rounded-xl border border-emerald-100 dark:border-emerald-900/50">
            <div>
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-200 block mb-1">Model OpenAI</label>
              <select
                value={settings.openaiModel || 'gpt-4o-mini'}
                onChange={e => updateSettings({ openaiModel: e.target.value })}
                className="w-full border border-gray-300 dark:border-gray-700 rounded-lg p-2.5 text-sm bg-white dark:bg-gray-800 focus:ring-2 focus:ring-emerald-500 outline-none"
              >
                {OPENAI_MODELS.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-bold text-gray-800 dark:text-white block mb-1">🔑 OpenAI API Key</label>
              <input
                type="password"
                value={settings.openaiApiKey || ''}
                onChange={e => updateSettings({ openaiApiKey: e.target.value })}
                className="w-full border border-emerald-300 dark:border-emerald-700 rounded-lg p-2.5 text-sm bg-white dark:bg-gray-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                placeholder="Masukkan OpenAI API Key (sk-...)"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-200 block mb-1">🌐 OpenAI Base URL</label>
              <input
                type="text"
                value={settings.openaiBaseUrl || 'https://api.openai.com/v1'}
                onChange={e => updateSettings({ openaiBaseUrl: e.target.value })}
                className="w-full border border-gray-300 dark:border-gray-700 rounded-lg p-2.5 text-sm bg-white dark:bg-gray-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                placeholder="https://api.openai.com/v1"
              />
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                Dapat disesuaikan jika memakai endpoint kustom (misal: vLLM, LMStudio, DeepSeek, Grok).
              </p>
            </div>
          </div>
        )}

        {/* Ollama Settings */}
        {settings.provider === 'ollama' && (
          <div className="space-y-4 mb-4 p-4 bg-green-50/50 dark:bg-green-950/30 rounded-xl border border-green-100 dark:border-green-900/50">
            <div>
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2 block">Mode Ollama</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => updateSettings({ ollamaBaseUrl: 'http://localhost:11434' })}
                  className={`p-3 rounded-lg border-2 text-left transition-all ${
                    !isOllamaCloud ? 'border-green-500 bg-green-50 dark:bg-green-900/30' : 'border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <div className="text-sm font-semibold">🖥️ Lokal</div>
                  <div className="text-[11px] text-gray-500">Gratis, privat</div>
                </button>
                <button
                  onClick={() => {
                    if (!isOllamaCloud) {
                      updateSettings({ ollamaBaseUrl: 'https://ollama.artisanlab.io' })
                    }
                  }}
                  className={`p-3 rounded-lg border-2 text-left transition-all ${
                    isOllamaCloud ? 'border-green-500 bg-green-50 dark:bg-green-900/30' : 'border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <div className="text-sm font-semibold">☁️ Cloud</div>
                  <div className="text-[11px] text-gray-500">Butuh API Key</div>
                </button>
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-200 block mb-1">Base URL</label>
              <input
                value={settings.ollamaBaseUrl}
                onChange={e => updateSettings({ ollamaBaseUrl: e.target.value })}
                className="w-full border border-gray-300 dark:border-gray-700 rounded-lg p-2.5 text-sm bg-white dark:bg-gray-800 focus:ring-2 focus:ring-green-500 outline-none"
                placeholder={isOllamaCloud ? "https://api.anda.com" : "http://localhost:11434"}
              />
            </div>

            {isOllamaCloud && (
              <div className="bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800 p-4">
                <label className="text-sm font-bold text-amber-800 dark:text-amber-200 flex items-center gap-1.5 mb-2">
                  🔑 API Key Ollama Cloud
                </label>
                <input
                  type="password"
                  value={settings.ollamaApiKey}
                  onChange={e => updateSettings({ ollamaApiKey: e.target.value })}
                  className="w-full border border-amber-300 dark:border-amber-700 rounded-lg p-2.5 text-sm bg-white dark:bg-gray-800 focus:ring-2 focus:ring-amber-500 outline-none"
                  placeholder="Masukkan API key Ollama Cloud Anda"
                />
              </div>
            )}

            <div>
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-200 block mb-1">Model</label>
              <div className="flex gap-2 items-center">
                {isOllamaCloud ? (
                  <select
                    value={settings.ollamaModel}
                    onChange={e => updateSettings({ ollamaModel: e.target.value })}
                    className="flex-1 border border-gray-300 dark:border-gray-700 rounded-lg p-2.5 text-sm bg-white dark:bg-gray-800 focus:ring-2 focus:ring-green-500 outline-none"
                  >
                    {OLLAMA_CLOUD_MODELS.map(m => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                ) : (
                  <>
                    <input
                      value={settings.ollamaModel}
                      onChange={e => updateSettings({ ollamaModel: e.target.value })}
                      className="flex-1 border border-gray-300 dark:border-gray-700 rounded-lg p-2.5 text-sm bg-white dark:bg-gray-800 focus:ring-2 focus:ring-green-500 outline-none"
                      placeholder="misal: llama3.2 atau qwen2.5"
                    />
                    <button
                      onClick={fetchOllamaModels}
                      className="px-3 py-2.5 bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300 rounded-lg text-sm font-medium hover:bg-green-200"
                    >
                      🔄 Ambil
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* OpenRouter Settings */}
        {settings.provider === 'openrouter' && (
          <div className="space-y-4 mb-4 p-4 bg-purple-50/50 dark:bg-purple-950/30 rounded-xl border border-purple-100 dark:border-purple-900/50">
            <div>
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-200 block mb-1">Model OpenRouter</label>
              <select
                value={settings.openrouterModel}
                onChange={e => updateSettings({ openrouterModel: e.target.value })}
                className="w-full border border-gray-300 dark:border-gray-700 rounded-lg p-2.5 text-sm bg-white dark:bg-gray-800 focus:ring-2 focus:ring-purple-500 outline-none"
              >
                {OPENROUTER_MODELS.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-bold text-gray-800 dark:text-white block mb-1">🔑 OpenRouter API Key</label>
              <input
                type="password"
                value={settings.openrouterApiKey || ''}
                onChange={e => updateSettings({ openrouterApiKey: e.target.value })}
                className="w-full border border-purple-300 dark:border-purple-700 rounded-lg p-2.5 text-sm bg-white dark:bg-gray-800 focus:ring-2 focus:ring-purple-500 outline-none"
                placeholder="sk-or-v1-..."
              />
              <div className="bg-purple-100/70 dark:bg-purple-900/30 rounded-lg p-2.5 mt-2 border border-purple-200 dark:border-purple-800 text-xs text-purple-800 dark:text-purple-200">
                💡 Dapatkan API key di: <a href="https://openrouter.ai" target="_blank" rel="noreferrer" className="underline font-bold">openrouter.ai</a>
              </div>
            </div>
          </div>
        )}

        {/* Temperature & Tokens */}
        <div className="space-y-3 mb-5 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Parameter Lanjutan</p>
          <div>
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center justify-between">
              <span>Temperature</span>
              <span className="text-xs font-normal bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full">{settings.temperature}</span>
            </label>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] text-gray-400">Fokus</span>
              <input
                type="range" min="0" max="1" step="0.1"
                value={settings.temperature}
                onChange={e => updateSettings({ temperature: parseFloat(e.target.value) })}
                className="flex-1"
              />
              <span className="text-[10px] text-gray-400">Kreatif</span>
            </div>
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center justify-between">
              <span>Max Tokens</span>
              <span className="text-xs font-normal bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full">{settings.maxTokens}</span>
            </label>
            <input
              type="range" min="200" max="2000" step="100"
              value={settings.maxTokens}
              onChange={e => updateSettings({ maxTokens: parseInt(e.target.value) })}
              className="w-full mt-1"
            />
          </div>
        </div>

        {/* Test Connection */}
        <div className="mb-4">
          <button
            onClick={testConnection}
            disabled={testing}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-300 hover:border-blue-400 hover:text-blue-600 transition-all disabled:opacity-50"
          >
            {testing ? (
              <><div className="w-4 h-4 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" /> Menguji koneksi AI...</>
            ) : (
              <>🔌 Test Koneksi AI ({settings.provider.toUpperCase()})</>
            )}
          </button>
          {testResult && (
            <div className={`mt-2 p-3 rounded-lg text-xs ${testResult.ok ? 'bg-green-50 border border-green-200 text-green-700 dark:bg-green-950/40 dark:text-green-300' : 'bg-red-50 border border-red-200 text-red-700 dark:bg-red-950/40 dark:text-red-300'}`}>
              {testResult.ok ? '✅' : '❌'} {testResult.msg}
            </div>
          )}
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={isSyncing}
          className={`w-full py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
            saveFlash
              ? 'bg-green-600 text-white'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {isSyncing ? (
            <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Menyimpan ke Supabase...</>
          ) : saveFlash ? (
            '✅ Tersimpan ke Supabase & LocalStorage!'
          ) : (
            '💾 Simpan ke Supabase & Tutup'
          )}
        </button>
        <p className="text-center text-[11px] text-gray-400 mt-2.5 leading-relaxed">
          Pengaturan & API key tersimpan otomatis ke <strong>Supabase</strong> & <strong>Local Storage</strong>.
          <br />Anda tidak perlu memasukkan API key lagi saat membuka website di perangkat/komputer baru.
        </p>
      </div>
    </div>
  )
}
