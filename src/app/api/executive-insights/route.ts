import { NextRequest, NextResponse } from 'next/server';
import { callGemini } from '@/lib/ai/providers/gemini';
import { callOllama } from '@/lib/ai/providers/ollama';
import { callOpenRouter } from '@/lib/ai/providers/openrouter';

// ─── System Prompt Executive Summary ─────────────────────────
const SYSTEM_PROMPT = `Anda adalah konsultan bisnis senior yang menganalisis performa bisnis FreshVision secara menyeluruh.
Anda menerima data gabungan dari: Affiliate Manager (kreator TikTok/Tokopedia) + Laporan Harian (iklan, omzet, ROI).

Format output (gunakan markdown):
## 🎯 Kesimpulan Eksekutif
[1-2 paragraf: kondisi bisnis saat ini secara keseluruhan, highlight terpenting]

## 📊 Analisis Performa
[Komentar spesifik tentang: omzet, biaya iklan, ROAS, margin, kreator affiliate, refund rate]

## ⚠️ Temuan Kritis
[Masalah utama yang HARUS segera ditangani, dengan angka konkret]

## ✅ Yang Sudah Berjalan Baik
[Aspek positif yang perlu dipertahankan]

## 🚀 Langkah Aksi (Prioritas Minggu Ini)
[5 langkah konkret, spesifik, terurut berdasarkan prioritas]
1. ...
2. ...
3. ...
4. ...
5. ...

PENTING:
- Selalu sertakan angka konkret dari data
- Rekomendasi HARUS actionable dan spesifik
- Bedakan channel: Video vs Live vs SHOP vs Affiliate
- Fokus pada ROI dan profitabilitas`;

