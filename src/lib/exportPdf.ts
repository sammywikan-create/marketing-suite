import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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
  harian: {
    tanggal: string; closing: number; botol: number; omzet: number;
    upsell: number; cac_total: number; pct_kontribusi_fv: number;
    biaya_iklan: number; komisi_affiliate: number;
  }[];
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

const BLUE: [number, number, number] = [37, 99, 235];
const DARK: [number, number, number] = [31, 41, 55];
const GRAY: [number, number, number] = [107, 114, 128];

export function generatePdf(data: ExportData) {
  const { summary: s, harian, channels, weekly, evaluasi_per_brand: ev, highlights, target, healthScore, healthLabel } = data;
  const pctTarget = Math.min((s.total_omzet / target) * 100, 999);
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  function addFooter() {
    const pages = doc.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(180);
      doc.text("FreshVision Dashboard — Confidential", pageW / 2, pageH - 5, { align: "center" });
      doc.text(`Halaman ${i} / ${pages}`, pageW - 15, pageH - 5, { align: "right" });
    }
  }

  // ═══ PAGE 1: HEADER + EXECUTIVE SUMMARY ═══
  // Title bar
  doc.setFillColor(BLUE[0], BLUE[1], BLUE[2]);
  doc.rect(0, 0, pageW, 28, "F");
  doc.setTextColor(255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("LAPORAN HARIAN FRESHVISION", 15, 13);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Generated: ${new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })} | Data: ${s.hari} hari | Health Score: ${healthScore}/100 (${healthLabel})`, 15, 22);

  // KPI Summary
  let y = 35;
  doc.setTextColor(DARK[0], DARK[1], DARK[2]);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Executive Summary", 15, y);
  y += 3;
  doc.setFillColor(BLUE[0], BLUE[1], BLUE[2]);
  doc.rect(15, y, 30, 0.8, "F");
  y += 6;

  // KPI Grid
  const kpis = [
    ["Total Omzet", fR(s.total_omzet), `Target: ${fR(target)} (${pctTarget.toFixed(1)}%)`],
    ["Total Closing", fN(s.total_closing), `Avg: ${fN(s.avg_closing_harian)}/hari`],
    ["Total Botol", fN(s.total_botol), `Avg: ${fN(s.avg_botol_harian)}/hari`],
    ["Nilai/Txn", fR(s.nilai_per_txn), `Omzet/hari: ${fR(s.avg_omzet_harian)}`],
    ["Upsell", `${s.rata_upsell.toFixed(2)}x`, s.rata_upsell >= 1.3 ? "Baik" : s.rata_upsell >= 1.1 ? "Cukup" : "Rendah"],
    ["CAC Total", `${s.rata_cac.toFixed(1)}%`, s.rata_cac <= 50 ? "Efisien" : s.rata_cac <= 60 ? "Normal" : "Tinggi"],
    ["ROAS", `${s.roas.toFixed(1)}x`, s.roas >= 4 ? "Excellent" : s.roas >= 3 ? "OK" : "Low"],
    ["Kontribusi FV", `${s.pct_kontribusi_fv}%`, `${fR(s.total_omzet_fv)} / ${fR(s.total_omzet_all)}`],
  ];

  const colW = 65;
  const rowH = 18;
  kpis.forEach((kpi, i) => {
    const col = i % 4;
    const row = Math.floor(i / 4);
    const kx = 15 + col * colW;
    const ky = y + row * rowH;
    doc.setFillColor(243, 244, 246);
    doc.roundedRect(kx, ky, colW - 3, rowH - 2, 2, 2, "F");
    doc.setFontSize(7);
    doc.setTextColor(GRAY[0], GRAY[1], GRAY[2]);
    doc.setFont("helvetica", "normal");
    doc.text(kpi[0], kx + 3, ky + 5);
    doc.setFontSize(13);
    doc.setTextColor(DARK[0], DARK[1], DARK[2]);
    doc.setFont("helvetica", "bold");
    doc.text(kpi[1], kx + 3, ky + 11);
    doc.setFontSize(6);
    doc.setTextColor(GRAY[0], GRAY[1], GRAY[2]);
    doc.setFont("helvetica", "normal");
    doc.text(kpi[2], kx + 3, ky + 15);
  });
  y += rowH * 2 + 4;

  // Progress bar
  doc.setFontSize(8);
  doc.setTextColor(DARK[0], DARK[1], DARK[2]);
  doc.setFont("helvetica", "bold");
  doc.text(`Progress Target: ${pctTarget.toFixed(1)}%`, 15, y);
  y += 2;
  doc.setFillColor(229, 231, 235);
  doc.roundedRect(15, y, pageW - 30, 4, 2, 2, "F");
  const barW = Math.min(pageW - 30, (pageW - 30) * pctTarget / 100);
  doc.setFillColor(BLUE[0], BLUE[1], BLUE[2]);
  doc.roundedRect(15, y, barW, 4, 2, 2, "F");
  y += 10;

  // Highlights
  doc.setFontSize(9);
  doc.setTextColor(DARK[0], DARK[1], DARK[2]);
  doc.setFont("helvetica", "bold");
  if (highlights.best_day) {
    doc.text(`Hari Terbaik: ${highlights.best_day.tanggal} — ${fR(highlights.best_day.omzet)}`, 15, y);
    y += 5;
  }
  if (highlights.worst_day) {
    doc.text(`Hari Terendah: ${highlights.worst_day.tanggal} — ${fR(highlights.worst_day.omzet)}`, 15, y);
    y += 5;
  }

  // ═══ PAGE 2: CHANNEL COMPARISON ═══
  doc.addPage();
  y = 15;
  doc.setFontSize(14);
  doc.setTextColor(DARK[0], DARK[1], DARK[2]);
  doc.setFont("helvetica", "bold");
  doc.text("Channel Performance", 15, y);
  y += 3;
  doc.setFillColor(BLUE[0], BLUE[1], BLUE[2]);
  doc.rect(15, y, 30, 0.8, "F");
  y += 5;

  const chLabels: Record<string, string> = { shop: "Shop", video: "Video", live: "Live", shop_tab: "Shop Tab", affiliate: "Affiliate" };
  const totalChOmzet = Object.values(channels).reduce((s, c) => s + c.total_omzet, 0);
  const chTableData = Object.entries(channels).map(([k, c]) => [
    chLabels[k] || k,
    fR(c.total_omzet),
    totalChOmzet > 0 ? `${((c.total_omzet / totalChOmzet) * 100).toFixed(1)}%` : "0%",
    fN(c.total_closing),
    fN(c.total_botol),
    `${c.rata_upsell.toFixed(2)}x`,
    `${c.rata_cac.toFixed(1)}%`,
    `${c.hari}`,
  ]);

  autoTable(doc, {
    startY: y,
    head: [["Channel", "Omzet", "% Total", "Closing", "Botol", "Upsell", "CAC", "Hari"]],
    body: chTableData,
    theme: "grid",
    headStyles: { fillColor: BLUE, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    columnStyles: {
      1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" },
      4: { halign: "right" }, 5: { halign: "right" }, 6: { halign: "right" }, 7: { halign: "right" },
    },
    margin: { left: 15, right: 15 },
  });

  // Brand Kontribusi
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Kontribusi Per Brand", 15, y);
  y += 5;
  autoTable(doc, {
    startY: y,
    head: [["Brand", "Omzet", "% Total"]],
    body: [
      ["FreshVision", fR(ev.freshvision), ev.total > 0 ? `${((ev.freshvision / ev.total) * 100).toFixed(1)}%` : "0%"],
      ["Nutriflakes", fR(ev.nutriflakes), ev.total > 0 ? `${((ev.nutriflakes / ev.total) * 100).toFixed(1)}%` : "0%"],
      ["Freshmag", fR(ev.freshmag), ev.total > 0 ? `${((ev.freshmag / ev.total) * 100).toFixed(1)}%` : "0%"],
      ["Etawaku", fR(ev.etawaku), ev.total > 0 ? `${((ev.etawaku / ev.total) * 100).toFixed(1)}%` : "0%"],
      ["TOTAL", fR(ev.total), "100%"],
    ],
    theme: "grid",
    headStyles: { fillColor: BLUE, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    columnStyles: { 1: { halign: "right" }, 2: { halign: "right" } },
    margin: { left: 15, right: 15 },
  });

  // ═══ PAGE 3: WEEKLY EVALUATION ═══
  doc.addPage();
  y = 15;
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Evaluasi Mingguan", 15, y);
  y += 3;
  doc.setFillColor(BLUE[0], BLUE[1], BLUE[2]);
  doc.rect(15, y, 30, 0.8, "F");
  y += 5;

  autoTable(doc, {
    startY: y,
    head: [["Minggu", "Omzet", "Closing", "Botol", "Avg/Hari", "Upsell", "CAC", "WoW"]],
    body: weekly.map((w) => [
      w.label,
      fR(w.total_omzet),
      fN(w.total_closing),
      fN(w.total_botol),
      fR(w.rata_omzet_harian),
      `${w.rata_upsell.toFixed(2)}x`,
      `${w.rata_cac.toFixed(1)}%`,
      w.wow_omzet !== 0 ? `${w.wow_omzet > 0 ? "+" : ""}${w.wow_omzet}%` : "—",
    ]),
    theme: "grid",
    headStyles: { fillColor: BLUE, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    columnStyles: {
      1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" },
      4: { halign: "right" }, 5: { halign: "right" }, 6: { halign: "right" }, 7: { halign: "right" },
    },
    margin: { left: 15, right: 15 },
  });

  // Cost Analysis
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Cost Analysis", 15, y);
  y += 5;
  autoTable(doc, {
    startY: y,
    head: [["Metrik", "Nilai"]],
    body: [
      ["Total Biaya Iklan", fR(s.total_biaya_iklan)],
      ["Total Komisi Affiliate", fR(s.total_komisi_aff)],
      ["Total Cost", fR(s.total_cost)],
      ["ROAS", `${s.roas.toFixed(1)}x`],
      ["Cost Per Closing", fR(s.cost_per_closing)],
      ["Cost Per Botol", fR(s.cost_per_botol)],
      ["Margin Setelah Biaya", `${s.margin_after_cost}%`],
    ],
    theme: "grid",
    headStyles: { fillColor: BLUE, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    columnStyles: { 1: { halign: "right" } },
    margin: { left: 15, right: 15 },
    tableWidth: 120,
  });

  // ═══ PAGE 4: DAILY DATA ═══
  doc.addPage();
  y = 15;
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Data Harian Detail", 15, y);
  y += 3;
  doc.setFillColor(BLUE[0], BLUE[1], BLUE[2]);
  doc.rect(15, y, 30, 0.8, "F");
  y += 5;

  autoTable(doc, {
    startY: y,
    head: [["Tanggal", "Closing", "Botol", "Omzet", "Upsell", "CAC %", "Kontribusi %", "Biaya Iklan", "Komisi Aff"]],
    body: [...harian].reverse().map((r) => [
      r.tanggal,
      fN(r.closing),
      fN(r.botol),
      fR(r.omzet),
      `${r.upsell.toFixed(2)}x`,
      `${r.cac_total.toFixed(1)}%`,
      `${r.pct_kontribusi_fv.toFixed(1)}%`,
      fR(r.biaya_iklan),
      fR(r.komisi_affiliate),
    ]),
    theme: "grid",
    headStyles: { fillColor: BLUE, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 7 },
    bodyStyles: { fontSize: 7 },
    columnStyles: {
      1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" },
      4: { halign: "right" }, 5: { halign: "right" }, 6: { halign: "right" },
      7: { halign: "right" }, 8: { halign: "right" },
    },
    margin: { left: 15, right: 15 },
  });

  addFooter();
  doc.save(`FreshVision_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
}
