import { NextRequest, NextResponse } from 'next/server';
import { callGemini } from '@/lib/ai/providers/gemini';
import { callOpenAI } from '@/lib/ai/providers/openai';
import { callOllama } from '@/lib/ai/providers/ollama';
import { callOpenRouter } from '@/lib/ai/providers/openrouter';

const SYSTEM_PROMPT = `Anda adalah Senior E-Commerce Growth Analyst yang mengaudit laporan harian penjualan FreshVision di TikTok Shop & Tokopedia.
Tugas Anda: Berikan Laporan Audit Performance yang SANGAT DETAIL, MATEMATIS, ANALITIS, dan STRATEGIS (Bahasa Indonesia).

Format Output Wajib (Gunakan Markdown Kaya Format):

## 📊 1. Performance Audit & Margin PnL
[Analisis mendalam 2-3 paragraf mengenai total omzet store, run-rate omzet harian vs target, efisiensi ad spend, margin bersih setelah iklan (Margin After Ad Cost), serta persentase kontribusi toko FreshVision].

## 🔍 2. Channel Deep-Dive (Video vs LIVE vs Shop)
[Analisis perbandingan head-to-head per channel:
- Channel Video Ads: Omzet, Ad Spend, ROI, CAC, dan omzet per closing.
- Channel LIVE Streaming Ads: Omzet, Ad Spend, ROI, CAC.
- Channel Product Card (SHOP) / Affiliate: Kontribusi omzet & efisiensi.
- Berikan kesimpulan channel mana yang paling ROI-positive dan channel mana yang memicu inefisiensi].

## 📈 3. Analisis Volatilitas Harian & Tren Penjualan
[Identifikasi pola harian:
- Hari dengan performa puncak (Peak Day) vs terlemah (Drop Day).
- Evaluasi Rasio Upsell (Rata-rata botol per transaksi, bandingkan vs ideal >2.0 botol/closing).
- Perbandingan pertumbuhan dibanding periode/bulan sebelumnya jika data ada].

## 🚨 4. Audit Kebocoran Budget & Root Cause
[Pembedahan 3 akar masalah (Root Cause) yang paling menguras margin:
- CAC Iklan membengkak atau ROAS di bawah benchmark 3.0x.
- Kebocoran budget di channel yang tidak perform.
- Sertakan estimasi nominal Rupiah dari potensi kerugian].

## ⚡ 5. Actionable Growth Blueprint (Rencana Taktis)
[5 rekomendasi aksi konkret dengan instruksi teknis]:
1. **Optimasi Campaign & Budget**: Penyesuaian budget per channel.
2. **Strategi Upsell & Basket Size**: Taktik menaikkan botol per order.
3. **Revisi Hook & Creative Content**: Taktik menekan CAC iklan.
4. **Alokasi Modal**: Prioritas investasi budget minggu ini.

ATURAN WAJIB:
- Sertakan ANGKA KONKRET (Rp, %, Rasio, Jumlah Closing/Botol) dari data.
- Buat analisis MENDALAM, LENGKAP, dan BERSINAMBUNGAN (HINDARI poin-poin singkat atau rangkuman sederhana).
- Komunikasi dengan gaya konsultan e-commerce profesional: tajam, analitis, dan berbobot.`;

interface MinimalSummary {
  total_omzet: number;
  total_closing: number;
  total_botol: number;
  hari: number;
  rata_cac: number;
  rata_upsell: number;
  roas: number;
  total_biaya_iklan: number;
  margin_after_cost: number;
  pct_kontribusi_fv: number;
}

interface MinimalChannelSummary {
  total_omzet: number;
  total_closing: number;
  total_botol: number;
  total_biaya_iklan: number;
  rata_cac: number;
  rata_upsell: number;
  roi: number;
  cost_per_closing: number;
  omzet_per_closing: number;
  bottle_per_closing: number;
}

function formatRupiah(n: number) {
  return 'Rp ' + Math.round(n).toLocaleString('id-ID');
}

