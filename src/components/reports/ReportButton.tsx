"use client";

import { useState } from "react";
import { FileText, Send, Loader2, Calendar, Download } from "lucide-react";
import { useAlertStore } from "@/store/useAlertStore";

interface ReportButtonProps {
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
  channels?: Record<string, any>;
  harian?: any[];
  evaluasi_per_brand?: any;
  highlights?: any;
  aiSummary?: string;
  period?: string;
}

export default function ReportButton({
  summary,
  target,
  channels,
  harian,
  evaluasi_per_brand,
  highlights,
  aiSummary,
  period,
}: ReportButtonProps) {
  const { settings } = useAlertStore();
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const generateReport = async (type: 'weekly' | 'monthly') => {
    setGenerating(true);
    setResult(null);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          period: period || new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }),
          summary,
          target,
          channels,
          harian,
          evaluasi_per_brand,
          highlights,
          aiSummary,
          telegram: settings.telegram,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        const msg = data.telegram?.sent
          ? `Report ${type} dikirim ke Telegram!`
          : `Report ${type} berhasil dibuat (PDF: ${(data.pdfSize / 1024).toFixed(0)}KB)`;
        setResult({ success: true, message: msg });
      } else {
        setResult({ success: false, message: data.error || 'Gagal generate report' });
      }
    } catch {
      setResult({ success: false, message: 'Network error' });
    }
    setGenerating(false);
  };

  return (
    <div className="bg-white rounded-2xl border p-4">
      <div className="flex items-center gap-2 mb-3">
        <FileText className="text-blue-500" size={18} />
        <h3 className="text-sm font-bold text-gray-800">Auto Report</h3>
      </div>

      <div className="space-y-2">
        <button
          onClick={() => generateReport('weekly')}
          disabled={generating}
          className="w-full flex items-center justify-center gap-2 bg-blue-50 text-blue-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-100 disabled:opacity-50 transition"
        >
          {generating ? <Loader2 size={14} className="animate-spin" /> : <Calendar size={14} />}
          {generating ? 'Generating...' : 'Generate Weekly Report'}
        </button>

        <button
          onClick={() => generateReport('monthly')}
          disabled={generating}
          className="w-full flex items-center justify-center gap-2 bg-green-50 text-green-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-green-100 disabled:opacity-50 transition"
        >
          {generating ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
          {generating ? 'Generating...' : 'Generate Monthly Report'}
        </button>
      </div>

      {settings.telegram.enabled && (
        <div className="mt-2 text-[10px] text-green-600 flex items-center gap-1">
          <Send size={10} /> Report akan dikirim ke Telegram
        </div>
      )}

      {result && (
        <div className={`mt-2 text-xs p-2 rounded ${result.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {result.message}
        </div>
      )}
    </div>
  );
}
