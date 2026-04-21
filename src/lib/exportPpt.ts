import PptxGenJS from "pptxgenjs";

function fR(v: number) {
  return `Rp${Math.round(v).toLocaleString("id-ID")}`;
}
function fN(v: number) {
  return v.toLocaleString("id-ID");
}

interface ExportData {
  summary: {
    total_omzet: number; total_botol: number; total_closing: number;
    rata_upsell: number; rata_cac: number; roas: number;
    total_biaya_iklan: number; total_komisi_aff: number; total_cost: number;
    margin_after_cost: number; cost_per_closing: number;
    total_omzet_all: number; total_omzet_fv: number; pct_kontribusi_fv: number;
    hari: number; avg_omzet_harian: number; avg_closing_harian: number;
    avg_botol_harian: number; nilai_per_txn: number; rata_cac_ads: number;
    cost_per_botol: number;
  };
  channels: Record<string, { total_omzet: number; total_closing: number; total_botol: number; rata_upsell: number; rata_cac: number; hari: number }>;
  weekly: { label: string; total_omzet: number; total_closing: number; total_botol: number; rata_upsell: number; rata_cac: number; rata_omzet_harian: number; wow_omzet: number; hari: number }[];
  evaluasi_per_brand: { freshvision: number; nutriflakes: number; freshmag: number; etawaku: number; total: number };
  highlights: {
    best_day: { tanggal: string; omzet: number } | null;
    worst_day: { tanggal: string; omzet: number } | null;
    anomalies: { tanggal: string; omzet: number; type: string; deviation: number }[];
  };
  target: number;
  healthScore: number;
  healthLabel: string;
}

const BLUE = "2563EB";
const DARK = "1F2937";
const GRAY = "6B7280";
const GREEN = "059669";
const RED = "DC2626";
const ORANGE = "D97706";
const WHITE = "FFFFFF";
const LIGHT_BG = "F3F4F6";

