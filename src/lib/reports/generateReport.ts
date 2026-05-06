/**
 * Server-side report generator for weekly/monthly PDF reports
 * Uses jsPDF to generate a PDF buffer that can be sent via Telegram
 */
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

function fR(v: number) {
  if (v >= 1_000_000_000) return `Rp${(v / 1_000_000_000).toFixed(1)}M`;
  if (v >= 1_000_000) return `Rp${(v / 1_000_000).toFixed(1)}Jt`;
  if (v >= 1_000) return `Rp${(v / 1_000).toFixed(0)}Rb`;
  return `Rp${Math.round(v).toLocaleString('id-ID')}`;
}

function fN(v: number) {
  return v.toLocaleString('id-ID');
}

export interface ReportData {
  period: string; // e.g. "Mei 2026" or "Week 1 - Mei 2026"
  type: 'weekly' | 'monthly';
  summary: {
    total_omzet: number;
    total_closing: number;
    total_botol: number;
    total_biaya_iklan: number;
    rata_upsell: number;
    rata_cac: number;
    roas: number;
    hari: number;
    avg_omzet_harian: number;
    margin_after_cost: number;
    nilai_per_txn: number;
  };
  target: number;
  channels?: Record<string, {
    total_omzet: number;
    total_closing: number;
    total_botol: number;
    rata_cac: number;
    roi: number;
  }>;
  harian?: { tanggal: string; omzet: number; closing: number; botol: number; cac_total: number }[];
  evaluasi_per_brand?: { freshvision: number; nutriflakes: number; freshmag: number; etawaku: number; total: number };
  highlights?: {
    best_day?: { tanggal: string; omzet: number };
    worst_day?: { tanggal: string; omzet: number };
  };
  aiSummary?: string;
}

const BLUE: [number, number, number] = [37, 99, 235];
const DARK: [number, number, number] = [31, 41, 55];
const GRAY: [number, number, number] = [107, 114, 128];
const GREEN: [number, number, number] = [16, 185, 129];
const RED: [number, number, number] = [239, 68, 68];

