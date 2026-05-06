import { NextRequest, NextResponse } from 'next/server';
import { callGemini } from '@/lib/ai/providers/gemini';
import { callOllama } from '@/lib/ai/providers/ollama';
import { callOpenRouter } from '@/lib/ai/providers/openrouter';

// Generates a narrative insight summary from laporan-harian data.
// Body: { snapshot: <ApiResponse-shaped object>, prevSnapshot?: ApiResponse, settings: AISettings }
// Returns: { content: string }

const SYSTEM_PROMPT = `Anda adalah analis bisnis e-commerce senior yang menganalisis laporan harian penjualan FreshVision di TikTok Shop.
Tugas Anda: berikan insight yang TAJAM, ACTIONABLE, dan dalam bahasa Indonesia natural.

Format output (gunakan markdown):
## 📊 Ringkasan Eksekutif
[2-3 kalimat overview status bulan ini]

## 🎯 Performa vs Target
[Apakah on track? Berapa pace per hari yang dibutuhkan?]

## 🏆 Channel Terbaik & Terburuk
[Identifikasi channel dengan ROI terbaik dan yang perlu perbaikan, dengan angka konkret]

## ⚠️ Anomali & Perhatian
[Highlight hari-hari abnormal, CAC yang tinggi, drop signifikan, dll]

## 💡 Rekomendasi
[3-5 actionable recommendations berbasis data]

PENTING:
- Selalu sertakan ANGKA KONKRET dari data (omzet, %, ROI, etc)
- Bandingkan dengan bulan sebelumnya jika datanya ada
- Identifikasi cause-and-effect (bukan sekadar deskripsi data)
- Hindari fluff dan jargon — langsung ke insight yang berguna`;

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

interface Snapshot {
  period?: string;
  summary: MinimalSummary;
  channels: Record<string, MinimalChannelSummary>;
  highlights?: {
    best_day: { tanggal: string; omzet: number } | null;
    worst_day: { tanggal: string; omzet: number } | null;
    anomalies: { tanggal: string; omzet: number; type: string; deviation: number }[];
  };
  evaluasi_per_brand?: { freshvision: number; nutriflakes: number; freshmag: number; etawaku: number; total: number };
}

function fR(n: number): string {
  return 'Rp' + Math.round(n).toLocaleString('id-ID');
}

