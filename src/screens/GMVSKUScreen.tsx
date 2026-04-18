"use client";
import { useMemo, useState } from "react";
import { useGMVStore } from "@/lib/gmvStore";
import { classifySKU, formatRupiah, formatPct, formatNum, SKUStatus, fmtDec } from "@/utils/gmvAnalyzer";
import { Package, AlertCircle, ArrowUpDown } from "lucide-react";

type SortKey = "campaignName" | "creativeType" | "productId" | "cost" | "grossRevenue" | "roi" | "skuOrders" | "costPerOrder" | "clickRate" | "conversionRate";

export default function GMVSKUScreen({ onNavigate }: { onNavigate?: (tab: string) => void }) {
  const { data } = useGMVStore();
  const [filterStatus, setFilterStatus] = useState<SKUStatus | "ALL">("ALL");
  const [filterCampaign, setFilterCampaign] = useState("");
  const [filterCreative, setFilterCreative] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("grossRevenue");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const classified = useMemo(() => data.map(r => ({ ...r, classification: classifySKU(r) })), [data]);

  const campaigns = useMemo(() => [...new Set(data.map(d => d.campaignName))].filter(Boolean), [data]);
  const creativeTypes = useMemo(() => [...new Set(data.map(d => d.creativeType))].filter(Boolean), [data]);

  const filtered = useMemo(() => {
    let result = classified;
    if (filterStatus !== "ALL") result = result.filter(r => r.classification.status === filterStatus);
    if (filterCampaign) result = result.filter(r => r.campaignName === filterCampaign);
    if (filterCreative) result = result.filter(r => r.creativeType === filterCreative);
    result.sort((a, b) => {
      const av = a[sortKey] as number | string;
      const bv = b[sortKey] as number | string;
      if (typeof av === "number" && typeof bv === "number") return sortDir === "asc" ? av - bv : bv - av;
      return sortDir === "asc" ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });
    return result;
  }, [classified, filterStatus, filterCampaign, filterCreative, sortKey, sortDir]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { TOP_PERFORMER: 0, SEHAT: 0, PERLU_OPTIMASI: 0, BOROS: 0, NO_SPEND: 0 };
    classified.forEach(r => { counts[r.classification.status]++; });
    return counts;
  }, [classified]);

  const totalBoros = useMemo(() =>
    classified.filter(r => r.classification.status === "BOROS").reduce((s, r) => s + r.cost, 0),
  [classified]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  }

  function SortHeader({ label, k }: { label: string; k: SortKey }) {
    return (
      <th className="px-3 py-3 font-semibold text-muted cursor-pointer hover:text-foreground select-none whitespace-nowrap" onClick={() => toggleSort(k)}>
        <span className="inline-flex items-center gap-1">{label}<ArrowUpDown size={12} className={sortKey === k ? "text-primary" : "text-muted/40"} /></span>
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
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary"><Package size={20} /></div>
        <div>
          <h1 className="text-xl font-bold">SKU Analyzer</h1>
          <p className="text-sm text-muted">{filtered.length} dari {data.length} SKU</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
        {[
          { label: "🏆 Top Performer", count: statusCounts.TOP_PERFORMER, bg: "bg-yellow-50 border-yellow-200" },
          { label: "✅ Sehat", count: statusCounts.SEHAT, bg: "bg-green-50 border-green-200" },
          { label: "⚠️ Perlu Optimasi", count: statusCounts.PERLU_OPTIMASI, bg: "bg-orange-50 border-orange-200" },
          { label: "🔴 Boros", count: statusCounts.BOROS, bg: "bg-red-50 border-red-200" },
          { label: "⬜ No Spend", count: statusCounts.NO_SPEND, bg: "bg-gray-50 border-gray-200" },
          { label: "💸 Total Biaya Boros", count: null, value: formatRupiah(totalBoros), bg: "bg-red-50 border-red-200" },
        ].map((s, i) => (
          <div key={i} className={`rounded-xl p-3 border ${s.bg}`}>
            <p className="text-xs text-muted">{s.label}</p>
            <p className="text-lg font-bold mt-1">{s.value ?? s.count}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as SKUStatus | "ALL")} className="px-3 py-2 border border-border rounded-lg text-sm bg-white">
          <option value="ALL">Semua Status</option>
          <option value="TOP_PERFORMER">🏆 Top Performer</option>
          <option value="SEHAT">✅ Sehat</option>
          <option value="PERLU_OPTIMASI">⚠️ Perlu Optimasi</option>
          <option value="BOROS">🔴 Boros</option>
          <option value="NO_SPEND">⬜ No Spend</option>
        </select>
        <select value={filterCampaign} onChange={e => setFilterCampaign(e.target.value)} className="px-3 py-2 border border-border rounded-lg text-sm bg-white max-w-[200px]">
          <option value="">Semua Campaign</option>
          {campaigns.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filterCreative} onChange={e => setFilterCreative(e.target.value)} className="px-3 py-2 border border-border rounded-lg text-sm bg-white">
          <option value="">Semua Creative</option>
          {creativeTypes.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 border-b border-border text-left">
              <SortHeader label="Campaign" k="campaignName" />
              <SortHeader label="Creative" k="creativeType" />
              <SortHeader label="Product ID" k="productId" />
              <SortHeader label="Cost" k="cost" />
              <SortHeader label="Revenue" k="grossRevenue" />
              <SortHeader label="ROI" k="roi" />
              <SortHeader label="Orders" k="skuOrders" />
              <SortHeader label="CPO" k="costPerOrder" />
              <SortHeader label="CTR%" k="clickRate" />
              <SortHeader label="CVR%" k="conversionRate" />
              <th className="px-3 py-3 font-semibold text-muted">Status</th>
            </tr></thead>
            <tbody>
              {filtered.slice(0, 200).map((row, i) => {
                const cls = row.classification;
                return (
                  <tr key={i} className={`border-b border-border hover:bg-gray-50 transition-colors ${cls.bgColor}`}>
                    <td className="px-3 py-2.5 max-w-[180px] truncate" title={row.campaignName}>{row.campaignName}</td>
                    <td className="px-3 py-2.5 text-muted">{row.creativeType}</td>
                    <td className="px-3 py-2.5 text-muted font-mono text-xs max-w-[120px] truncate">{row.productId}</td>
                    <td className="px-3 py-2.5 text-right">{formatRupiah(row.cost)}</td>
                    <td className="px-3 py-2.5 text-right font-medium text-green-700">{formatRupiah(row.grossRevenue)}</td>
                    <td className="px-3 py-2.5 text-right font-semibold">{fmtDec(row.roi, 2)}x</td>
                    <td className="px-3 py-2.5 text-right">{formatNum(row.skuOrders)}</td>
                    <td className="px-3 py-2.5 text-right">{formatRupiah(row.costPerOrder)}</td>
                    <td className="px-3 py-2.5 text-right">{formatPct(row.clickRate)}</td>
                    <td className="px-3 py-2.5 text-right">{formatPct(row.conversionRate)}</td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${cls.color} ${cls.bgColor}`}>
                        {cls.emoji} {cls.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && <tr><td colSpan={11} className="px-4 py-8 text-center text-muted">Tidak ada data sesuai filter</td></tr>}
            </tbody>
          </table>
        </div>
        {filtered.length > 200 && <p className="text-xs text-muted text-center py-2">Menampilkan 200 dari {filtered.length} baris</p>}
      </div>
    </div>
  );
}
