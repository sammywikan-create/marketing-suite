import { NextRequest, NextResponse } from 'next/server'
import { callGemini } from '@/lib/ai/providers/gemini'
import { callOpenAI } from '@/lib/ai/providers/openai'
import { callOllama } from '@/lib/ai/providers/ollama'
import { callOpenRouter } from '@/lib/ai/providers/openrouter'
import {
  loadAffiliateSummaries,
  listLaporanHarianPeriods,
  loadLaporanHarianData,
  getStores,
} from '@/lib/db'

// ─── Build full business data context from Supabase ───
async function buildFullDataContext(storeId?: string): Promise<string> {
  const sections: string[] = []

  try {
    // 1. Store info
    const stores = await getStores()
    if (stores.length > 0) {
      const activeStore = storeId
        ? stores.find(s => s.id === storeId) || stores[0]
        : stores[0]
      sections.push(`=== INFORMASI TOKO ===\nToko Aktif: ${activeStore.name} (ID: ${activeStore.id})\nTotal Toko Terdaftar: ${stores.length}`)
    }

    // 2. Affiliate summaries (all periods)
    if (storeId) {
      try {
        const affSummaries = await loadAffiliateSummaries(storeId)
        if (affSummaries.length > 0) {
          const lines = affSummaries.map(s => {
            const sum = s.summary
            return `- ${s.period} (${s.platform}): GMV Rp ${sum.totalGMV.toLocaleString('id-ID')} | Net GMV Rp ${(sum.totalGMV - sum.totalRefundedGMV).toLocaleString('id-ID')} | Refund Rp ${sum.totalRefundedGMV.toLocaleString('id-ID')} (${sum.refundRate.toFixed(1)}%) | Kreator Aktif ${sum.activeCreators}/${sum.totalCreators} (${sum.activeRate.toFixed(1)}%) | Pesanan ${sum.totalOrders} | Komisi Rp ${sum.totalCommission.toLocaleString('id-ID')} | Video GMV Rp ${sum.videoGMV.toLocaleString('id-ID')} | LIVE GMV Rp ${sum.liveGMV.toLocaleString('id-ID')} | Card GMV Rp ${sum.productCardGMV.toLocaleString('id-ID')} | AOV Rp ${Math.round(sum.avgAOV).toLocaleString('id-ID')}`
          })
          sections.push(`=== DATA AFFILIATE (SEMUA PERIODE) ===\n${lines.join('\n')}`)
        }
      } catch (e) {
        console.warn('[AI Chat] Could not load affiliate summaries:', e)
      }
    }

    // 3. Laporan Harian (all available periods)
    try {
      const lhPeriods = await listLaporanHarianPeriods()
      if (lhPeriods.length > 0) {
        const lhLines: string[] = []
        // Load data for each available period (max 6 most recent to stay within context limits)
        const periodsToLoad = lhPeriods.slice(0, 6)
        for (const p of periodsToLoad) {
          try {
            const lhData = await loadLaporanHarianData(p.period)
            if (lhData?.summary) {
              const s = lhData.summary
              let line = `- ${p.period}: Omzet Store Rp ${(s.total_omzet || 0).toLocaleString('id-ID')} | Biaya Iklan Rp ${(s.total_biaya_iklan || 0).toLocaleString('id-ID')} | ROAS ${s.total_biaya_iklan > 0 ? (s.total_omzet / s.total_biaya_iklan).toFixed(2) : '0'}x | Closing ${s.total_closing || 0} | Botol ${s.total_botol || 0} | Upsell ${(s.rata_upsell || 0).toFixed(2)} | CAC Rp ${Math.round(s.rata_cac_ads || 0).toLocaleString('id-ID')} | ${s.hari || 0} hari data`

              // Add channel breakdown if available
              if (lhData.channels) {
                const chNames = Object.keys(lhData.channels)
                if (chNames.length > 0) {
                  const chParts = chNames.map(ch => {
                    const c = lhData.channels[ch]
                    return `${ch}: Rp ${(c.total_omzet || 0).toLocaleString('id-ID')}`
                  })
                  line += ` | Channels: ${chParts.join(', ')}`
                }
              }
              lhLines.push(line)
            }
          } catch {
            // Skip periods that fail to load
          }
        }
        if (lhLines.length > 0) {
          sections.push(`=== DATA LAPORAN HARIAN STORE / FRESHVISION (SEMUA PERIODE) ===\n${lhLines.join('\n')}`)
        }
      }
    } catch (e) {
      console.warn('[AI Chat] Could not load laporan harian:', e)
    }

  } catch (e) {
    console.warn('[AI Chat] Error building data context:', e)
  }

  if (sections.length === 0) return ''
  return '\n\n=== DATABASE BISNIS (DATA RIIL DARI SUPABASE) ===\n' + sections.join('\n\n')
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { systemPrompt, messages, settings, storeId } = body

    if (!systemPrompt || !messages || !settings) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Fetch full business data from Supabase and inject into system prompt
    const dataContext = await buildFullDataContext(storeId)
    const enrichedSystemPrompt = systemPrompt + dataContext

    console.log('[AI Chat] Data context length:', dataContext.length, 'chars')

    const effectiveMaxTokens = Math.max(settings.maxTokens || 8192, 8192)
    let content: string

    switch (settings.provider) {
      case 'gemini':
        content = await callGemini(
          enrichedSystemPrompt, messages,
          settings.geminiModel || 'gemini-2.5-flash',
          settings.temperature ?? 0.7,
          effectiveMaxTokens,
          settings.geminiApiKey
        )
        break
      case 'openai':
        content = await callOpenAI(
          enrichedSystemPrompt, messages,
          settings.openaiModel || 'gpt-4o-mini',
          settings.openaiBaseUrl || 'https://api.openai.com/v1',
          settings.openaiApiKey,
          settings.temperature ?? 0.7,
          effectiveMaxTokens
        )
        break
      case 'ollama': {
        const baseUrl = settings.ollamaBaseUrl || 'http://localhost:11434';
        if (process.env.VERCEL && (baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1'))) {
          throw new Error('Vercel tidak dapat mengakses Ollama di localhost. Harap gunakan IP publik (misal Ngrok) atau gunakan provider Gemini.');
        }

        content = await callOllama(
          enrichedSystemPrompt, messages,
          settings.ollamaModel || 'llama3.2',
          baseUrl,
          settings.temperature ?? 0.7,
          effectiveMaxTokens,
          settings.ollamaApiKey
        )
        break
      }
      case 'openrouter':
        content = await callOpenRouter(
          enrichedSystemPrompt, messages,
          settings.openrouterModel || 'google/gemini-flash-1.5',
          settings.temperature ?? 0.7,
          effectiveMaxTokens,
          settings.openrouterApiKey
        )
        break
      default:
        return NextResponse.json({ error: 'Provider AI tidak dikenal' }, { status: 400 })
    }

    return NextResponse.json({ content })
  } catch (err: any) {
    console.error('AI Chat Route Error:', err)
    return NextResponse.json({ error: err.message || 'Error processing request' }, { status: 500 })
  }
}