export function generateReportPdf(data: ReportData): Buffer {
  const { summary: s, target, channels, harian, evaluasi_per_brand: ev, highlights, aiSummary } = data;
  const pctTarget = target > 0 ? Math.min((s.total_omzet / target) * 100, 999) : 0;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const pageW = doc.internal.pageSize.getWidth();

  // ═══ PAGE 1: COVER + EXECUTIVE SUMMARY ═══
  // Header gradient
  doc.setFillColor(BLUE[0], BLUE[1], BLUE[2]);
  doc.rect(0, 0, pageW, 45, 'F');

  doc.setTextColor(255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text(data.type === 'weekly' ? 'LAPORAN MINGGUAN' : 'LAPORAN BULANAN', 15, 18);

  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text(`FreshVision — ${data.period}`, 15, 28);

  doc.setFontSize(9);
  doc.text(`Generated: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`, 15, 38);

  // KPI Cards
  let y = 55;
  doc.setTextColor(DARK[0], DARK[1], DARK[2]);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('Executive Summary', 15, y);
  y += 2;
  doc.setFillColor(BLUE[0], BLUE[1], BLUE[2]);
  doc.rect(15, y, 25, 0.8, 'F');
  y += 8;

  const kpis = [
    { label: 'Total Omzet', value: fR(s.total_omzet), sub: `${pctTarget.toFixed(0)}% target` },
    { label: 'Total Closing', value: fN(s.total_closing), sub: `${fN(Math.round(s.total_closing / Math.max(s.hari, 1)))}/hari` },
    { label: 'Total Botol', value: fN(s.total_botol), sub: `Upsell ${s.rata_upsell.toFixed(2)}x` },
    { label: 'ROAS', value: `${s.roas.toFixed(1)}x`, sub: `Margin ${s.margin_after_cost.toFixed(0)}%` },
    { label: 'CAC', value: `${s.rata_cac.toFixed(1)}%`, sub: s.rata_cac <= 50 ? 'Efisien' : s.rata_cac <= 60 ? 'Normal' : 'Tinggi' },
    { label: 'Biaya Iklan', value: fR(s.total_biaya_iklan), sub: `Avg ${fR(s.avg_omzet_harian)}/hari` },
  ];

  const colW = (pageW - 30) / 3;
  const rowH = 22;
  kpis.forEach((kpi, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const kx = 15 + col * colW;
    const ky = y + row * rowH;
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(kx, ky, colW - 3, rowH - 3, 2, 2, 'F');
    doc.setFontSize(7);
    doc.setTextColor(GRAY[0], GRAY[1], GRAY[2]);
    doc.setFont('helvetica', 'normal');
    doc.text(kpi.label, kx + 4, ky + 6);
    doc.setFontSize(14);
    doc.setTextColor(DARK[0], DARK[1], DARK[2]);
    doc.setFont('helvetica', 'bold');
    doc.text(kpi.value, kx + 4, ky + 13);
    doc.setFontSize(7);
    doc.setTextColor(GRAY[0], GRAY[1], GRAY[2]);
    doc.setFont('helvetica', 'normal');
    doc.text(kpi.sub, kx + 4, ky + 18);
  });
  y += rowH * 2 + 5;

  // Progress bar
  doc.setFontSize(9);
  doc.setTextColor(DARK[0], DARK[1], DARK[2]);
  doc.setFont('helvetica', 'bold');
  doc.text(`Progress: ${fR(s.total_omzet)} / ${fR(target)} (${pctTarget.toFixed(0)}%)`, 15, y);
  y += 3;
  doc.setFillColor(229, 231, 235);
  doc.roundedRect(15, y, pageW - 30, 4, 2, 2, 'F');
  const barW = Math.min(pageW - 30, (pageW - 30) * pctTarget / 100);
  const barColor = pctTarget >= 80 ? GREEN : pctTarget >= 50 ? BLUE : RED;
  doc.setFillColor(barColor[0], barColor[1], barColor[2]);
  doc.roundedRect(15, y, barW, 4, 2, 2, 'F');
  y += 10;

  // Highlights
  if (highlights) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    if (highlights.best_day) {
      doc.setTextColor(GREEN[0], GREEN[1], GREEN[2]);
      doc.text(`Best Day: ${highlights.best_day.tanggal} — ${fR(highlights.best_day.omzet)}`, 15, y);
      y += 5;
    }
    if (highlights.worst_day) {
      doc.setTextColor(RED[0], RED[1], RED[2]);
      doc.text(`Worst Day: ${highlights.worst_day.tanggal} — ${fR(highlights.worst_day.omzet)}`, 15, y);
      y += 5;
    }
  }

  // Channel Performance Table
  if (channels && Object.keys(channels).length > 0) {
    y += 5;
    doc.setTextColor(DARK[0], DARK[1], DARK[2]);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Performa Per Channel', 15, y);
    y += 5;

    const chLabels: Record<string, string> = { video: 'Video', live: 'Live', shop_tab: 'Shop Tab', affiliate: 'Affiliate' };
    const chData = Object.entries(channels).map(([k, c]) => [
      chLabels[k] || k,
      fR(c.total_omzet),
      fN(c.total_closing),
      fN(c.total_botol),
      `${(c.roi || 0).toFixed(1)}x`,
      `${(c.rata_cac || 0).toFixed(1)}%`,
    ]);

    autoTable(doc, {
      startY: y,
      head: [['Channel', 'Omzet', 'Closing', 'Botol', 'ROI', 'CAC']],
      body: chData,
      theme: 'grid',
      headStyles: { fillColor: BLUE, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' } },
      margin: { left: 15, right: 15 },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // Brand Contribution
  if (ev && ev.total > 0) {
    doc.setTextColor(DARK[0], DARK[1], DARK[2]);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Kontribusi Brand', 15, y);
    y += 5;

    autoTable(doc, {
      startY: y,
      head: [['Brand', 'Omzet', '% Kontribusi']],
      body: [
        ['FreshVision', fR(ev.freshvision), `${((ev.freshvision / ev.total) * 100).toFixed(1)}%`],
        ['Nutriflakes', fR(ev.nutriflakes), `${((ev.nutriflakes / ev.total) * 100).toFixed(1)}%`],
        ['Freshmag', fR(ev.freshmag), `${((ev.freshmag / ev.total) * 100).toFixed(1)}%`],
        ['Etawaku', fR(ev.etawaku), `${((ev.etawaku / ev.total) * 100).toFixed(1)}%`],
      ],
      theme: 'grid',
      headStyles: { fillColor: BLUE, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
      margin: { left: 15, right: 15 },
      tableWidth: 120,
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // AI Summary (if provided)
  if (aiSummary) {
    if (y > 240) { doc.addPage(); y = 20; }
    doc.setTextColor(DARK[0], DARK[1], DARK[2]);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('AI Analysis', 15, y);
    y += 5;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(aiSummary.replace(/[#*_]/g, ''), pageW - 30);
    doc.text(lines, 15, y);
    y += lines.length * 3.5;
  }

  // Daily data table on new page
  if (harian && harian.length > 0) {
    doc.addPage();
    let ty = 15;
    doc.setTextColor(DARK[0], DARK[1], DARK[2]);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('Data Harian', 15, ty);
    ty += 6;

    autoTable(doc, {
      startY: ty,
      head: [['Tanggal', 'Omzet', 'Closing', 'Botol', 'CAC']],
      body: [...harian].reverse().map(r => [
        r.tanggal,
        fR(r.omzet),
        fN(r.closing),
        fN(r.botol),
        `${r.cac_total.toFixed(1)}%`,
      ]),
      theme: 'grid',
      headStyles: { fillColor: BLUE, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' } },
      margin: { left: 15, right: 15 },
    });
  }

  // Footer
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(180);
    doc.text('FreshVision Marketing Suite — Auto Report', pageW / 2, 290, { align: 'center' });
    doc.text(`${i}/${pages}`, pageW - 15, 290, { align: 'right' });
  }

  // Return as Buffer
  const arrayBuffer = doc.output('arraybuffer');
  return Buffer.from(arrayBuffer);
}

export function formatReportCaption(data: ReportData): string {
  const s = data.summary;
  const pct = data.target > 0 ? ((s.total_omzet / data.target) * 100).toFixed(0) : '0';
  return [
    `<b>${data.type === 'weekly' ? 'Laporan Mingguan' : 'Laporan Bulanan'} - ${data.period}</b>`,
    '',
    `Omzet: ${fR(s.total_omzet)} (${pct}% target)`,
    `Closing: ${fN(s.total_closing)} | Botol: ${fN(s.total_botol)}`,
    `ROAS: ${s.roas.toFixed(1)}x | CAC: ${s.rata_cac.toFixed(1)}%`,
    `Hari: ${s.hari} | Avg: ${fR(s.avg_omzet_harian)}/hari`,
  ].join('\n');
}
