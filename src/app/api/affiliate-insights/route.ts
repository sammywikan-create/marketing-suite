import { NextRequest, NextResponse } from 'next/server';
import { callGemini } from '@/lib/ai/providers/gemini';
import { callOllama } from '@/lib/ai/providers/ollama';
import { callOpenRouter } from '@/lib/ai/providers/openrouter';

// ─── System Prompt khusus Affiliate Manager ───────────────
const SYSTEM_PROMPT = `Anda adalah analis affiliate marketing senior yang menganalisis performa kreator TikTok Shop & Tokopedia.
Tugas Anda: berikan insight yang TAJAM, SPESIFIK, dan ACTIONABLE dalam bahasa Indonesia natural.

Format output (gunakan markdown):
## 📊 Ringkasan Performa Kreator
[Overview: total kreator aktif, total GMV, refund rate keseluruhan, highlights penting]

## 🏆 Kreator Top & Analisis Tier
[Identifikasi kreator terbaik, distribusi tier (Nano/Micro/Mid/Macro/Mega), rekomendasi fokus]

## ⚠️ Kreator yang Perlu Perhatian
[Kreator dengan refund tinggi, dormant, score rendah — berikan nama spesifik dan alasan]

## 📈 Peluang & Potensi
[Kreator "needs-push" yang bisa dioptimalkan, kreator dengan GMV/Video tinggi tapi score rendah]

## 💡 Rekomendasi Aksi (minggu ini)
[3-5 rekomendasi konkret: creator outreach, insentif, penanganan refund, dsb]

PENTING:
- Sebutkan nama kreator SPESIFIK dari data yang diberikan
- Selalu sertakan angka konkret (GMV, refund rate, score, dll)
- Bedakan rekomendasi untuk TikTok vs Tokopedia jika ada data keduanya
- Fokus pada ROI: prioritaskan kreator dengan potensi terbesar`;

