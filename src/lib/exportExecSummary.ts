import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import PptxGenJS from "pptxgenjs";

/**
 * Export engine khusus Executive Summary.
 * Semua nilai dikirim sebagai string yang sudah terformat dari HomeScreen
 * sehingga PDF/PPT/Telegram konsisten dengan tampilan dashboard.
 */
export interface ExecSummaryExportData {
  periodLabel: string;
  generatedAt: string;
  storeNames: string[];
  healthScore: number;
  healthStatus: string;
  kpis: { label: string; value: string }[];
  pnlRows: { label: string; value: string }[];
  costBreakdown: { label: string; value: string; pct: string }[];
  target: { label: string; value: string }[];
  momRows: { metric: string; curr: string; delta: string }[];
  topCreators: { rank: number; username: string; gmv: string; refund: string }[];
  storeRows: { name: string; gmv: string; share: string; refund: string; orders: string }[];
  alerts: { title: string; message: string }[];
  recommendations: { title: string; text: string }[];
}

const BLUE: [number, number, number] = [26, 35, 126];
const DARK: [number, number, number] = [31, 41, 55];
const GRAY: [number, number, number] = [107, 114, 128];

function slugify(s: string): string {
  return s.replace(/\s+/g, "-").replace(/[^A-Za-z0-9-]/g, "");
}

// ─── PDF ────────────────────────────────────────────────────

function pdfSection(doc: jsPDF, text: string, y: number): number {
  if (y > 262) {
    doc.addPage();
    y = 20;
  }
  doc.setFontSize(11);
  doc.setTextColor(...BLUE);
  doc.setFont("helvetica", "bold");
  doc.text(text, 14, y);
  doc.setDrawColor(...BLUE);
  doc.setLineWidth(0.4);
  doc.line(14, y + 1.5, 196, y + 1.5);
  return y + 5;
}

function afterTable(doc: jsPDF, fallback: number): number {
  const d = doc as jsPDF & { lastAutoTable?: { finalY?: number } };
  return (d.lastAutoTable?.finalY || fallback) + 9;
}

const TABLE_BASE = {
  margin: { left: 14, right: 14 },
  styles: { fontSize: 8, cellPadding: 2, textColor: DARK as [number, number, number] },
  headStyles: { fillColor: BLUE as [number, number, number], textColor: [255, 255, 255] as [number, number, number], fontStyle: "bold" as const },
  alternateRowStyles: { fillColor: [246, 248, 252] as [number, number, number] },
};

