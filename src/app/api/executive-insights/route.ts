import { NextRequest, NextResponse } from 'next/server';
import { callGemini } from '@/lib/ai/providers/gemini';
import { callOpenAI } from '@/lib/ai/providers/openai';
import { callOllama } from '@/lib/ai/providers/ollama';
import { callOpenRouter } from '@/lib/ai/providers/openrouter';

// ─── System Prompt Executive Summary (Deep & Comprehensive) ───
const SYSTEM_PROMPT = `Anda adalah Senior Chief Business & E-Commerce Strategist yang menganalisis performa bisnis FreshVision secara menyeluruh.
Tugas Anda: Sajikan Laporan Lanjutan & Deep-Dive Executive Analysis yang TAJAM, SANGAT DETAIL, MATEMATIS, dan STRATEGIS (Bahasa Indonesia).

Format Output Wajib (Gunakan Markdown Kaya Format):

## 🎯 1. Diagnosis Eksekutif & Summary Kesehatan Bisnis
[Analisis mendalam 2-3 paragraf mengenai kondisi PnL dan profitabilitas bisnis saat ini. Pembedahan run-rate omzet harian vs target, margin bersih setelah iklan (Margin After Ad Cost), serta kontribusi utama omzet FreshVision].

## 📊 2. Dekonstruksi Performa Finansial & Paid Ads ROI
[Analisis mendalam dengan angka konkret mengenai:
- Efisiensi Ad Spend & Rasio ROAS (Bandingkan vs benchmark ideal >3.0x).
- Cost Per Acquisition (CAC) & Cost Per Closing (Bandingkan vs margin per botol).
- Breakdown Efisiensi Per Channel: Video Ads vs LIVE Streaming Ads vs Product Card (SHOP) vs Affiliate Sales.
- Evaluasi Upsell Bottleneck (Rata-rata botol per transaksi)].

## 👥 3. Audit Performa Affiliate & Sinergi Marketing
[Pembedahan mendalam tentang ekosistem affiliate:
- Keaktifan Kreator: Rasio kreator aktif vs total database (Bandingkan vs benchmark >25%).
- Ketergantungan Top Creator: Seberapa dominan kreator nomor 1 terhadap total GMV affiliate?
- Evaluasi Refund Rate & Kebocoran Komisi: Rasio refund nominal & dampaknya terhadap Net GMV].

## ⚠️ 4. Temuan Kritis, Risiko & Akar Masalah (Root Cause)
[Identifikasi 3-4 masalah/kebocoran terbesar bisnis saat ini:
- Sertakan diagnosa Akar Masalah (Root Cause Analysis).
- Kalkulasi dampak finansial (Estimasi potensi omzet/profit yang hilang dalam Rupiah).
- Derajat Bahaya (Kritis / Waspada)].

## 🚀 5. Blueprint & Roadmap Strategis Eksekusi 30 Hari
[Buat rencana kerja berjenjang yang actionable per minggu]:
- **Minggu 1 (Emergency & Quick Wins)**: Fix kebocoran iklan, alokasi budget ulang, & reaktivasi kreator.
- **Minggu 2 (Scaling Top Performers)**: Scale-up ad spend channel efisien & dorong upsell botol.
- **Minggu 3 (Affiliate Push & Campaign Optimization)**: Insentif kreator tier mid/nano & optimasi creative hook.
- **Minggu 4 (Review & Profit Lock)**: Audit Margin After Cost & penyesuaian target bulan depan.

ATURAN WAJIB:
- Sertakan ANGKA KONKRET (Rp, %, Rasio, Jumlah Kreator) dari data di setiap bagian.
- Analisis HARUS mendalam dan komprehensif, HINDARI rangkuman pendek atau jawaban umum.
- Tulis dengan gaya konsultan manajemen kelas atas: lugas, kritis, berbobot, dan berbasis data.`;

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
    activePromoters?: number;
    totalCreators: number;
    totalCommission: number;
    videoGMV: number;
    liveGMV: number;
    momGrowth: number | null;
    topCreator: string;
    topCreatorGMV: number;
  } | null;
  period: string;
}): string {
  const { lh, aff, period } = payload;
  const fR = (n: number) => 'Rp ' + Math.round(n).toLocaleString('id-ID');
  const fP = (n: number) => n.toFixed(1) + '%';
  const fX = (n: number) => n.toFixed(2) + 'x';

  let p = `# DATA INTEGRASI BISNIS EXECUTIVE SUMMARY — ${period}\n\n`;

  if (lh) {
    p += `## 1. DATA LAPORAN HARIAN (STORE & ADVERTISING)\n`;
    p += `- Durasi Periode: ${lh.hari} hari\n`;
    p += `- Total Omzet Pembukuan Store (FreshVision): ${fR(lh.total_omzet)} (Rata-rata: ${fR(lh.hari > 0 ? lh.total_omzet / lh.hari : 0)}/hari)\n`;
    p += `- Total Biaya Iklan (Ad Spend): ${fR(lh.total_biaya_iklan)} (Rata-rata: ${fR(lh.hari > 0 ? lh.total_biaya_iklan / lh.hari : 0)}/hari)\n`;
    p += `- ROAS (Return on Ad Spend): ${fX(lh.roas)}\n`;
    p += `- CAC Iklan (Cost Per Acquisition): ${fR(lh.rata_cac_ads)}/closing\n`;
    p += `- Margin Setelah Iklan (Margin After Cost): ${fR(lh.margin_after_cost)}\n`;
    p += `- Total Closing (Transaksi): ${lh.total_closing.toLocaleString('id-ID')} order\n`;
    p += `- Total Botol Terjual: ${lh.total_botol.toLocaleString('id-ID')} botol\n`;
    p += `- Rata-rata Upsell: ${lh.rata_upsell.toFixed(2)} botol/closing\n`;
    p += `- Cost Per Closing Net: ${fR(lh.cost_per_closing)}\n`;
    if (lh.channels && Object.keys(lh.channels).length > 0) {
      p += `- Performance Per Channel:\n`;
      for (const [ch, d] of Object.entries(lh.channels)) {
        p += `  * Channel [${ch}]: Omzet ${fR(d.total_omzet)} | Ad Spend ${fR(d.total_biaya_iklan)} | ROI ${fX(d.roi)}\n`;
      }
    }
    p += `\n`;
  } else {
    p += `## 1. DATA LAPORAN HARIAN: Data belum tersedia/belum diisi untuk periode ini.\n\n`;
  }

  if (aff) {
    p += `## 2. DATA AFFILIATE MANAGER (KREATOR & COMMUNITY)\n`;
    p += `- Total Gross GMV Affiliate: ${fR(aff.totalGMV)}\n`;
    p += `- Net GMV Affiliate (setelah refund): ${fR(aff.netGMV)}\n`;
    p += `- Total Refund: ${fR(aff.totalRefund)} (Refund Rate: ${fP(aff.refundRate)})\n`;
    p += `- Total Order Affiliate: ${aff.totalOrders.toLocaleString('id-ID')} order\n`;
    p += `- Database Kreator: ${aff.totalCreators} kreator (Aktif Promosi: ${aff.activePromoters || aff.activeCreators} kreator / ${fP(aff.totalCreators > 0 ? ((aff.activePromoters || aff.activeCreators) / aff.totalCreators) * 100 : 0)})\n`;
    p += `- Total Komisi Dibayarkan: ${fR(aff.totalCommission)}\n`;
    p += `- Breakout Channel GMV: Video Shoppable = ${fR(aff.videoGMV)} | LIVE Streaming = ${fR(aff.liveGMV)}\n`;
    if (aff.momGrowth !== null) p += `- Pertumbuhan MoM GMV: ${aff.momGrowth >= 0 ? '+' : ''}${fP(aff.momGrowth)}\n`;
    if (aff.topCreator) p += `- Top Performer Creator: ${aff.topCreator} (GMV: ${fR(aff.topCreatorGMV)} / ${fP(aff.totalGMV > 0 ? (aff.topCreatorGMV / aff.totalGMV) * 100 : 0)} dari total affiliate)\n`;
    p += `\n`;
  } else {
    p += `## 2. DATA AFFILIATE MANAGER: Data belum tersedia untuk periode ini.\n\n`;
  }

  p += `Berdasarkan data lengkap di atas, berikan Laporan Analisis Eksekutif yang SANGAT DETAIL, MENDALAM, MATEMATIS, dan ACTIONABLE sesuai format 5 bagian di atas.`;
  return p;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { lh, aff, period, settings } = body;

    const userPrompt = buildExecPrompt({ lh, aff, period: period || 'Bulan Ini' });
    const messages = [{ role: 'user' as const, content: userPrompt }];

    const resolvedOllamaKey = settings?.ollamaApiKey || process.env.OLLAMA_API_KEY;
    const provider = settings?.provider || 'gemini';
    const targetMaxTokens = Math.max(settings?.maxTokens || 3500, 3500);

    let content: string;

    switch (provider) {
      case 'gemini':
        content = await callGemini(
          SYSTEM_PROMPT, messages,
          settings?.geminiModel || 'gemini-2.5-flash',
          settings?.temperature ?? 0.5,
          targetMaxTokens,
          settings?.geminiApiKey
        );
        break;

      case 'openai':
        content = await callOpenAI(
          SYSTEM_PROMPT, messages,
          settings?.openaiModel || 'gpt-4o-mini',
          settings?.openaiBaseUrl || 'https://api.openai.com/v1',
          settings?.openaiApiKey,
          settings?.temperature ?? 0.5,
          targetMaxTokens
        );
        break;

      case 'ollama': {
        const baseUrl = settings?.ollamaBaseUrl || 'http://localhost:11434';
        if (process.env.VERCEL && (baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1'))) {
          throw new Error('Vercel tidak dapat mengakses Ollama di localhost. Harap gunakan IP publik (misal Ngrok) atau gunakan provider Gemini.');
        }

        content = await callOllama(
          SYSTEM_PROMPT, messages,
          settings?.ollamaModel || 'llama3.2',
          baseUrl,
          settings?.temperature ?? 0.5,
          targetMaxTokens,
          resolvedOllamaKey
        );
        break;
      }

      case 'openrouter':
        content = await callOpenRouter(
          SYSTEM_PROMPT, messages,
          settings?.openrouterModel || 'google/gemini-flash-1.5',
          settings?.temperature ?? 0.5,
          targetMaxTokens,
          settings?.openrouterApiKey
        );
        break;

      default:
        if (process.env.GEMINI_API_KEY || settings?.geminiApiKey) {
          content = await callGemini(SYSTEM_PROMPT, messages, 'gemini-2.5-flash', 0.5, targetMaxTokens, settings?.geminiApiKey);
        } else {
          return NextResponse.json({ error: `Provider '${provider}' tidak dikenal. Konfigurasikan AI di Pengaturan AI.` }, { status: 400 });
        }
    }

    return NextResponse.json({ content });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Terjadi kesalahan pada server AI';
    console.error('[Executive-Insights]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
