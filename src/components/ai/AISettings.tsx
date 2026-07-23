'use client'
import { useState, useEffect } from 'react'
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
  const [saveFlash, setSaveFlash] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null)
  const [testing, setTesting] = useState(false)

  const fetchOllamaModels = async () => {
    try {
      const res = await fetch(`${settings.ollamaBaseUrl}/api/tags`)
      const data = await res.json()
      const models = (data.models || []).map((m: any) => ({ value: m.name, label: m.name }))
      if (models.length > 0) setOllamaLocalModels(models)
    } catch { /* keep defaults */ }
  }

  const isOllamaCloud = !settings.ollamaBaseUrl?.includes('localhost') && !settings.ollamaBaseUrl?.includes('127.0.0.1')
  const ollamaModels = isOllamaCloud ? OLLAMA_CLOUD_MODELS : ollamaLocalModels

  // Quick test connection
  const testConnection = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Halo, jawab singkat: kamu siapa?' }],
          settings,
          systemPrompt: 'Kamu adalah AI asisten. Jawab singkat.',
          page: 'test',
        }),
      })
      if (res.ok) {
        const d = await res.json()
        setTestResult({ ok: true, msg: d.content?.slice(0, 100) || 'Koneksi berhasil!' })
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
    { value: 'gemini', label: '🔵 Google Gemini', desc: 'Gratis & powerful. Butuh Gemini API Key.' },
    { value: 'ollama', label: '🟢 Ollama', desc: 'Lokal (gratis, privat) atau Cloud (butuh API key).' },
    { value: 'openrouter', label: '🟣 OpenRouter', desc: 'Akses 100+ model AI. Ada opsi gratis.' },
  ]

  // Show save flash when settings change
  const handleSave = () => {
    setSaveFlash(true)
    setTimeout(() => setSaveFlash(false), 2000)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 w-[520px] max-h-[85vh] overflow-y-auto shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">⚙️ Pengaturan AI</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>

        {/* Status Badge */}
        <div className={`mb-4 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium ${
          settings.provider === 'ollama' && isOllamaCloud && settings.ollamaApiKey
            ? 'bg-green-50 text-green-700 border border-green-200'
            : settings.provider === 'ollama' && isOllamaCloud && !settings.ollamaApiKey
            ? 'bg-amber-50 text-amber-700 border border-amber-200'
            : 'bg-blue-50 text-blue-700 border border-blue-200'
        }`}>
          <span className={`w-2 h-2 rounded-full ${
            settings.provider === 'ollama' && isOllamaCloud && settings.ollamaApiKey
              ? 'bg-green-500'
              : settings.provider === 'ollama' && isOllamaCloud && !settings.ollamaApiKey
              ? 'bg-amber-500 animate-pulse'
              : 'bg-blue-500'
          }`} />
          {settings.provider === 'ollama' && isOllamaCloud
            ? settings.ollamaApiKey
              ? `✅ Ollama Cloud terkonfigurasi — API Key tersimpan · Model: ${settings.ollamaModel}`
              : '⚠️ API Key Ollama Cloud belum diisi'
            : settings.provider === 'ollama'
            ? `Ollama Lokal — ${settings.ollamaBaseUrl} · Model: ${settings.ollamaModel}`
            : settings.provider === 'gemini'
            ? `Gemini — Model: ${settings.geminiModel}`
            : `OpenRouter — Model: ${settings.openrouterModel}`
          }
        </div>

        {/* Provider Selection */}
        <div className="mb-5">
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
          <div className="space-y-3 mb-4 p-4 bg-blue-50/50 rounded-xl border border-blue-100">
            <label className="text-sm font-semibold text-gray-700">Model Gemini</label>
            <select
              value={settings.geminiModel}
              onChange={e => updateSettings({ geminiModel: e.target.value })}
              className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              {GEMINI_MODELS.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
            <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
              <p className="text-xs text-blue-700">
                💡 Dapatkan API key gratis di: <strong>aistudio.google.com</strong> → tambahkan ke <code className="bg-blue-100 px-1 rounded">.env.local</code> sebagai <code className="bg-blue-100 px-1 rounded">GEMINI_API_KEY</code>
              </p>
            </div>
          </div>
        )}

        {/* Ollama Settings */}
        {settings.provider === 'ollama' && (
          <div className="space-y-4 mb-4 p-4 bg-green-50/50 rounded-xl border border-green-100">
            {/* Mode Toggle */}
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-2 block">Mode Ollama</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => updateSettings({ ollamaBaseUrl: 'http://localhost:11434' })}
                  className={`p-3 rounded-lg border-2 text-left transition-all ${
                    !isOllamaCloud ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'
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
                    isOllamaCloud ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-sm font-semibold">☁️ Cloud</div>
                  <div className="text-[11px] text-gray-500">Butuh API Key</div>
                </button>
              </div>
            </div>

            {/* Base URL */}
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-1">Base URL</label>
              <input
                value={settings.ollamaBaseUrl}
                onChange={e => updateSettings({ ollamaBaseUrl: e.target.value })}
                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-white focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                placeholder={isOllamaCloud ? "https://api.anda.com" : "http://localhost:11434"}
              />
            </div>

            {/* API Key — prominent for Cloud */}
            {isOllamaCloud && (
              <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
                <label className="text-sm font-bold text-amber-800 flex items-center gap-1.5 mb-2">
                  🔑 API Key Ollama Cloud
                  <span className="text-[10px] font-normal bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded-full">WAJIB</span>
                </label>
                <input
                  type="password"
                  value={settings.ollamaApiKey}
                  onChange={e => updateSettings({ ollamaApiKey: e.target.value })}
                  className="w-full border border-amber-300 rounded-lg p-2.5 text-sm bg-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                  placeholder="Masukkan API key Ollama Cloud Anda"
                />
                {settings.ollamaApiKey ? (
                  <div className="flex items-center gap-1.5 mt-2 text-xs text-green-700">
                    <span className="w-2 h-2 bg-green-500 rounded-full" />
                    API Key tersimpan otomatis di browser — tidak perlu input ulang.
                  </div>
                ) : (
                  <p className="text-xs text-amber-600 mt-2">
                    ⚠️ API Key belum diisi. AI tidak bisa digunakan tanpa API Key.
                  </p>
                )}
              </div>
            )}

            {/* API Key for local (optional) */}
            {!isOllamaCloud && (
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-1">
                  API Key <span className="text-xs text-gray-400 font-normal">(Opsional)</span>
                </label>
                <input
                  type="password"
                  value={settings.ollamaApiKey}
                  onChange={e => updateSettings({ ollamaApiKey: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-white focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                  placeholder="Isi jika server Ollama diproteksi"
                />
              </div>
            )}

            {/* Model Selection */}
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-1">Model</label>
              <div className="flex gap-2 items-center">
                {isOllamaCloud ? (
                  <select
                    value={settings.ollamaModel}
                    onChange={e => updateSettings({ ollamaModel: e.target.value })}
                    className="flex-1 border border-gray-300 rounded-lg p-2.5 text-sm bg-white focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
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
                      className="flex-1 border border-gray-300 rounded-lg p-2.5 text-sm bg-white focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                      placeholder="misal: llama3.2 atau qwen2.5"
                      list="ollama-models"
                    />
                    <datalist id="ollama-models">
                      {ollamaLocalModels.map(m => (
                        <option key={m.value} value={m.value} />
                      ))}
                    </datalist>
                    <button
                      onClick={fetchOllamaModels}
                      className="px-3 py-2.5 bg-green-100 text-green-700 rounded-lg text-sm hover:bg-green-200 transition-colors whitespace-nowrap font-medium"
                    >
                      🔄 Ambil
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Info box */}
            <div className={`rounded-lg p-3 border text-xs ${isOllamaCloud ? 'bg-green-50 border-green-100 text-green-700' : 'bg-gray-50 border-gray-100 text-gray-600'}`}>
              {isOllamaCloud ? (
                <>
                  💡 <strong>Pengaturan Anda tersimpan otomatis</strong> di browser menggunakan Local Storage. 
                  Anda tidak perlu input ulang API Key setiap kali membuka website.
                </>
              ) : (
                <>
                  💡 Jika menggunakan Ollama lokal, pastikan URL <strong>http://localhost:11434</strong> dapat diakses.
                </>
              )}
            </div>
          </div>
        )}

        {/* OpenRouter Settings */}
        {settings.provider === 'openrouter' && (
          <div className="space-y-3 mb-4 p-4 bg-purple-50/50 rounded-xl border border-purple-100">
            <label className="text-sm font-semibold text-gray-700">Model OpenRouter</label>
            <select
              value={settings.openrouterModel}
              onChange={e => updateSettings({ openrouterModel: e.target.value })}
              className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
            >
              {OPENROUTER_MODELS.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
            <div className="bg-purple-50 rounded-lg p-3 border border-purple-100">
              <p className="text-xs text-purple-700">
                💡 Dapatkan API key di: <strong>openrouter.ai</strong> → tambahkan ke <code className="bg-purple-100 px-1 rounded">.env.local</code> sebagai <code className="bg-purple-100 px-1 rounded">OPENROUTER_API_KEY</code>
              </p>
            </div>
          </div>
        )}

        {/* Temperature & Tokens */}
        <div className="space-y-3 mb-5 p-4 bg-gray-50 rounded-xl border border-gray-100">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Parameter Lanjutan</p>
          <div>
            <label className="text-sm font-semibold text-gray-700 flex items-center justify-between">
              <span>Temperature</span>
              <span className="text-xs font-normal bg-gray-200 px-2 py-0.5 rounded-full text-gray-600">{settings.temperature}</span>
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
            <label className="text-sm font-semibold text-gray-700 flex items-center justify-between">
              <span>Max Tokens</span>
              <span className="text-xs font-normal bg-gray-200 px-2 py-0.5 rounded-full text-gray-600">{settings.maxTokens}</span>
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
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-gray-300 text-sm font-medium text-gray-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all disabled:opacity-50"
          >
            {testing ? (
              <><div className="w-4 h-4 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" /> Menguji koneksi...</>
            ) : (
              <>🔌 Test Koneksi AI</>
            )}
          </button>
          {testResult && (
            <div className={`mt-2 p-3 rounded-lg text-xs ${testResult.ok ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
              {testResult.ok ? '✅' : '❌'} {testResult.msg}
            </div>
          )}
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          className={`w-full py-3 rounded-xl font-semibold transition-all ${
            saveFlash
              ? 'bg-green-600 text-white'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {saveFlash ? '✅ Tersimpan!' : '✅ Simpan & Tutup'}
        </button>
        <p className="text-center text-[10px] text-gray-400 mt-2">
          Pengaturan tersimpan otomatis di browser Anda (Local Storage).
          <br />Anda tidak perlu mengisi ulang setiap kali membuka website.
        </p>
      </div>
    </div>
  )
}