export function generateExecSummaryPdf(data: ExecSummaryExportData) {
  const doc = new jsPDF();

  // Header band
  doc.setFillColor(...BLUE);
  doc.rect(0, 0, 210, 32, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.text("EXECUTIVE SUMMARY", 14, 13);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`${data.periodLabel}  |  ${data.storeNames.join(", ") || "Semua Toko"}`, 14, 20);
  doc.setFontSize(8);
  doc.text(`Dibuat ${data.generatedAt} - Marketing Suite`, 14, 26);

  // Health score box (kanan atas)
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(158, 7, 38, 18, 2, 2, "F");
  doc.setTextColor(...BLUE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(`${data.healthScore}/100`, 177, 15, { align: "center" });
  doc.setFontSize(6.5);
  doc.text(data.healthStatus, 177, 21, { align: "center" });

  let y = 42;

  // KPI Utama
  y = pdfSection(doc, "KPI UTAMA", y);
  autoTable(doc, {
    ...TABLE_BASE,
    startY: y,
    head: [["Indikator", "Nilai"]],
    body: data.kpis.map((k) => [k.label, k.value]),
    columnStyles: { 1: { fontStyle: "bold", halign: "right" } },
  });
  y = afterTable(doc, y);

  // Profit & Loss
  y = pdfSection(doc, "PROFIT & LOSS", y);
  autoTable(doc, {
    ...TABLE_BASE,
    startY: y,
    head: [["Komponen", "Nilai"]],
    body: data.pnlRows.map((r) => [r.label, r.value]),
    columnStyles: { 1: { fontStyle: "bold", halign: "right" } },
  });
  y = afterTable(doc, y);

  if (data.costBreakdown.length > 0) {
    y = pdfSection(doc, "RINCIAN BIAYA OPERASIONAL", y);
    autoTable(doc, {
      ...TABLE_BASE,
      startY: y,
      head: [["Komponen Biaya", "Nilai", "% Total Biaya"]],
      body: data.costBreakdown.map((c) => [c.label, c.value, c.pct]),
      columnStyles: { 1: { halign: "right" }, 2: { halign: "right" } },
    });
    y = afterTable(doc, y);
  }

  if (data.target.length > 0) {
    y = pdfSection(doc, "TARGET & PACE", y);
    autoTable(doc, {
      ...TABLE_BASE,
      startY: y,
      head: [["Indikator", "Nilai"]],
      body: data.target.map((t) => [t.label, t.value]),
      columnStyles: { 1: { fontStyle: "bold", halign: "right" } },
    });
    y = afterTable(doc, y);
  }

  if (data.momRows.length > 0) {
    y = pdfSection(doc, "PERBANDINGAN VS BULAN LALU", y);
    autoTable(doc, {
      ...TABLE_BASE,
      startY: y,
      head: [["Metrik", "Bulan Ini", "Perubahan"]],
      body: data.momRows.map((m) => [m.metric, m.curr, m.delta]),
      columnStyles: { 1: { halign: "right" }, 2: { halign: "right" } },
    });
    y = afterTable(doc, y);
  }

  if (data.topCreators.length > 0) {
    y = pdfSection(doc, "TOP KREATOR AFFILIATE", y);
    autoTable(doc, {
      ...TABLE_BASE,
      startY: y,
      head: [["#", "Kreator", "GMV", "Refund"]],
      body: data.topCreators.map((c) => [String(c.rank), `@${c.username}`, c.gmv, c.refund]),
      columnStyles: { 0: { cellWidth: 10 }, 2: { halign: "right" }, 3: { halign: "right" } },
    });
    y = afterTable(doc, y);
  }

  if (data.storeRows.length > 0) {
    y = pdfSection(doc, "KONTRIBUSI PER TOKO", y);
    autoTable(doc, {
      ...TABLE_BASE,
      startY: y,
      head: [["Toko", "GMV", "Share", "Refund", "Orders"]],
      body: data.storeRows.map((s) => [s.name, s.gmv, s.share, s.refund, s.orders]),
      columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" } },
    });
    y = afterTable(doc, y);
  }

  if (data.alerts.length > 0) {
    y = pdfSection(doc, "PERHATIAN & ALERT", y);
    autoTable(doc, {
      ...TABLE_BASE,
      startY: y,
      head: [["Alert", "Detail"]],
      body: data.alerts.map((a) => [a.title, a.message]),
      columnStyles: { 0: { cellWidth: 55, fontStyle: "bold" } },
    });
    y = afterTable(doc, y);
  }

  if (data.recommendations.length > 0) {
    y = pdfSection(doc, "REKOMENDASI OMSET DOCTOR", y);
    autoTable(doc, {
      ...TABLE_BASE,
      startY: y,
      head: [["Diagnosis", "Rekomendasi"]],
      body: data.recommendations.map((r) => [r.title, r.text]),
      columnStyles: { 0: { cellWidth: 60, fontStyle: "bold" } },
    });
  }

  // Footer nomor halaman
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(...GRAY);
    doc.text(`Marketing Suite - Executive Summary ${data.periodLabel}`, 14, 291);
    doc.text(`Halaman ${i}/${pages}`, 196, 291, { align: "right" });
  }

  doc.save(`Executive-Summary-${slugify(data.periodLabel)}.pdf`);
}

// ─── PPT ────────────────────────────────────────────────────

const PPT_BLUE = "1A237E";
const PPT_LIGHT = "EEF2FF";