// ─── Build prompt dari data affiliate ─────────────────────
function buildAffiliatePrompt(payload: {
  summary: Record<string, unknown>;
  topCreators: Array<Record<string, unknown>>;
  actionItems: Array<Record<string, unknown>>;
  tierBreakdown: Record<string, number>;
  period: string;
  platform: string;
  prevSummary?: Record<string, unknown>;
}): string {
  const { summary, topCreators, actionItems, tierBreakdown, period, platform, prevSummary } = payload;

  const fR = (n: number) => 'Rp' + Math.round(n).toLocaleString('id-ID');
  const fP = (n: number) => n.toFixed(1) + '%';

  let prompt = `# DATA AFFILIATE MANAGER — ${period} (${platform.toUpperCase()})\n\n`;

  // Summary
  prompt += `## Ringkasan Keseluruhan\n`;
  prompt += `- Total Kreator: ${summary.totalCreators || 0} (Aktif: ${summary.activeCreators || 0}, Tidak Aktif: ${summary.inactiveCreators || 0})\n`;
  prompt += `- Total GMV: ${fR(Number(summary.totalGMV || 0))}\n`;
  prompt += `- Total Order: ${Number(summary.totalOrders || 0).toLocaleString('id-ID')}\n`;
  prompt += `- Total Komisi: ${fR(Number(summary.totalCommission || 0))}\n`;
  prompt += `- Refund Rate: ${fP(Number(summary.refundRate || 0))}\n`;
  prompt += `- Avg GMV per Kreator Aktif: ${fR(Number(summary.avgGMVPerCreator || 0))}\n`;
  prompt += `- Top Kreator: ${summary.topCreator || 'N/A'} (${fR(Number(summary.topCreatorGMV || 0))})\n`;
  prompt += `- Active Rate: ${fP(Number(summary.activeRate || 0))}\n`;

  // Tier breakdown
  if (Object.keys(tierBreakdown).length > 0) {
    prompt += `\n## Distribusi Tier Kreator\n`;
    Object.entries(tierBreakdown).forEach(([tier, count]) => {
      if (count > 0) prompt += `- ${tier}: ${count} kreator\n`;
    });
  }

  // Top Creators (max 10)
  if (topCreators.length > 0) {
    prompt += `\n## Top ${Math.min(topCreators.length, 10)} Kreator berdasarkan GMV\n`;
    topCreators.slice(0, 10).forEach((c, i) => {
      prompt += `${i + 1}. **${c.creatorUsername}** (${c.creatorTier})\n`;
      prompt += `   - GMV: ${fR(Number(c.affiliateGMV || 0))}, Orders: ${c.affiliateOrders || 0}, Videos: ${c.affiliateShoppableVideos || 0}\n`;
      prompt += `   - Refund: ${fP(Number(c.refundRate || 0))}, Score: ${c.creatorScore || 0}/100, Upsell followers: ${Number(c.affiliateFollowers || 0).toLocaleString()}\n`;
    });
  }

  // Action Items
  if (actionItems.length > 0) {
    prompt += `\n## Kreator yang Butuh Perhatian (Action Items)\n`;
    actionItems.slice(0, 8).forEach((item) => {
      prompt += `- **[${String(item.severity || '').toUpperCase()}]** ${item.creator}: ${item.reason}\n`;
    });
  }

  // Previous period comparison
  if (prevSummary) {
    prompt += `\n## Perbandingan vs Periode Sebelumnya\n`;
    const delta = (curr: number, prev: number) =>
      prev > 0 ? ` (Δ ${(((curr - prev) / prev) * 100).toFixed(1)}%)` : '';
    const curGMV = Number(summary.totalGMV || 0);
    const prevGMV = Number(prevSummary.totalGMV || 0);
    const curActive = Number(summary.activeCreators || 0);
    const prevActive = Number(prevSummary.activeCreators || 0);
    prompt += `- GMV: ${fR(curGMV)} vs ${fR(prevGMV)}${delta(curGMV, prevGMV)}\n`;
    prompt += `- Kreator Aktif: ${curActive} vs ${prevActive}${delta(curActive, prevActive)}\n`;
    prompt += `- Refund Rate: ${fP(Number(summary.refundRate || 0))} vs ${fP(Number(prevSummary.refundRate || 0))}\n`;
  }

  prompt += `\n---\nBerikan analisis sesuai format yang diminta. Sebutkan nama kreator spesifik. Fokus pada aksi yang bisa dilakukan minggu ini.`;
  return prompt;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { summary, topCreators, actionItems, tierBreakdown, period, platform, prevSummary, settings } = body;

    if (!summary || !settings) {
      return NextResponse.json({ error: 'Missing summary or settings' }, { status: 400 });
    }

    const userPrompt = buildAffiliatePrompt({
      summary: summary || {},
      topCreators: topCreators || [],
      actionItems: actionItems || [],
      tierBreakdown: tierBreakdown || {},
      period: period || 'periode aktif',
      platform: platform || 'tiktok',
      prevSummary,
    });

    console.log('[Affiliate-Insights] Provider:', settings.provider, '| prompt length:', userPrompt.length);
    const messages = [{ role: 'user' as const, content: userPrompt }];

    let content: string;
    switch (settings.provider) {
      case 'gemini':
        content = await callGemini(
          SYSTEM_PROMPT, messages,
          settings.geminiModel || 'gemini-1.5-flash',
          settings.temperature ?? 0.5,
          settings.maxTokens ?? 1500,
        );
        break;
      case 'ollama': {
        const baseUrl = settings.ollamaBaseUrl || 'http://localhost:11434';
        if (process.env.VERCEL && (baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1'))) {
          throw new Error('Vercel tidak dapat mengakses Ollama di localhost. Harap gunakan IP publik (misal Ngrok) atau gunakan provider Gemini.');
        }

        content = await callOllama(
          SYSTEM_PROMPT, messages,
          settings.ollamaModel || 'llama3.2',
          baseUrl,
          settings.temperature ?? 0.5,
          Math.max(settings.maxTokens || 2000, 2000),
          settings.ollamaApiKey,
        );
        break;
      }
      case 'openrouter':
        content = await callOpenRouter(
          SYSTEM_PROMPT, messages,
          settings.openrouterModel || 'google/gemini-flash-1.5',
          settings.temperature ?? 0.5,
          settings.maxTokens ?? 1500,
        );
        break;
      default:
        return NextResponse.json({ error: `Provider '${settings.provider}' tidak dikenal` }, { status: 400 });
    }

    return NextResponse.json({ content });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Terjadi kesalahan pada server AI';
    console.error('[Affiliate-Insights] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