function buildInsightPrompt(snapshot: {
  periode: string;
  summary: MinimalSummary;
  channels: Record<string, MinimalChannelSummary>;
}, prevSnapshot?: {
  periode: string;
  summary: MinimalSummary;
}) {
  const s = snapshot.summary;
  let p = `# LAPORAN HARIAN PENJUALAN STORE — Periode: ${snapshot.periode}\n\n`;

  p += `## METRIK UTAMA STORE:\n`;
  p += `- Total Omzet Pembukuan Store (FreshVision): ${formatRupiah(s.total_omzet)}\n`;
  p += `- Total Biaya Iklan (Ad Spend): ${formatRupiah(s.total_biaya_iklan)}\n`;
  p += `- ROAS (Return on Ad Spend): ${s.roas.toFixed(2)}x\n`;
  p += `- Margin Setelah Iklan (Margin After Cost): ${formatRupiah(s.margin_after_cost)}\n`;
  p += `- Total Closing (Order): ${s.total_closing.toLocaleString('id-ID')} closing\n`;
  p += `- Total Botol Terjual: ${s.total_botol.toLocaleString('id-ID')} botol\n`;
  p += `- Rata-rata Botol Per Closing (Upsell): ${s.rata_upsell.toFixed(2)} botol/closing\n`;
  p += `- Rata-rata CAC Iklan: ${formatRupiah(s.rata_cac)} per closing\n`;
  p += `- Kontribusi Store FreshVision: ${s.pct_kontribusi_fv.toFixed(1)}%\n`;
  p += `- Jumlah Hari Terverifikasi: ${s.hari} hari (Rata-rata Omzet: ${formatRupiah(s.hari > 0 ? s.total_omzet / s.hari : 0)}/hari)\n\n`;

  if (snapshot.channels && Object.keys(snapshot.channels).length > 0) {
    p += `## PERFORMA PER CHANNEL IKLAN:\n`;
    for (const [chName, ch] of Object.entries(snapshot.channels)) {
      p += `### Channel: ${chName.toUpperCase()}\n`;
      p += `- Total Omzet: ${formatRupiah(ch.total_omzet)}\n`;
      p += `- Total Biaya Iklan: ${formatRupiah(ch.total_biaya_iklan)}\n`;
      p += `- ROI: ${ch.roi.toFixed(2)}x\n`;
      p += `- Rata-rata CAC: ${formatRupiah(ch.rata_cac)}\n`;
      p += `- Total Closing: ${ch.total_closing}\n`;
      p += `- Total Botol: ${ch.total_botol}\n`;
      p += `- Rata-rata Upsell: ${ch.rata_upsell.toFixed(2)} botol/closing\n`;
      p += `- Cost Per Closing: ${formatRupiah(ch.cost_per_closing)}\n`;
      p += `- Omzet Per Closing: ${formatRupiah(ch.omzet_per_closing)}\n\n`;
    }
  }

  if (prevSnapshot) {
    const ps = prevSnapshot.summary;
    p += `## PERBANDINGAN DENGAN BULAN SEBELUMNYA (${prevSnapshot.periode}):\n`;
    p += `- Omzet Bulan Lalu: ${formatRupiah(ps.total_omzet)} (Selisih: ${formatRupiah(s.total_omzet - ps.total_omzet)})\n`;
    p += `- Biaya Iklan Bulan Lalu: ${formatRupiah(ps.total_biaya_iklan)}\n`;
    p += `- ROAS Bulan Lalu: ${ps.roas.toFixed(2)}x\n`;
    p += `- CAC Bulan Lalu: ${formatRupiah(ps.rata_cac)}\n\n`;
  }

  p += `Berdasarkan data lengkap di atas, buatkan Laporan Audit Performance yang SANGAT DETAIL, MATEMATIS, ANALITIS, dan STRATEGIS sesuai format 5 bagian di atas.`;
  return p;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { snapshot, prevSnapshot, settings } = body;

    if (!snapshot || !snapshot.summary) {
      return NextResponse.json({ error: 'Data snapshot tidak lengkap' }, { status: 400 });
    }

    const userPrompt = buildInsightPrompt(snapshot, prevSnapshot);
    const messages = [{ role: 'user' as const, content: userPrompt }];

    const targetMaxTokens = Math.max(settings?.maxTokens || 3500, 3500);

    let content: string;
    switch (settings?.provider || 'gemini') {
      case 'gemini':
        content = await callGemini(
          SYSTEM_PROMPT, messages,
          settings?.geminiModel || 'gemini-2.5-flash',
          settings?.temperature ?? 0.5,
          targetMaxTokens,
          settings?.geminiApiKey,
        );
        break;
      case 'openai':
        content = await callOpenAI(
          SYSTEM_PROMPT, messages,
          settings?.openaiModel || 'gpt-4o-mini',
          settings?.openaiBaseUrl || 'https://api.openai.com/v1',
          settings?.openaiApiKey,
          settings?.temperature ?? 0.5,
          targetMaxTokens,
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
          settings?.ollamaApiKey,
        );
        break;
      }
      case 'openrouter':
        content = await callOpenRouter(
          SYSTEM_PROMPT, messages,
          settings?.openrouterModel || 'google/gemini-flash-1.5',
          settings?.temperature ?? 0.5,
          targetMaxTokens,
          settings?.openrouterApiKey,
        );
        break;
      default:
        content = await callGemini(SYSTEM_PROMPT, messages, 'gemini-2.5-flash', 0.5, targetMaxTokens, settings?.geminiApiKey);
        break;
    }

    return NextResponse.json({ content });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Terjadi kesalahan pada server AI';
    console.error('[AI-Insights]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
