"use client";
import { useMemo, useState } from "react";
import { useGMVStore } from "@/lib/gmvStore";
import { scoreCreative, formatRupiah, formatPct, formatNum, CreativeAction, fmtDec } from "@/utils/gmvAnalyzer";
import { Sparkles, AlertCircle, ArrowUpDown } from "lucide-react";

const actionColors: Record<CreativeAction, { text: string; bg: string }> = {
  SCALE: { text: "text-green-700", bg: "bg-green-50" },
  PERTAHANKAN: { text: "text-blue-700", bg: "bg-blue-50" },
  OPTIMASI: { text: "text-orange-700", bg: "bg-orange-50" },
  HENTIKAN: { text: "text-red-700", bg: "bg-red-50" },
};

function ScoreBar({ score }: { score: number }) {
  const color = score >= 70 ? "bg-green-500" : score >= 50 ? "bg-blue-500" : score >= 30 ? "bg-orange-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${score}%` }} />
      </div>
      <span className={`text-xs font-bold ${score >= 70 ? "text-green-600" : score >= 50 ? "text-blue-600" : score >= 30 ? "text-orange-600" : "text-red-600"}`}>{score}</span>
    </div>
  );
}

type SortKey = "campaignName" | "creativeType" | "cost" | "grossRevenue" | "roi" | "skuOrders" | "costPerOrder" | "clickRate" | "conversionRate" | "viewRate2s" | "viewRate6s" | "score";