// Build a compact, LLM-friendly description of the data
function buildPrompt(snapshot: Snapshot, prev?: Snapshot, target?: number): string {
  const s = snapshot.summary;
  const period = snapshot.period || 'periode aktif';

  let prompt = `# DATA LAPORAN HARIAN — ${period}\n\n`;

  // Summary block
  prompt += `## Ringkasan ${s.hari} hari\n`;
  prompt += `- Total Omzet: ${fR(s.total_omzet)}\n`;
  prompt += `- Total Closing: ${s.total_closing.toLocaleString('id-ID')} transaksi\n`;
  prompt += `- Total Botol: ${s.total_botol.toLocaleString('id-ID')}\n`;
  prompt += `- Total Biaya Iklan: ${fR(s.total_biaya_iklan)}\n`;
  prompt += `- ROAS: ${s.roas.toFixed(2)}x\n`;
  prompt += `- Rata-rata CAC: ${s.rata_cac.toFixed(1)}%\n`;
  prompt += `- Rata-rata Upsell: ${s.rata_upsell.toFixed(2)}x\n`;
  prompt += `- Margin setelah biaya: ${s.margin_after_cost.toFixed(1)}%\n`;
  if (target) prompt += `- Target bulan ini: ${fR(target)} (pencapaian ${(s.total_omzet / target * 100).toFixed(1)}%)\n`;

  // Channel block
  if (snapshot.channels) {
    prompt += `\n## Performa Per Channel\n`;
    Object.entries(snapshot.channels).forEach(([key, c]) => {
      prompt += `\n### ${key.toUpperCase()}\n`;
      prompt += `- Omzet: ${fR(c.total_omzet)}\n`;
      prompt += `- Biaya Iklan/Komisi: ${fR(c.total_biaya_iklan)}\n`;
      prompt += `- ROI: ${c.roi.toFixed(2)}x\n`;
      prompt += `- Closing: ${c.total_closing} | Botol: ${c.total_botol}\n`;
      prompt += `- CAC: ${c.rata_cac.toFixed(1)}% | Cost/Closing: ${fR(c.cost_per_closing)}\n`;
      prompt += `- Avg Trx: ${fR(c.omzet_per_closing)} | Btl/Cls: ${c.bottle_per_closing.toFixed(2)}\n`;
    });
  }

  // Highlights block
  if (snapshot.highlights) {
    const h = snapshot.highlights;
    prompt += `\n## Highlights\n`;
    if (h.best_day) prompt += `- Hari terbaik: ${h.best_day.tanggal} (${fR(h.best_day.omzet)})\n`;
    if (h.worst_day) prompt += `- Hari terburuk: ${h.worst_day.tanggal} (${fR(h.worst_day.omzet)})\n`;
    if (h.anomalies?.length) {
      prompt += `- Anomali (${h.anomalies.length} hari):\n`;
      h.anomalies.slice(0, 5).forEach(a => {
        prompt += `  - ${a.tanggal}: ${a.type} ${a.deviation > 0 ? '+' : ''}${a.deviation}% (${fR(a.omzet)})\n`;
      });
    }
  }

  // Brand contribution
  if (snapshot.evaluasi_per_brand) {
    const e = snapshot.evaluasi_per_brand;
    prompt += `\n## Kontribusi Brand (vs total semua brand)\n`;
    prompt += `- FreshVision: ${fR(e.freshvision)} (${(e.freshvision / e.total * 100).toFixed(1)}%)\n`;
    prompt += `- Nutriflakes: ${fR(e.nutriflakes)} (${(e.nutriflakes / e.total * 100).toFixed(1)}%)\n`;
    prompt += `- Freshmag: ${fR(e.freshmag)} (${(e.freshmag / e.total * 100).toFixed(1)}%)\n`;
    prompt += `- Etawaku: ${fR(e.etawaku)} (${(e.etawaku / e.total * 100).toFixed(1)}%)\n`;
    prompt += `- TOTAL semua brand: ${fR(e.total)}\n`;
  }

  // Previous month comparison
  if (prev) {
    const ps = prev.summary;
    const delta = (curr: number, p: number) => p > 0 ? `${(((curr - p) / p) * 100).toFixed(1)}%` : 'N/A';
    prompt += `\n## Perbandingan vs ${prev.period || 'bulan sebelumnya'}\n`;
    prompt += `- Omzet: ${fR(s.total_omzet)} vs ${fR(ps.total_omzet)} (Δ ${delta(s.total_omzet, ps.total_omzet)})\n`;
    prompt += `- Closing: ${s.total_closing} vs ${ps.total_closing} (Δ ${delta(s.total_closing, ps.total_closing)})\n`;
    prompt += `- ROAS: ${s.roas.toFixed(2)}x vs ${ps.roas.toFixed(2)}x (Δ ${delta(s.roas, ps.roas)})\n`;
    prompt += `- CAC: ${s.rata_cac.toFixed(1)}% vs ${ps.rata_cac.toFixed(1)}% (Δ ${delta(s.rata_cac, ps.rata_cac)})\n`;
    prompt += `- Biaya Iklan: ${fR(s.total_biaya_iklan)} vs ${fR(ps.total_biaya_iklan)} (Δ ${delta(s.total_biaya_iklan, ps.total_biaya_iklan)})\n`;
  }

  prompt += `\n---\nBerikan analisis sesuai format yang diminta. Fokus pada insight yang actionable.`;
  return prompt;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { snapshot, prevSnapshot, target, settings } = body;

    if (!snapshot?.summary || !settings) {
      return NextResponse.json({ error: 'Missing snapshot.summary or settings' }, { status: 400 });
    }

    const userPrompt = buildPrompt(snapshot, prevSnapshot, target);
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
      case 'ollama':
        content = await callOllama(
          SYSTEM_PROMPT, messages,
          settings.ollamaModel || 'llama3.2',
          settings.ollamaBaseUrl || 'http://localhost:11434',
          settings.temperature ?? 0.5,
          settings.maxTokens ?? 1500,
          settings.ollamaMode || 'local',
          settings.ollamaApiKey,
        );
        break;
      case 'openrouter':
        content = await callOpenRouter(
          SYSTEM_PROMPT, messages,
          settings.openrouterModel || 'google/gemini-flash-1.5',
          settings.temperature ?? 0.5,
          settings.maxTokens ?? 1500,
        );
        break;
      default:
        return NextResponse.json({ error: 'Provider AI tidak dikenal' }, { status: 400 });
    }

    return NextResponse.json({ content });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Terjadi kesalahan pada server AI';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
