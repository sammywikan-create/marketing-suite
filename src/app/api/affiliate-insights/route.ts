import { NextRequest, NextResponse } from 'next/server';
import { callGemini } from '@/lib/ai/providers/gemini';
import { callOpenAI } from '@/lib/ai/providers/openai';
import { callOllama } from '@/lib/ai/providers/ollama';
import { callOpenRouter } from '@/lib/ai/providers/openrouter';

// ─── System Prompt khusus Affiliate Manager (Deep & Comprehensive) ───
const SYSTEM_PROMPT = `Anda adalah Senior Affiliate Marketing Strategist yang menganalisis performa kreator TikTok Shop & Tokopedia.
Tugas Anda: Sajikan Laporan Audit & Strategi Kreator yang SANGAT DETAIL, SPESIFIK NAMA KREATOR, MATEMATIS, dan STRATEGIS (Bahasa Indonesia).

Format Output Wajib (Gunakan Markdown Kaya Format):

## 👥 1. Audit Portofolio Kreator & Status Ekosistem
[Analisis mendalam 2-3 paragraf mengenai total database kreator, jumlah kreator aktif promosi, ratio keaktifan vs benchmark 25%, total Gross GMV vs Net GMV, serta efisiensi komisi].

## 🏆 2. Pembedahan Tier & Top Performer Analysis
[Identifikasi dan analisis mendalam:
- Sebutkan NAMA-NAMA KREATOR TOP secara SPESIFIK dengan total GMV, jumlah pesanan, dan persentase kontribusinya.
- Breakdown Performa Per Tier (Nano, Micro, Mid, Macro, Mega): Mana tier yang menghasilkan ROI komisi tertinggi?
- Pola Konten Pemenang: Bedahkan apakah Shoppable Video atau LIVE Streaming yang menjadi penggerak utama GMV].

## ⚠️ 3. Audit Risk & Inefisiensi: Refund Rate & Dormant Creators
[Analisis mendalam terhadap kelemahan ekosistem:
- Kreator dengan Refund Rate abnormal (>10%): Sebutkan nama kreator dan nominal kerugian.
- Diagnosa Kreator Pasif (Dormant): Berapa jumlah kreator potensial yang tidak mengunggah konten bulan ini?
- Dampak Kebocoran Komisi & Retur Barang].

## 📈 4. Formulasi Insentif & Skema Komisi Berjenjang
[Rekomendasi taktis komisi & campaign insentif]:
- Skema komisi progresif per tier untuk memacu posting video/LIVE.
- Taktik pengiriman sampel produk gratis (Free Samples) berbasis historis performa.
- Program challenge/kontes affiliate berhadiah bonus tunai.

## 📝 5. Blueprint Action Plan Affiliate (14 Hari Ke Depan)
[5 langkah eksekusi konkret terurut prioritas tinggi]:
1. **Outreach & Reaktivasi**: Rencana mengontak ulang kreator dormant.
2. **Push Top 10 Creators**: Penawaran eksklusif untuk kreator penyumbang GMV terbesar.
3. **Handling Refund Abnormal**: Tindakan penanganan terhadap kontroversi atau miskomunikasi deskripsi produk.
4. **Program Rekrutmen Kreator Baru**: Strategi menambah 20-50 kreator aktif baru per minggu.

ATURAN WAJIB:
- SEBUTKAN NAMA KREATOR SPESIFIK dari data (seperti nama akun / username kreator).
- Sertakan ANGKA KONKRET (Rp, %, Jumlah Order, Tier) di setiap bagian.
- Analisis HARUS mendalam, panjang, dan komprehensif (HINDARI rangkuman pendek atau jawaban umum).`;

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

  const fR = (n: number) => 'Rp ' + Math.round(n).toLocaleString('id-ID');
  const fP = (n: number) => n.toFixed(1) + '%';

  let prompt = `# DATA PERFORMA AFFILIATE MANAGER — ${period} (${platform.toUpperCase()})\n\n`;

  // Summary
  prompt += `## 1. IKHTISAR PERFORMA KESELURUHAN\n`;
  prompt += `- Gross GMV Affiliate: ${fR(Number(summary.totalGMV || 0))}\n`;
  prompt += `- Net GMV Affiliate: ${fR(Number(summary.netGMV || 0))}\n`;
  prompt += `- Total Refund: ${fR(Number(summary.totalRefund || 0))} (Refund Rate: ${fP(Number(summary.refundRate || 0))})\n`;
  prompt += `- Total Pesanan (Orders): ${Number(summary.totalOrders || 0).toLocaleString('id-ID')} pesanan\n`;
  prompt += `- Database Kreator: ${summary.totalCreators || 0} kreator (Aktif Promosi: ${summary.activePromoters || summary.activeCreators || 0} kreator / ${fP(Number(summary.totalCreators || 0) > 0 ? (Number(summary.activePromoters || summary.activeCreators || 0) / Number(summary.totalCreators)) * 100 : 0)})\n`;
  prompt += `- Total Komisi Dibayarkan: ${fR(Number(summary.totalCommission || 0))}\n`;
  prompt += `- Breakout Channel: Video GMV = ${fR(Number(summary.videoGMV || 0))} | LIVE GMV = ${fR(Number(summary.liveGMV || 0))}\n`;
  if (summary.momGrowth !== undefined && summary.momGrowth !== null) {
    prompt += `- Pertumbuhan MoM GMV: ${Number(summary.momGrowth) >= 0 ? '+' : ''}${fP(Number(summary.momGrowth))}\n`;
  }
  prompt += `\n`;

  // Tier Breakdown
  if (tierBreakdown && Object.keys(tierBreakdown).length > 0) {
    prompt += `## 2. DISTRIBUSI TIER KREATOR\n`;
    for (const [tier, count] of Object.entries(tierBreakdown)) {
      prompt += `- Tier [${tier.toUpperCase()}]: ${count} kreator\n`;
    }
    prompt += `\n`;
  }

  // Top Creators
  if (topCreators && topCreators.length > 0) {
    prompt += `## 3. TOP KREATOR PENYUMBANG GMV TERBESAR (DETAIL NAMA & ANGKA)\n`;
    topCreators.slice(0, 15).forEach((c, idx) => {
      prompt += `${idx + 1}. **${c.name || c.username || 'Kreator ' + (idx + 1)}** (Tier: ${c.tier || 'N/A'})\n`;
      prompt += `   - Gross GMV: ${fR(Number(c.gmv || 0))} | Net GMV: ${fR(Number(c.netGmv || c.gmv || 0))}\n`;
      prompt += `   - Total Pesanan: ${Number(c.orders || 0)} order | Refund Rate: ${fP(Number(c.refundRate || 0))}\n`;
      prompt += `   - Komisi: ${fR(Number(c.commission || 0))} | Score Performansi: ${c.score || 'N/A'}\n`;
    });
    prompt += `\n`;
  }

  // Action Items / Needing Attention
  if (actionItems && actionItems.length > 0) {
    prompt += `## 4. KREATOR YANG PERLU PERHATIAN KHUSUS (HIGH REFUND / NEEDS PUSH)\n`;
    actionItems.slice(0, 10).forEach((item, idx) => {
      prompt += `${idx + 1}. **${item.name || item.username}**: Kategori [${item.category || 'Attention'}], GMV: ${fR(Number(item.gmv || 0))}, Refund: ${fP(Number(item.refundRate || 0))}, Alasan: ${item.reason || 'Perlu evaluasi'}\n`;
    });
    prompt += `\n`;
  }

  // Prev Summary Comparison
  if (prevSummary) {
    prompt += `## 5. DENGAN PERBANDINGAN PERIODE SEBELUMNYA\n`;
    prompt += `- GMV Periode Lalu: ${fR(Number(prevSummary.totalGMV || 0))}\n`;
    prompt += `- Refund Rate Periode Lalu: ${fP(Number(prevSummary.refundRate || 0))}\n`;
    prompt += `- Kreator Aktif Periode Lalu: ${prevSummary.activeCreators || 0}\n\n`;
  }

  prompt += `Berdasarkan data lengkap di atas, buatkan Laporan Audit & Strategi Kreator yang SANGAT DETAIL, SPESIFIK NAMA KREATOR, MATEMATIS, dan STRATEGIS sesuai format 5 bagian di atas.`;
  return prompt;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { summary, topCreators, actionItems, tierBreakdown, period, platform, prevSummary, settings } = body;

    if (!summary) {
      return NextResponse.json({ error: 'Data ringkasan affiliate tidak tersedia' }, { status: 400 });
    }

    const userPrompt = buildAffiliatePrompt({
      summary,
      topCreators: topCreators || [],
      actionItems: actionItems || [],
      tierBreakdown: tierBreakdown || {},
      period: period || 'Bulan Ini',
      platform: platform || 'tiktok',
      prevSummary,
    });

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
    console.error('[Affiliate-Insights] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