export default function GMVCreativeScreen({ onNavigate }: { onNavigate?: (tab: string) => void }) {
  const { data } = useGMVStore();
  const [filterAction, setFilterAction] = useState<CreativeAction | "ALL">("ALL");
  const [filterCreative, setFilterCreative] = useState("");
  const [filterCampaign, setFilterCampaign] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("score");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const scored = useMemo(() => data.map(r => ({ ...r, score: scoreCreative(r) })), [data]);
  const campaigns = useMemo(() => [...new Set(data.map(d => d.campaignName))].filter(Boolean), [data]);
  const creativeTypes = useMemo(() => [...new Set(data.map(d => d.creativeType))].filter(Boolean), [data]);

  const filtered = useMemo(() => {
    let result = scored;
    if (filterAction !== "ALL") result = result.filter(r => r.score.action === filterAction);
    if (filterCreative) result = result.filter(r => r.creativeType === filterCreative);
    if (filterCampaign) result = result.filter(r => r.campaignName === filterCampaign);
    result.sort((a, b) => {
      let av: number, bv: number;
      if (sortKey === "score") { av = a.score.total; bv = b.score.total; }
      else { av = a[sortKey] as number; bv = b[sortKey] as number; }
      return sortDir === "asc" ? av - bv : bv - av;
    });
    return result;
  }, [scored, filterAction, filterCreative, filterCampaign, sortKey, sortDir]);

  const actionCounts = useMemo(() => {
    const c: Record<string, number> = { SCALE: 0, PERTAHANKAN: 0, OPTIMASI: 0, HENTIKAN: 0 };
    scored.forEach(r => c[r.score.action]++);
    return c;
  }, [scored]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  }

  function SH({ label, k, align }: { label: string; k: SortKey; align?: string }) {
    return (
      <th className={`px-3 py-3 font-semibold text-muted cursor-pointer hover:text-foreground select-none whitespace-nowrap ${align || "text-left"}`} onClick={() => toggleSort(k)}>
        <span className="inline-flex items-center gap-1">{label}<ArrowUpDown size={11} className={sortKey === k ? "text-primary" : "text-muted/40"} /></span>
      </th>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertCircle size={48} className="text-muted mb-4" />
        <h2 className="text-lg font-semibold mb-2">Belum Ada Data</h2>
        <p className="text-sm text-muted mb-4">Upload file Excel terlebih dahulu.</p>
        <button onClick={() => onNavigate?.("gmv-upload")} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark">Upload Data</button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary"><Sparkles size={20} /></div>
        <div>
          <h1 className="text-xl font-bold">Creative Optimizer</h1>
          <p className="text-sm text-muted">Scoring otomatis 0-100: ROI(40) + CTR(20) + CVR(20) + 2sVR(10) + 6sVR(10)</p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {[
          { label: "🚀 Scale Budget", count: actionCounts.SCALE, bg: "bg-green-50 border-green-200" },
          { label: "✅ Pertahankan", count: actionCounts.PERTAHANKAN, bg: "bg-blue-50 border-blue-200" },
          { label: "🔧 Optimasi Hook", count: actionCounts.OPTIMASI, bg: "bg-orange-50 border-orange-200" },
          { label: "⛔ Hentikan", count: actionCounts.HENTIKAN, bg: "bg-red-50 border-red-200" },
        ].map((s, i) => (
          <div key={i} className={`rounded-xl p-3 border ${s.bg}`}>
            <p className="text-xs text-muted">{s.label}</p>
            <p className="text-lg font-bold mt-1">{s.count}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <select value={filterAction} onChange={e => setFilterAction(e.target.value as CreativeAction | "ALL")} className="px-3 py-2 border border-border rounded-lg text-sm bg-white">
          <option value="ALL">Semua Action</option>
          <option value="SCALE">🚀 Scale Budget</option>
          <option value="PERTAHANKAN">✅ Pertahankan</option>
          <option value="OPTIMASI">🔧 Optimasi Hook</option>
          <option value="HENTIKAN">⛔ Hentikan</option>
        </select>
        <select value={filterCreative} onChange={e => setFilterCreative(e.target.value)} className="px-3 py-2 border border-border rounded-lg text-sm bg-white">
          <option value="">Semua Creative</option>
          {creativeTypes.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filterCampaign} onChange={e => setFilterCampaign(e.target.value)} className="px-3 py-2 border border-border rounded-lg text-sm bg-white max-w-[200px]">
          <option value="">Semua Campaign</option>
          {campaigns.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 border-b border-border text-left">
              <SH label="Campaign" k="campaignName" />
              <SH label="Creative" k="creativeType" />
              <th className="px-3 py-3 font-semibold text-muted">TikTok Acc</th>
              <SH label="Cost" k="cost" align="text-right" />
              <SH label="Revenue" k="grossRevenue" align="text-right" />
              <SH label="ROI" k="roi" align="text-right" />
              <SH label="Orders" k="skuOrders" align="text-right" />
              <SH label="CPO" k="costPerOrder" align="text-right" />
              <SH label="CTR%" k="clickRate" align="text-right" />
              <SH label="CVR%" k="conversionRate" align="text-right" />
              <SH label="2sVR%" k="viewRate2s" align="text-right" />
              <SH label="6sVR%" k="viewRate6s" align="text-right" />
              <SH label="Score" k="score" />
              <th className="px-3 py-3 font-semibold text-muted">Action</th>
            </tr></thead>
            <tbody>
              {filtered.slice(0, 200).map((row, i) => {
                const sc = row.score;
                const ac = actionColors[sc.action];
                return (
                  <tr key={i} className="border-b border-border hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-2.5 max-w-[150px] truncate" title={row.campaignName}>{row.campaignName}</td>
                    <td className="px-3 py-2.5 text-muted">{row.creativeType}</td>
                    <td className="px-3 py-2.5 text-muted text-xs max-w-[100px] truncate">{row.tiktokAccount}</td>
                    <td className="px-3 py-2.5 text-right">{formatRupiah(row.cost)}</td>
                    <td className="px-3 py-2.5 text-right font-medium text-green-700">{formatRupiah(row.grossRevenue)}</td>
                    <td className="px-3 py-2.5 text-right font-semibold">{fmtDec(row.roi, 2)}x</td>
                    <td className="px-3 py-2.5 text-right">{formatNum(row.skuOrders)}</td>
                    <td className="px-3 py-2.5 text-right">{formatRupiah(row.costPerOrder)}</td>
                    <td className="px-3 py-2.5 text-right">{formatPct(row.clickRate)}</td>
                    <td className="px-3 py-2.5 text-right">{formatPct(row.conversionRate)}</td>
                    <td className="px-3 py-2.5 text-right">{formatPct(row.viewRate2s)}</td>
                    <td className="px-3 py-2.5 text-right">{formatPct(row.viewRate6s)}</td>
                    <td className="px-3 py-2.5"><ScoreBar score={sc.total} /></td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${ac.text} ${ac.bg}`}>
                        {sc.actionEmoji} {sc.actionLabel}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && <tr><td colSpan={14} className="px-4 py-8 text-center text-muted">Tidak ada data sesuai filter</td></tr>}
            </tbody>
          </table>
        </div>
        {filtered.length > 200 && <p className="text-xs text-muted text-center py-2">Menampilkan 200 dari {filtered.length} baris</p>}
      </div>
    </div>
  );
}