function buildExecPrompt(payload: {
  // Laporan Harian
  lh: {
    total_omzet: number;
    total_biaya_iklan: number;
    roas: number;
    rata_cac_ads: number;
    margin_after_cost: number;
    total_closing: number;
    total_botol: number;
    rata_upsell: number;
    cost_per_closing: number;
    hari: number;
    channels: Record<string, { total_omzet: number; total_biaya_iklan: number; roi: number }>;
  } | null;
  // Affiliate
  aff: {
    totalGMV: number;
    netGMV: number;
    totalRefund: number;
    refundRate: number;
    totalOrders: number;
    activeCreators: number;
    totalCreators: number;
    totalCommission: number;
    videoGMV: number;
    liveGMV: number;
    momGrowth: number | null;
    topCreator: string;
    topCreatorGMV: number;
  } | null;
  period: string;
  targetGMV: number;
  targetProgress: number;
}): string {
  const { lh, aff, period, targetGMV, targetProgress } = payload;
  const fR = (n: number) => 'Rp' + Math.round(n).toLocaleString('id-ID');
  const fP = (n: number) => n.toFixed(1) + '%';

  let prompt = `# DATA EXECUTIVE SUMMARY — ${period}\n\n`;

  if (lh) {
    prompt += `## LAPORAN HARIAN — FreshVision\n`;
    prompt += `- Total Omzet FreshVision: ${fR(lh.total_omzet)}\n`;
    prompt += `- Total Biaya Iklan: ${fR(lh.total_biaya_iklan)}\n`;
    prompt += `- ROAS: ${lh.roas.toFixed(2)}x\n`;
    prompt += `- CAC Ads: ${fR(lh.rata_cac_ads)}\n`;
    prompt += `- Margin Bersih: ${fR(lh.margin_after_cost)}\n`;
    prompt += `- Total Closing: ${Math.round(lh.total_closing).toLocaleString('id-ID')}\n`;
    prompt += `- Total Botol: ${Math.round(lh.total_botol).toLocaleString('id-ID')}\n`;
    prompt += `- Avg Upsell: ${lh.rata_upsell.toFixed(1)}x\n`;
    prompt += `- Hari Data: ${lh.hari} hari\n`;
    if (lh.channels) {
      prompt += `\nBreakdown Channel:\n`;
      Object.entries(lh.channels).forEach(([ch, d]) => {
        if (d.total_omzet > 0) {
          prompt += `  - ${ch.toUpperCase()}: Omzet ${fR(d.total_omzet)}, Iklan ${fR(d.total_biaya_iklan)}, ROI ${d.roi.toFixed(1)}x\n`;
        }
      });
    }
  } else {
    prompt += `## LAPORAN HARIAN: Data tidak tersedia\n`;
  }

  if (aff) {
    prompt += `\n## AFFILIATE MANAGER\n`;
    prompt += `- GMV Affiliate Total: ${fR(aff.totalGMV)}\n`;
    prompt += `- Net GMV (setelah refund): ${fR(aff.netGMV)}\n`;
    prompt += `- Total Refund: ${fR(aff.totalRefund)} (${fP(aff.refundRate)})\n`;
    prompt += `- Total Pesanan: ${aff.totalOrders.toLocaleString('id-ID')}\n`;
    prompt += `- Kreator Aktif: ${aff.activeCreators} dari ${aff.totalCreators} (${fP(aff.totalCreators > 0 ? (aff.activeCreators / aff.totalCreators) * 100 : 0)})\n`;
    prompt += `- Komisi Affiliate: ${fR(aff.totalCommission)}\n`;
    prompt += `- GMV dari Video: ${fR(aff.videoGMV)}, dari LIVE: ${fR(aff.liveGMV)}\n`;
    prompt += `- Top Kreator: ${aff.topCreator} (${fR(aff.topCreatorGMV)})\n`;
    if (aff.momGrowth !== null) {
      prompt += `- Growth MoM: ${aff.momGrowth >= 0 ? '+' : ''}${aff.momGrowth.toFixed(1)}%\n`;
    }
  } else {
    prompt += `\n## AFFILIATE: Data tidak tersedia\n`;
  }

  if (targetGMV > 0) {
    prompt += `\n## TARGET\n`;
    prompt += `- Target GMV: ${fR(targetGMV)}\n`;
    prompt += `- Progress: ${fP(targetProgress)}\n`;
    if (aff) {
      prompt += `- Sisa yang dibutuhkan: ${fR(Math.max(0, targetGMV - aff.totalGMV))}\n`;
    }
  }

  prompt += `\n---\nBerikan evaluasi lengkap sesuai format yang diminta. Fokus pada langkah konkret yang bisa dilakukan minggu ini.`;
  return prompt;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { lh, aff, period, targetGMV, targetProgress, settings } = body;

    if (!settings) return NextResponse.json({ error: 'Missing settings' }, { status: 400 });

    const userPrompt = buildExecPrompt({ lh, aff, period, targetGMV, targetProgress });
    const messages = [{ role: 'user' as const, content: userPrompt }];

    let content: string;
    switch (settings.provider) {
      case 'gemini':
        content = await callGemini(SYSTEM_PROMPT, messages, settings.geminiModel || 'gemini-1.5-flash', settings.temperature ?? 0.5, Math.max(settings.maxTokens || 2000, 2000));
        break;
      case 'ollama':
        content = await callOllama(SYSTEM_PROMPT, messages, settings.ollamaModel || 'llama3.2', settings.ollamaBaseUrl || 'http://localhost:11434', settings.temperature ?? 0.5, Math.max(settings.maxTokens || 2000, 2000), settings.ollamaMode || 'local', settings.ollamaApiKey);
        break;
      case 'openrouter':
        content = await callOpenRouter(SYSTEM_PROMPT, messages, settings.openrouterModel || 'google/gemini-flash-1.5', settings.temperature ?? 0.5, Math.max(settings.maxTokens || 2000, 2000));
        break;
      default:
        return NextResponse.json({ error: `Provider '${settings.provider}' tidak dikenal` }, { status: 400 });
    }

    return NextResponse.json({ content });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Terjadi kesalahan pada server AI';
    console.error('[Executive-Insights]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
