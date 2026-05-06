export async function callOllama(
  systemPrompt: string,
  messages: { role: string; content: string }[],
  model: string = 'llama3.2',
  baseUrl: string = 'http://localhost:11434',
  temperature: number = 0.7,
  maxTokens: number = 600,
  mode: 'local' | 'cloud' = 'local',
  apiKey?: string
): Promise<string> {
  const isCloud = mode === 'cloud'
  const url = isCloud ? 'https://ollama.com/api/chat' : `${baseUrl}/api/chat`

  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (isCloud) {
    const key = apiKey || process.env.OLLAMA_API_KEY
    if (!key) throw new Error('OLLAMA_API_KEY tidak ditemukan')
    headers['Authorization'] = `Bearer ${key}`
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
      stream: false,
      options: {
        temperature,
        num_predict: maxTokens,
      },
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(isCloud
      ? `Ollama Cloud error: ${err}. Pastikan OLLAMA_API_KEY sudah benar.`
      : `Ollama error: ${err}. Pastikan Ollama sudah berjalan di ${baseUrl}`
    )
  }

  const data = await response.json()
  return data.message?.content || 'Tidak ada respons dari Ollama.'
}

export async function getOllamaModels(
  baseUrl: string = 'http://localhost:11434'
): Promise<{ value: string; label: string }[]> {
  try {
    const res = await fetch(`${baseUrl}/api/tags`)
    const data = await res.json()
    return (data.models || []).map((m: any) => ({
      value: m.name,
      label: m.name,
    }))
  } catch {
    return [
      { value: 'llama3.2', label: 'llama3.2 (default)' },
      { value: 'mistral', label: 'mistral' },
      { value: 'gemma2', label: 'gemma2' },
      { value: 'qwen2.5', label: 'qwen2.5' },
    ]
  }
}

export const OLLAMA_CLOUD_MODELS = [
  { value: 'qwen3.5', label: 'Qwen 3.5 (Alibaba) — 6.4M pulls' },
  { value: 'gemma4', label: 'Gemma 4 (Google) — 3.5M pulls' },
  { value: 'qwen3-coder-next', label: 'Qwen3 Coder Next — 1.1M pulls' },
  { value: 'ministral-3', label: 'Ministral 3 (Mistral) — 944K pulls' },
  { value: 'devstral-small-2', label: 'Devstral Small 2 — 776K pulls' },
  { value: 'qwen3-next', label: 'Qwen3 Next 80B — 520K pulls' },
  { value: 'nemotron-3-nano', label: 'Nemotron 3 Nano (NVIDIA) — 393K pulls' },
  { value: 'nemotron-3-super', label: 'Nemotron 3 Super 120B (NVIDIA) — 231K pulls' },
  { value: 'kimi-k2.5', label: 'Kimi K2.5 — 245K pulls' },
  { value: 'deepseek-v3.2', label: 'DeepSeek V3.2 — 79K pulls' },
  { value: 'glm-5.1', label: 'GLM 5.1 (Z.ai) — 50K pulls' },
  { value: 'gemini-3-flash-preview', label: 'Gemini 3 Flash Preview — 133K pulls' },
]
