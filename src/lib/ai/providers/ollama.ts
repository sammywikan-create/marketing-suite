export async function callOllama(
  systemPrompt: string,
  messages: { role: string; content: string }[],
  model: string = 'llama3.2',
  baseUrl: string = 'http://localhost:11434',
  temperature: number = 0.7,
  maxTokens: number = 600,
  apiKey?: string
): Promise<string> {
  // Normalize baseUrl to not have trailing slash
  const url = `${baseUrl.replace(/\/$/, '')}/api/chat`

  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const key = apiKey || process.env.OLLAMA_API_KEY
  if (key) {
    headers['Authorization'] = `Bearer ${key}`
  }

  const allMessages = [
    { role: 'system', content: systemPrompt },
    ...messages,
  ]

  console.log('[Ollama] Calling:', url, 'model:', model)
  console.log('[Ollama] Messages count:', allMessages.length, 'system prompt length:', systemPrompt.length)
  console.log('[Ollama] User message length:', messages[0]?.content?.length || 0)

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      messages: allMessages,
      stream: false,
      think: false,
      options: {
        temperature,
        num_predict: maxTokens,
      },
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    console.error('[Ollama] API error:', response.status, err)
    throw new Error(`Ollama error (${response.status}): ${err.slice(0, 200)}. Pastikan Ollama berjalan di ${baseUrl}`)
  }

  const rawText = await response.text()
  console.log('[Ollama] Raw response length:', rawText.length)

  let data: any
  try {
    data = JSON.parse(rawText)
  } catch {
    // Some Ollama responses may be NDJSON (streamed lines) even with stream:false
    // Try to parse the last complete JSON line
    const lines = rawText.trim().split('\n').filter(l => l.trim())
    let lastMessage = ''
    for (const line of lines) {
      try {
        const parsed = JSON.parse(line)
        if (parsed.message?.content) {
          lastMessage += parsed.message.content
        }
      } catch { /* skip non-JSON lines */ }
    }
    if (lastMessage) {
      console.log('[Ollama] Parsed NDJSON content length:', lastMessage.length)
      return lastMessage
    }
    console.error('[Ollama] Failed to parse response:', rawText.slice(0, 500))
    throw new Error('Gagal parse respons dari Ollama.')
  }

  console.log('[Ollama] Response done:', data.done, 'done_reason:', data.done_reason)
  console.log('[Ollama] Message keys:', data.message ? Object.keys(data.message) : 'no message')
  console.log('[Ollama] Content length:', data.message?.content?.length || 0)
  console.log('[Ollama] Thinking length:', data.message?.thinking?.length || 0)

  // Try content first, then thinking (some models use thinking mode)
  const content = data.message?.content || data.message?.thinking || data.response || ''
  if (!content || content.trim().length === 0) {
    console.error('[Ollama] Empty response. Full data:', JSON.stringify(data).slice(0, 1000))
    throw new Error('Ollama memberikan respons kosong. Coba model lain atau tingkatkan max tokens.')
  }

  return content
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