export function generatePpt(data: ExportData) {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "FreshVision Dashboard";
  pptx.subject = "Laporan Harian FreshVision";

  const { summary: s, channels, weekly, evaluasi_per_brand: ev, highlights, target, healthScore, healthLabel } = data;
  const pctTarget = Math.min((s.total_omzet / target) * 100, 999);
  const allSlides: PptxGenJS.Slide[] = [];
  const addSlide = () => { const sl = pptx.addSlide(); allSlides.push(sl); return sl; };

  // ═══ SLIDE 1: TITLE ═══
  const slide1 = addSlide();
  slide1.background = { color: BLUE };
  slide1.addText("LAPORAN HARIAN\nFRESHVISION", { x: 0.8, y: 1.0, w: 8, h: 2.5, fontSize: 36, bold: true, color: WHITE, lineSpacingMultiple: 1.2 });
  slide1.addText(`Health Score: ${healthScore}/100 — ${healthLabel}`, { x: 0.8, y: 3.6, w: 6, h: 0.5, fontSize: 16, color: WHITE, italic: true });
  slide1.addText(`Data: ${s.hari} hari | Target: ${fR(target)}`, { x: 0.8, y: 4.2, w: 6, h: 0.4, fontSize: 13, color: "BFDBFE" });
  slide1.addText(`Generated: ${new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}`, { x: 0.8, y: 4.7, w: 6, h: 0.4, fontSize: 11, color: "93C5FD" });
  // Score circle
  slide1.addShape("ellipse" as PptxGenJS.ShapeType, { x: 9.5, y: 1.5, w: 2.5, h: 2.5, fill: { color: WHITE }, shadow: { type: "outer", blur: 10, opacity: 0.3, offset: 3, color: "000000" } });
  slide1.addText(`${healthScore}`, { x: 9.5, y: 1.6, w: 2.5, h: 1.8, fontSize: 48, bold: true, color: healthScore >= 80 ? GREEN : healthScore >= 60 ? BLUE : healthScore >= 40 ? ORANGE : RED, align: "center", valign: "middle" });
  slide1.addText(healthLabel, { x: 9.5, y: 3.2, w: 2.5, h: 0.5, fontSize: 11, bold: true, color: DARK, align: "center" });

  // ═══ SLIDE 2: EXECUTIVE SUMMARY ═══
  const slide2 = addSlide();
  slide2.addText("Executive Summary", { x: 0.5, y: 0.3, w: 10, h: 0.6, fontSize: 24, bold: true, color: DARK });
  slide2.addShape("rect" as PptxGenJS.ShapeType, { x: 0.5, y: 0.85, w: 2, h: 0.05, fill: { color: BLUE } });

  // KPI Grid (2 rows x 4 cols)
  const kpis = [
    { label: "Total Omzet", value: fR(s.total_omzet), sub: `Target: ${fR(target)} (${pctTarget.toFixed(1)}%)` },
    { label: "Total Closing", value: fN(s.total_closing), sub: `Avg: ${fN(s.avg_closing_harian)}/hari` },
    { label: "Total Botol", value: fN(s.total_botol), sub: `Avg: ${fN(s.avg_botol_harian)}/hari` },
    { label: "Nilai Per Transaksi", value: fR(s.nilai_per_txn), sub: `Omzet/hari: ${fR(s.avg_omzet_harian)}` },
    { label: "Rata-rata Upsell", value: `${s.rata_upsell.toFixed(2)}x`, sub: s.rata_upsell >= 1.3 ? "✅ Baik" : s.rata_upsell >= 1.1 ? "⚠️ Cukup" : "❌ Rendah" },
    { label: "CAC Total", value: `${s.rata_cac.toFixed(1)}%`, sub: s.rata_cac <= 50 ? "✅ Efisien" : s.rata_cac <= 60 ? "⚠️ Normal" : "❌ Tinggi" },
    { label: "ROAS", value: `${s.roas.toFixed(1)}x`, sub: s.roas >= 4 ? "✅ Excellent" : s.roas >= 3 ? "⚠️ OK" : "❌ Low" },
    { label: "Kontribusi FV", value: `${s.pct_kontribusi_fv}%`, sub: `FV: ${fR(s.total_omzet_fv)} / ${fR(s.total_omzet_all)}` },
  ];

  kpis.forEach((kpi, i) => {
    const col = i % 4;
    const row = Math.floor(i / 4);
    const x = 0.5 + col * 3.05;
    const y = 1.2 + row * 1.8;
    slide2.addShape("roundRect" as PptxGenJS.ShapeType, { x, y, w: 2.85, h: 1.5, fill: { color: LIGHT_BG }, rectRadius: 0.1 });
    slide2.addText(kpi.label, { x: x + 0.15, y: y + 0.1, w: 2.6, h: 0.3, fontSize: 9, color: GRAY });
    slide2.addText(kpi.value, { x: x + 0.15, y: y + 0.4, w: 2.6, h: 0.5, fontSize: 20, bold: true, color: DARK });
    slide2.addText(kpi.sub, { x: x + 0.15, y: y + 1.0, w: 2.6, h: 0.3, fontSize: 8, color: GRAY });
  });

  // Progress bar
  const barY = 4.9;
  slide2.addText(`Progress Target: ${pctTarget.toFixed(1)}%`, { x: 0.5, y: barY - 0.3, w: 5, h: 0.3, fontSize: 10, bold: true, color: DARK });
  slide2.addShape("roundRect" as PptxGenJS.ShapeType, { x: 0.5, y: barY, w: 12.0, h: 0.3, fill: { color: "E5E7EB" }, rectRadius: 0.15 });
  slide2.addShape("roundRect" as PptxGenJS.ShapeType, { x: 0.5, y: barY, w: Math.min(12.0, 12.0 * pctTarget / 100), h: 0.3, fill: { color: pctTarget >= 100 ? GREEN : pctTarget >= 70 ? BLUE : ORANGE }, rectRadius: 0.15 });

  // ═══ SLIDE 3: CHANNEL PERFORMANCE ═══
  const slide3 = addSlide();
  slide3.addText("Channel Performance", { x: 0.5, y: 0.3, w: 10, h: 0.6, fontSize: 24, bold: true, color: DARK });
  slide3.addShape("rect" as PptxGenJS.ShapeType, { x: 0.5, y: 0.85, w: 2, h: 0.05, fill: { color: BLUE } });

  const chEntries = Object.entries(channels);
  const totalChOmzet = chEntries.reduce((s, [, c]) => s + c.total_omzet, 0);

  // Table
  const chHeaders = [
    [
      { text: "Channel", options: { bold: true, fill: { color: BLUE }, color: WHITE, fontSize: 10 } },
      { text: "Omzet", options: { bold: true, fill: { color: BLUE }, color: WHITE, fontSize: 10, align: "right" as const } },
      { text: "% Total", options: { bold: true, fill: { color: BLUE }, color: WHITE, fontSize: 10, align: "right" as const } },
      { text: "Closing", options: { bold: true, fill: { color: BLUE }, color: WHITE, fontSize: 10, align: "right" as const } },
      { text: "Botol", options: { bold: true, fill: { color: BLUE }, color: WHITE, fontSize: 10, align: "right" as const } },
      { text: "Upsell", options: { bold: true, fill: { color: BLUE }, color: WHITE, fontSize: 10, align: "right" as const } },
      { text: "CAC", options: { bold: true, fill: { color: BLUE }, color: WHITE, fontSize: 10, align: "right" as const } },
      { text: "Hari", options: { bold: true, fill: { color: BLUE }, color: WHITE, fontSize: 10, align: "right" as const } },
    ],
  ];
  const chLabels: Record<string, string> = { shop: "🛒 Shop", video: "📹 Video", live: "🔴 Live", shop_tab: "🏪 Shop Tab", affiliate: "🤝 Affiliate" };
  const chRows = chEntries.map(([k, c]) => {
    const pct = totalChOmzet > 0 ? ((c.total_omzet / totalChOmzet) * 100).toFixed(1) : "0";
    return [
      { text: chLabels[k] || k, options: { fontSize: 10, bold: true } },
      { text: fR(c.total_omzet), options: { fontSize: 10, align: "right" as const } },
      { text: `${pct}%`, options: { fontSize: 10, align: "right" as const } },
      { text: fN(c.total_closing), options: { fontSize: 10, align: "right" as const } },
      { text: fN(c.total_botol), options: { fontSize: 10, align: "right" as const } },
      { text: `${c.rata_upsell.toFixed(2)}x`, options: { fontSize: 10, align: "right" as const } },
      { text: `${c.rata_cac.toFixed(1)}%`, options: { fontSize: 10, align: "right" as const } },
      { text: `${c.hari}`, options: { fontSize: 10, align: "right" as const } },
    ];
  });
  slide3.addTable([...chHeaders, ...chRows], {
    x: 0.5, y: 1.2, w: 12.0,
    border: { type: "solid", pt: 0.5, color: "D1D5DB" },
    rowH: [0.4, ...chRows.map(() => 0.4)],
    colW: [1.8, 2.2, 1.0, 1.2, 1.0, 1.0, 1.0, 0.8],
    autoPage: false,
  });

  // Brand Kontribusi
  slide3.addText("Kontribusi Per Brand", { x: 0.5, y: 3.8, w: 10, h: 0.5, fontSize: 16, bold: true, color: DARK });
  const brands = [
    { name: "FreshVision", value: ev.freshvision, color: BLUE },
    { name: "Nutriflakes", value: ev.nutriflakes, color: "8B5CF6" },
    { name: "Freshmag", value: ev.freshmag, color: ORANGE },
    { name: "Etawaku", value: ev.etawaku, color: GREEN },
  ];
  brands.forEach((b, i) => {
    const x = 0.5 + i * 3.05;
    const pct = ev.total > 0 ? ((b.value / ev.total) * 100).toFixed(1) : "0";
    slide3.addShape("roundRect" as PptxGenJS.ShapeType, { x, y: 4.3, w: 2.85, h: 1.0, fill: { color: LIGHT_BG }, rectRadius: 0.1 });
    slide3.addShape("rect" as PptxGenJS.ShapeType, { x, y: 4.3, w: 0.08, h: 1.0, fill: { color: b.color } });
    slide3.addText(b.name, { x: x + 0.2, y: 4.35, w: 2.5, h: 0.25, fontSize: 9, color: GRAY });
    slide3.addText(`${fR(b.value)} (${pct}%)`, { x: x + 0.2, y: 4.6, w: 2.5, h: 0.4, fontSize: 14, bold: true, color: DARK });
  });

  // ═══ SLIDE 4: WEEKLY EVALUATION ═══
  const slide4 = addSlide();
  slide4.addText("Evaluasi Mingguan", { x: 0.5, y: 0.3, w: 10, h: 0.6, fontSize: 24, bold: true, color: DARK });
  slide4.addShape("rect" as PptxGenJS.ShapeType, { x: 0.5, y: 0.85, w: 2, h: 0.05, fill: { color: BLUE } });

  const wHeaders = [
    [
      { text: "Minggu", options: { bold: true, fill: { color: BLUE }, color: WHITE, fontSize: 10 } },
      { text: "Omzet", options: { bold: true, fill: { color: BLUE }, color: WHITE, fontSize: 10, align: "right" as const } },
      { text: "Closing", options: { bold: true, fill: { color: BLUE }, color: WHITE, fontSize: 10, align: "right" as const } },
      { text: "Botol", options: { bold: true, fill: { color: BLUE }, color: WHITE, fontSize: 10, align: "right" as const } },
      { text: "Avg/Hari", options: { bold: true, fill: { color: BLUE }, color: WHITE, fontSize: 10, align: "right" as const } },
      { text: "Upsell", options: { bold: true, fill: { color: BLUE }, color: WHITE, fontSize: 10, align: "right" as const } },
      { text: "CAC", options: { bold: true, fill: { color: BLUE }, color: WHITE, fontSize: 10, align: "right" as const } },
      { text: "WoW", options: { bold: true, fill: { color: BLUE }, color: WHITE, fontSize: 10, align: "right" as const } },
    ],
  ];
  const wRows = weekly.map((w) => [
    { text: w.label, options: { fontSize: 10, bold: true } },
    { text: fR(w.total_omzet), options: { fontSize: 10, align: "right" as const } },
    { text: fN(w.total_closing), options: { fontSize: 10, align: "right" as const } },
    { text: fN(w.total_botol), options: { fontSize: 10, align: "right" as const } },
    { text: fR(w.rata_omzet_harian), options: { fontSize: 10, align: "right" as const } },
    { text: `${w.rata_upsell.toFixed(2)}x`, options: { fontSize: 10, align: "right" as const } },
    { text: `${w.rata_cac.toFixed(1)}%`, options: { fontSize: 10, align: "right" as const } },
    { text: w.wow_omzet !== 0 ? `${w.wow_omzet > 0 ? "+" : ""}${w.wow_omzet}%` : "—", options: { fontSize: 10, align: "right" as const, color: w.wow_omzet > 0 ? GREEN : w.wow_omzet < 0 ? RED : GRAY } },
  ]);
  slide4.addTable([...wHeaders, ...wRows], {
    x: 0.5, y: 1.2, w: 12.0,
    border: { type: "solid", pt: 0.5, color: "D1D5DB" },
    rowH: [0.4, ...wRows.map(() => 0.4)],
    colW: [1.5, 2.2, 1.2, 1.2, 2.0, 1.0, 1.0, 1.2],
    autoPage: false,
  });

  // Proyeksi
  const projected = s.avg_omzet_harian * 30;
  const sisaTarget = Math.max(0, target - s.total_omzet);
  const sisaHari = Math.max(1, 30 - s.hari);
  const projY = 1.2 + (wRows.length + 1) * 0.4 + 0.5;
  slide4.addText("Proyeksi Akhir Bulan", { x: 0.5, y: projY, w: 10, h: 0.5, fontSize: 16, bold: true, color: DARK });
  const projItems = [
    { label: "Target", value: fR(target), color: BLUE },
    { label: "Tercapai", value: `${fR(s.total_omzet)} (${pctTarget.toFixed(1)}%)`, color: GREEN },
    { label: "Sisa", value: `${fR(sisaTarget)} (~${fR(Math.round(sisaTarget / sisaHari))}/hari)`, color: ORANGE },
    { label: "Proyeksi", value: `${fR(Math.round(projected))} ${projected >= target ? "✅" : "⚠️"}`, color: projected >= target ? GREEN : RED },
  ];
  projItems.forEach((p, i) => {
    const x = 0.5 + i * 3.05;
    slide4.addShape("roundRect" as PptxGenJS.ShapeType, { x, y: projY + 0.5, w: 2.85, h: 0.9, fill: { color: LIGHT_BG }, rectRadius: 0.1 });
    slide4.addText(p.label, { x: x + 0.15, y: projY + 0.55, w: 2.6, h: 0.25, fontSize: 9, color: GRAY });
    slide4.addText(p.value, { x: x + 0.15, y: projY + 0.75, w: 2.6, h: 0.4, fontSize: 13, bold: true, color: DARK });
  });

  // ═══ SLIDE 5: COST ANALYSIS ═══
  const slide5 = addSlide();
  slide5.addText("Cost Analysis", { x: 0.5, y: 0.3, w: 10, h: 0.6, fontSize: 24, bold: true, color: DARK });
  slide5.addShape("rect" as PptxGenJS.ShapeType, { x: 0.5, y: 0.85, w: 2, h: 0.05, fill: { color: BLUE } });

  const costKpis = [
    { label: "Total Biaya Iklan", value: fR(s.total_biaya_iklan) },
    { label: "Total Komisi Affiliate", value: fR(s.total_komisi_aff) },
    { label: "Total Cost", value: fR(s.total_cost) },
    { label: "ROAS", value: `${s.roas.toFixed(1)}x` },
    { label: "Cost Per Closing", value: fR(s.cost_per_closing) },
    { label: "Cost Per Botol", value: fR(s.cost_per_botol) },
    { label: "Margin Setelah Biaya", value: `${s.margin_after_cost}%` },
    { label: "CAC Ads", value: `${s.rata_cac_ads.toFixed(1)}%` },
  ];
  costKpis.forEach((kpi, i) => {
    const col = i % 4;
    const row = Math.floor(i / 4);
    const x = 0.5 + col * 3.05;
    const y = 1.2 + row * 1.5;
    slide5.addShape("roundRect" as PptxGenJS.ShapeType, { x, y, w: 2.85, h: 1.2, fill: { color: LIGHT_BG }, rectRadius: 0.1 });
    slide5.addText(kpi.label, { x: x + 0.15, y: y + 0.1, w: 2.6, h: 0.3, fontSize: 9, color: GRAY });
    slide5.addText(kpi.value, { x: x + 0.15, y: y + 0.4, w: 2.6, h: 0.5, fontSize: 18, bold: true, color: DARK });
  });

  // ═══ SLIDE 6: HIGHLIGHTS & RECOMMENDATIONS ═══
  const slide6 = addSlide();
  slide6.addText("Highlights & Rekomendasi", { x: 0.5, y: 0.3, w: 10, h: 0.6, fontSize: 24, bold: true, color: DARK });
  slide6.addShape("rect" as PptxGenJS.ShapeType, { x: 0.5, y: 0.85, w: 2, h: 0.05, fill: { color: BLUE } });

  const recs: string[] = [];
  if (highlights.best_day) recs.push(`⭐ Hari terbaik: ${highlights.best_day.tanggal} dengan omzet ${fR(highlights.best_day.omzet)}`);
  if (highlights.worst_day) recs.push(`📉 Hari terendah: ${highlights.worst_day.tanggal} dengan omzet ${fR(highlights.worst_day.omzet)}`);
  if (pctTarget < 100) {
    const need = Math.round((target - s.total_omzet) / Math.max(1, 30 - s.hari));
    recs.push(`🎯 Untuk capai target, butuh rata-rata ${fR(need)}/hari di ${30 - s.hari} hari tersisa`);
  } else {
    recs.push("🎉 Target bulan ini sudah tercapai!");
  }
  if (s.rata_upsell < 1.2) recs.push("📦 Upsell di bawah 1.2x — Rekomendasi: push bundling, promo beli 2 dapat diskon");
  if (s.rata_cac > 55) recs.push("💸 CAC di atas 55% — Rekomendasi: evaluasi audience targeting, kurangi non-performing ads");
  if (s.roas < 3) recs.push("📈 ROAS di bawah 3x — Rekomendasi: fokus ke produk high-margin, optimasi bidding");
  if (highlights.anomalies.length > 0) {
    highlights.anomalies.forEach((a) => {
      recs.push(`⚡ Anomali ${a.tanggal}: omzet ${a.type === "spike" ? "naik" : "turun"} ${Math.abs(a.deviation)}% dari rata-rata`);
    });
  }

  recs.forEach((r, i) => {
    slide6.addText(r, { x: 0.8, y: 1.2 + i * 0.55, w: 11, h: 0.45, fontSize: 13, color: DARK });
  });

  // Footer on all slides
  allSlides.forEach((sl) => {
    sl.addText("FreshVision Dashboard — Confidential", { x: 0.5, y: 7.0, w: 12, h: 0.3, fontSize: 8, color: "9CA3AF", align: "center" });
  });

  return pptx.writeFile({ fileName: `FreshVision_Report_${new Date().toISOString().slice(0, 10)}.pptx` });
}