export async function generateExecSummaryPpt(data: ExecSummaryExportData) {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";

  const addTitleBar = (slide: PptxGenJS.Slide, title: string) => {
    slide.addShape("rect", { x: 0, y: 0, w: 13.33, h: 0.85, fill: { color: PPT_BLUE } });
    slide.addText(title, { x: 0.4, y: 0.08, w: 9.5, h: 0.7, fontSize: 20, bold: true, color: "FFFFFF" });
    slide.addText(data.periodLabel, { x: 10.0, y: 0.08, w: 3.0, h: 0.7, fontSize: 13, color: "C7D2FE", align: "right" });
  };

  // Slide 1 — Cover
  const s1 = pptx.addSlide();
  s1.background = { color: PPT_BLUE };
  s1.addText("EXECUTIVE SUMMARY", { x: 0.7, y: 2.1, w: 12, h: 1.1, fontSize: 44, bold: true, color: "FFFFFF" });
  s1.addText(data.periodLabel, { x: 0.72, y: 3.25, w: 12, h: 0.6, fontSize: 22, color: "A5B4FC" });
  s1.addText(`Health Score ${data.healthScore}/100  •  ${data.healthStatus}`, {
    x: 0.72, y: 4.1, w: 6.4, h: 0.55, fontSize: 15, bold: true, color: "FFFFFF",
    fill: { color: "3949AB" }, align: "center",
  });
  s1.addText(`${data.storeNames.join("  •  ") || "Semua Toko"}    |    Dibuat ${data.generatedAt}`, {
    x: 0.72, y: 6.7, w: 12, h: 0.4, fontSize: 12, color: "9FA8DA",
  });

  // Slide 2 — KPI Grid
  const s2 = pptx.addSlide();
  addTitleBar(s2, "📊 KPI Utama");
  const kpis = data.kpis.slice(0, 8);
  kpis.forEach((k, i) => {
    const col = i % 4;
    const row = Math.floor(i / 4);
    const x = 0.45 + col * 3.15;
    const y = 1.35 + row * 2.6;
    s2.addShape("roundRect", { x, y, w: 2.95, h: 2.25, fill: { color: PPT_LIGHT }, rectRadius: 0.08, line: { color: "C7D2FE", width: 1 } });
    s2.addText(k.value, { x: x + 0.15, y: y + 0.55, w: 2.65, h: 0.8, fontSize: 19, bold: true, color: PPT_BLUE, align: "center" });
    s2.addText(k.label, { x: x + 0.15, y: y + 1.45, w: 2.65, h: 0.6, fontSize: 11, color: "475569", align: "center" });
  });

  // Slide 3 — P&L
  const s3 = pptx.addSlide();
  addTitleBar(s3, "💼 Profit & Loss");
  const pnlTable: PptxGenJS.TableRow[] = [
    [
      { text: "Komponen", options: { bold: true, color: "FFFFFF", fill: { color: PPT_BLUE } } },
      { text: "Nilai", options: { bold: true, color: "FFFFFF", fill: { color: PPT_BLUE } } },
    ],
    ...data.pnlRows.map((r): PptxGenJS.TableRow => [{ text: r.label }, { text: r.value, options: { bold: true, align: "right" } }]),
  ];
  s3.addTable(pnlTable, { x: 0.45, y: 1.3, w: 6.1, fontSize: 12, border: { type: "solid", color: "E2E8F0", pt: 1 }, rowH: 0.42 });
  if (data.costBreakdown.length > 0) {
    const costTable: PptxGenJS.TableRow[] = [
      [
        { text: "Komponen Biaya", options: { bold: true, color: "FFFFFF", fill: { color: PPT_BLUE } } },
        { text: "Nilai", options: { bold: true, color: "FFFFFF", fill: { color: PPT_BLUE } } },
        { text: "%", options: { bold: true, color: "FFFFFF", fill: { color: PPT_BLUE } } },
      ],
      ...data.costBreakdown.map((c): PptxGenJS.TableRow => [
        { text: c.label },
        { text: c.value, options: { align: "right" } },
        { text: c.pct, options: { align: "right" } },
      ]),
    ];
    s3.addTable(costTable, { x: 6.9, y: 1.3, w: 6.0, fontSize: 11, border: { type: "solid", color: "E2E8F0", pt: 1 }, rowH: 0.38 });
  }

  // Slide 4 — Kreator & Toko
  if (data.topCreators.length > 0 || data.storeRows.length > 0) {
    const s4 = pptx.addSlide();
    addTitleBar(s4, "👥 Kreator & Kontribusi Toko");
    if (data.topCreators.length > 0) {
      const creatorTable: PptxGenJS.TableRow[] = [
        [
          { text: "#", options: { bold: true, color: "FFFFFF", fill: { color: PPT_BLUE } } },
          { text: "Kreator", options: { bold: true, color: "FFFFFF", fill: { color: PPT_BLUE } } },
          { text: "GMV", options: { bold: true, color: "FFFFFF", fill: { color: PPT_BLUE } } },
          { text: "Refund", options: { bold: true, color: "FFFFFF", fill: { color: PPT_BLUE } } },
        ],
        ...data.topCreators.map((c): PptxGenJS.TableRow => [
          { text: String(c.rank) },
          { text: `@${c.username}` },
          { text: c.gmv, options: { align: "right" } },
          { text: c.refund, options: { align: "right" } },
        ]),
      ];
      s4.addTable(creatorTable, { x: 0.45, y: 1.3, w: 6.1, fontSize: 11, border: { type: "solid", color: "E2E8F0", pt: 1 }, rowH: 0.38 });
    }
    if (data.storeRows.length > 0) {
      const storeTable: PptxGenJS.TableRow[] = [
        [
          { text: "Toko", options: { bold: true, color: "FFFFFF", fill: { color: PPT_BLUE } } },
          { text: "GMV", options: { bold: true, color: "FFFFFF", fill: { color: PPT_BLUE } } },
          { text: "Share", options: { bold: true, color: "FFFFFF", fill: { color: PPT_BLUE } } },
          { text: "Refund", options: { bold: true, color: "FFFFFF", fill: { color: PPT_BLUE } } },
        ],
        ...data.storeRows.map((s): PptxGenJS.TableRow => [
          { text: s.name },
          { text: s.gmv, options: { align: "right" } },
          { text: s.share, options: { align: "right" } },
          { text: s.refund, options: { align: "right" } },
        ]),
      ];
      s4.addTable(storeTable, { x: 6.9, y: 1.3, w: 6.0, fontSize: 11, border: { type: "solid", color: "E2E8F0", pt: 1 }, rowH: 0.38 });
    }
  }

  // Slide 5 — Alerts & Rekomendasi
  if (data.alerts.length > 0 || data.recommendations.length > 0) {
    const s5 = pptx.addSlide();
    addTitleBar(s5, "⚠️ Perhatian & Rekomendasi");
    if (data.alerts.length > 0) {
      s5.addText("Perhatian", { x: 0.45, y: 1.2, w: 6.0, h: 0.4, fontSize: 15, bold: true, color: "B91C1C" });
      s5.addText(
        data.alerts.slice(0, 5).map((a) => ({ text: `${a.title} — ${a.message}`, options: { bullet: true, breakLine: true } })),
        { x: 0.45, y: 1.65, w: 6.1, h: 5.2, fontSize: 11.5, color: "334155", valign: "top" }
      );
    }
    if (data.recommendations.length > 0) {
      s5.addText("Rekomendasi", { x: 6.9, y: 1.2, w: 6.0, h: 0.4, fontSize: 15, bold: true, color: "047857" });
      s5.addText(
        data.recommendations.slice(0, 5).map((r) => ({ text: `${r.title}: ${r.text}`, options: { bullet: true, breakLine: true } })),
        { x: 6.9, y: 1.65, w: 6.0, h: 5.2, fontSize: 11.5, color: "334155", valign: "top" }
      );
    }
  }

  await pptx.writeFile({ fileName: `Executive-Summary-${slugify(data.periodLabel)}.pptx` });
}

// ─── TELEGRAM ───────────────────────────────────────────────

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function buildExecSummaryTelegramText(data: ExecSummaryExportData): string {
  const lines: string[] = [];
  lines.push(`<b>📊 EXECUTIVE SUMMARY — ${esc(data.periodLabel)}</b>`);
  lines.push(`🏥 Health Score: <b>${data.healthScore}/100</b> (${esc(data.healthStatus)})`);
  lines.push("");
  lines.push("<b>KPI Utama</b>");
  data.kpis.slice(0, 8).forEach((k) => lines.push(`• ${esc(k.label)}: <b>${esc(k.value)}</b>`));
  if (data.pnlRows.length > 0) {
    lines.push("");
    lines.push("<b>Profit &amp; Loss</b>");
    data.pnlRows.forEach((r) => lines.push(`• ${esc(r.label)}: <b>${esc(r.value)}</b>`));
  }
  if (data.target.length > 0) {
    lines.push("");
    lines.push("<b>🎯 Target &amp; Pace</b>");
    data.target.forEach((t) => lines.push(`• ${esc(t.label)}: <b>${esc(t.value)}</b>`));
  }
  if (data.alerts.length > 0) {
    lines.push("");
    lines.push(`<b>⚠️ Perhatian (${data.alerts.length})</b>`);
    data.alerts.slice(0, 4).forEach((a) => lines.push(`• <b>${esc(a.title)}</b> — ${esc(a.message)}`));
  }
  if (data.recommendations.length > 0) {
    lines.push("");
    lines.push("<b>💡 Rekomendasi</b>");
    data.recommendations.slice(0, 3).forEach((r) => lines.push(`• ${esc(r.text)}`));
  }
  lines.push("");
  lines.push(`<i>Marketing Suite • ${esc(data.generatedAt)}</i>`);
  return lines.join("\n");
}
