"use client";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import * as XLSX from "xlsx";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LineChart, Line, ComposedChart,
} from "recharts";
import {
  Upload, Plus, ChevronUp, ChevronDown, AlertTriangle, Clock,
  TrendingUp, TrendingDown, DollarSign, ShoppingCart, Target, Percent,
} from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useStoreManager } from "@/store/useStoreManager";

// ── Types ──────────────────────────────────────────────
interface GmaxCampaign {
  id: string;
  store_id: string;
  camp_name: string;
  camp_code: string;
  campaign_type: string;
  budget_set: number;
  roi_target: number;
  status: string;
  start_date: string | null;
  end_date: string | null;
  notes: string | null;
}

interface GmaxDailyRow {
  id: number;
  store_id: string;
  campaign_id: string;
  date: string;
  budget_spent: number;
  gmv: number;
  roi: number;
  cac: number;
  orders: number;
  clicks: number;
  impressions: number;
  gmax_campaigns: GmaxCampaign;
}

// ── Helpers ────────────────────────────────────────────
const MONTH_NAMES = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];

function fmtRp(v: number): string {
  if (v >= 1_000_000_000) return `Rp ${(v / 1_000_000_000).toFixed(1)} Miliar`;
  if (v >= 1_000_000) return `Rp ${(v / 1_000_000).toFixed(1)} Juta`;
  if (v >= 1_000) return `Rp ${(v / 1_000).toFixed(1)} Ribu`;
  return `Rp ${Math.round(v).toLocaleString("id-ID")}`;
}
function fmtNum(v: number): string { return v.toLocaleString("id-ID"); }
function pctDelta(cur: number, prev: number): { pct: number; up: boolean } {
  if (prev === 0) return { pct: cur > 0 ? 100 : 0, up: cur > 0 };
  const p = ((cur - prev) / prev) * 100;
  return { pct: Math.abs(p), up: p >= 0 };
}

function getMonthRange(year: number, month: number): { start: string; end: string } {
  const s = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const e = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { start: s, end: e };
}

function getLast12Months(): { label: string; year: number; month: number }[] {
  const now = new Date();
  const list: { label: string; year: number; month: number }[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    list.push({ label: `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`, year: d.getFullYear(), month: d.getMonth() + 1 });
  }
  return list;
}

const CAMPAIGN_TYPES = [
  { value: "ads", label: "Ads" },
  { value: "promo", label: "Promo" },
  { value: "live", label: "Live" },
  { value: "bundle", label: "Bundle" },
  { value: "other", label: "Lainnya" },
];

// ══════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════
export default function GmaxOverviewScreen() {
  const { stores, activeStoreId, getActiveStore } = useStoreManager();
  const activeStore = getActiveStore();
  const months = useMemo(() => getLast12Months(), []);

  const [selMonth, setSelMonth] = useState(0);
  const [selStore, setSelStore] = useState(activeStoreId || "");
  const [rows, setRows] = useState<GmaxDailyRow[]>([]);
  const [prevRows, setPrevRows] = useState<GmaxDailyRow[]>([]);
  const [campaigns, setCampaigns] = useState<GmaxCampaign[]>([]);
  const [loading, setLoading] = useState(false);

  // Modals
  const [showUpload, setShowUpload] = useState(false);
  const [showAddCampaign, setShowAddCampaign] = useState(false);
  const [uploadMsg, setUploadMsg] = useState("");

  // Table sort & pagination
  const [sortBy, setSortBy] = useState<string>("gmv");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(0);
  const PER_PAGE = 10;

  // Sync selStore with activeStoreId
  useEffect(() => {
    if (activeStoreId) setSelStore(activeStoreId);
  }, [activeStoreId]);

  // ── Fetch data ──────────────────────────────────────
  const fetchData = useCallback(async () => {
    if (!isSupabaseConfigured || !selStore) return;
    setLoading(true);
    try {
      const m = months[selMonth];
      const { start, end } = getMonthRange(m.year, m.month);

      // Current month
      const { data: curData } = await supabase
        .from("gmax_daily")
        .select(`
          id, store_id, campaign_id, date, budget_spent, gmv, roi, cac, orders, clicks, impressions,
          gmax_campaigns!inner(id, store_id, camp_name, camp_code, campaign_type, budget_set, roi_target, status, start_date, end_date, notes)
        `)
        .eq("store_id", selStore)
        .gte("date", start)
        .lte("date", end)
        .order("date", { ascending: true });

      // Previous month for delta
      const prevM = new Date(m.year, m.month - 2, 1);
      const { start: ps, end: pe } = getMonthRange(prevM.getFullYear(), prevM.getMonth() + 1);
      const { data: prevData } = await supabase
        .from("gmax_daily")
        .select(`
          id, store_id, campaign_id, date, budget_spent, gmv, roi, cac, orders, clicks, impressions,
          gmax_campaigns!inner(id, store_id, camp_name, camp_code, campaign_type, budget_set, roi_target, status, start_date, end_date, notes)
        `)
        .eq("store_id", selStore)
        .gte("date", ps)
        .lte("date", pe);

      // Campaigns list
      const { data: campData } = await supabase
        .from("gmax_campaigns")
        .select("*")
        .eq("store_id", selStore)
        .order("created_at", { ascending: false });

      const normalize = (r: any): GmaxDailyRow => ({
        ...r,
        budget_spent: Number(r.budget_spent) || 0,
        gmv: Number(r.gmv) || 0,
        roi: Number(r.roi) || 0,
        cac: Number(r.cac) || 0,
        orders: Number(r.orders) || 0,
        clicks: Number(r.clicks) || 0,
        impressions: Number(r.impressions) || 0,
        gmax_campaigns: {
          ...r.gmax_campaigns,
          budget_set: Number(r.gmax_campaigns?.budget_set) || 0,
          roi_target: Number(r.gmax_campaigns?.roi_target) || 0,
        },
      });

      setRows((curData || []).map(normalize));
      setPrevRows((prevData || []).map(normalize));
      setCampaigns((campData || []).map((c: any) => ({
        ...c,
        budget_set: Number(c.budget_set) || 0,
        roi_target: Number(c.roi_target) || 0,
      })));
    } catch (e) {
      console.error("GMAX fetch error:", e);
    } finally {
      setLoading(false);
    }
  }, [selStore, selMonth, months]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── KPI Calculations ────────────────────────────────
  const kpi = useMemo(() => {
    const sumBudget = rows.reduce((a, r) => a + r.budget_spent, 0);
    const sumGMV = rows.reduce((a, r) => a + r.gmv, 0);
    const roi = sumBudget > 0 ? sumGMV / sumBudget : 0;
    const cac = sumGMV > 0 ? sumBudget / sumGMV : 0;

    const prevBudget = prevRows.reduce((a, r) => a + r.budget_spent, 0);
    const prevGMV = prevRows.reduce((a, r) => a + r.gmv, 0);

    const activeCamps = campaigns.filter((c) => c.status === "active");
    const avgTarget = activeCamps.length > 0
      ? activeCamps.reduce((a, c) => a + c.roi_target, 0) / activeCamps.length
      : 3.0;

    return {
      sumBudget, sumGMV, roi, cac,
      budgetDelta: pctDelta(sumBudget, prevBudget),
      gmvDelta: pctDelta(sumGMV, prevGMV),
      avgTarget,
    };
  }, [rows, prevRows, campaigns]);

  // ── Campaign aggregation for table ──────────────────
  const campAgg = useMemo(() => {
    const map = new Map<string, {
      camp: GmaxCampaign;
      budgetSpent: number;
      gmv: number;
      orders: number;
      lastDate: string;
    }>();
    rows.forEach((r) => {
      const cid = r.campaign_id;
      if (!map.has(cid)) {
        map.set(cid, { camp: r.gmax_campaigns, budgetSpent: 0, gmv: 0, orders: 0, lastDate: "" });
      }
      const agg = map.get(cid)!;
      agg.budgetSpent += r.budget_spent;
      agg.gmv += r.gmv;
      agg.orders += r.orders;
      if (r.date > agg.lastDate) agg.lastDate = r.date;
    });
    // Also add campaigns with no data this period
    campaigns.forEach((c) => {
      if (!map.has(c.id)) {
        map.set(c.id, { camp: c, budgetSpent: 0, gmv: 0, orders: 0, lastDate: "" });
      }
    });
    return [...map.values()].map((v) => {
      const roiActual = v.budgetSpent > 0 ? v.gmv / v.budgetSpent : 0;
      const roiGap = roiActual - v.camp.roi_target;
      const absorb = v.camp.budget_set > 0 ? (v.budgetSpent / v.camp.budget_set) * 100 : 0;
      return { ...v, roiActual, roiGap, absorb };
    });
  }, [rows, campaigns]);

  const sortedCamps = useMemo(() => {
    const list = [...campAgg];
    list.sort((a, b) => {
      let va: number, vb: number;
      switch (sortBy) {
        case "name": return sortDir === "asc" ? a.camp.camp_name.localeCompare(b.camp.camp_name) : b.camp.camp_name.localeCompare(a.camp.camp_name);
        case "budgetSpent": va = a.budgetSpent; vb = b.budgetSpent; break;
        case "absorb": va = a.absorb; vb = b.absorb; break;
        case "gmv": va = a.gmv; vb = b.gmv; break;
        case "roi": va = a.roiActual; vb = b.roiActual; break;
        case "roiGap": va = a.roiGap; vb = b.roiGap; break;
        default: va = a.gmv; vb = b.gmv;
      }
      return sortDir === "asc" ? va - vb : vb - va;
    });
    return list;
  }, [campAgg, sortBy, sortDir]);

  const totalPages = Math.ceil(sortedCamps.length / PER_PAGE);
  const pageCamps = sortedCamps.slice(page * PER_PAGE, (page + 1) * PER_PAGE);

  // ── Daily chart data ────────────────────────────────
  const dailyChart = useMemo(() => {
    const map = new Map<string, { date: string; gmv: number; budget: number; count: number }>();
    rows.forEach((r) => {
      if (!map.has(r.date)) map.set(r.date, { date: r.date, gmv: 0, budget: 0, count: 0 });
      const d = map.get(r.date)!;
      d.gmv += r.gmv;
      d.budget += r.budget_spent;
      d.count++;
    });
    return [...map.values()]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((d) => ({
        date: d.date.slice(5),
        gmv: d.gmv,
        roi: d.budget > 0 ? parseFloat((d.gmv / d.budget).toFixed(2)) : 0,
        budget: d.budget,
        campaigns: d.count,
      }));
  }, [rows]);

  // ── Alerts ──────────────────────────────────────────
  const alerts = useMemo(() => {
    const list: { type: "danger" | "warning" | "info"; msg: string }[] = [];
    const today = new Date().toISOString().slice(0, 10);

    campAgg.forEach((c) => {
      if (c.camp.status !== "active") return;
      // ROI under 70% of target
      if (c.roiActual > 0 && c.roiActual < c.camp.roi_target * 0.7) {
        list.push({ type: "danger", msg: `⚠️ ${c.camp.camp_name} ROI ${c.roiActual.toFixed(2)}x, target ${c.camp.roi_target}x` });
      }
      // Low absorb
      if (c.absorb > 0 && c.absorb < 30) {
        list.push({ type: "warning", msg: `💤 ${c.camp.camp_name} absorb ${c.absorb.toFixed(0)}%` });
      }
      // No data 3 days
      if (c.lastDate) {
        const diff = Math.floor((new Date(today).getTime() - new Date(c.lastDate).getTime()) / 86400000);
        if (diff >= 3) {
          list.push({ type: "info", msg: `📭 ${c.camp.camp_name} tidak ada data sejak ${diff} hari` });
        }
      } else {
        list.push({ type: "info", msg: `📭 ${c.camp.camp_name} belum ada data periode ini` });
      }
    });
    return list;
  }, [campAgg]);

  // ── Add Campaign handler ────────────────────────────
  const [newCamp, setNewCamp] = useState({ camp_name: "", camp_code: "", campaign_type: "ads", budget_set: "", roi_target: "3", notes: "" });
  const handleAddCampaign = useCallback(async () => {
    if (!isSupabaseConfigured || !selStore || !newCamp.camp_name.trim()) return;
    try {
      await supabase.from("gmax_campaigns").insert({
        store_id: selStore,
        camp_name: newCamp.camp_name.trim(),
        camp_code: newCamp.camp_code.trim() || null,
        campaign_type: newCamp.campaign_type,
        budget_set: parseFloat(newCamp.budget_set) || 0,
        roi_target: parseFloat(newCamp.roi_target) || 3,
        status: "active",
        notes: newCamp.notes.trim() || null,
      });
      setShowAddCampaign(false);
      setNewCamp({ camp_name: "", camp_code: "", campaign_type: "ads", budget_set: "", roi_target: "3", notes: "" });
      fetchData();
    } catch (e) {
      console.error("Add campaign error:", e);
    }
  }, [selStore, newCamp, fetchData]);

  // ── Upload Excel handler ────────────────────────────
  const fileRef = useRef<HTMLInputElement>(null);
  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !isSupabaseConfigured || !selStore) return;
    setUploadMsg("Memproses...");
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

      // Find header row
      const headerIdx = raw.findIndex((r) =>
        r.some((c: any) => String(c).toLowerCase().includes("campaign") || String(c).toLowerCase().includes("kampanye"))
      );
      if (headerIdx < 0) { setUploadMsg("❌ Header tidak ditemukan"); return; }

      const headers = raw[headerIdx].map((h: any) => String(h).toLowerCase().trim());
      const colIdx = (names: string[]) => headers.findIndex((h) => names.some((n) => h.includes(n)));

      const iCamp = colIdx(["campaign", "kampanye", "camp_name", "nama"]);
      const iDate = colIdx(["date", "tanggal"]);
      const iBudget = colIdx(["budget_spent", "budget spent", "spent", "biaya"]);
      const iGMV = colIdx(["gmv", "revenue", "omset"]);
      const iOrders = colIdx(["order", "pesanan"]);
      const iClicks = colIdx(["click", "klik"]);
      const iImpressions = colIdx(["impression", "impresi", "tayangan"]);

      if (iCamp < 0 || iDate < 0) { setUploadMsg("❌ Kolom Campaign/Date tidak ditemukan"); return; }

      // Map campaign names to IDs
      const { data: existingCamps } = await supabase
        .from("gmax_campaigns")
        .select("id, camp_name, camp_code")
        .eq("store_id", selStore);
      const campMap = new Map<string, string>();
      (existingCamps || []).forEach((c: any) => {
        campMap.set(c.camp_name.toLowerCase(), c.id);
        if (c.camp_code) campMap.set(c.camp_code.toLowerCase(), c.id);
      });

      let inserted = 0;
      let skipped = 0;

      for (let i = headerIdx + 1; i < raw.length; i++) {
        const r = raw[i];
        if (!r || !r[iCamp] || !r[iDate]) continue;
        const campName = String(r[iCamp]).trim();
        let campId = campMap.get(campName.toLowerCase());

        // Auto-create campaign if not found
        if (!campId) {
          const { data: newC } = await supabase
            .from("gmax_campaigns")
            .insert({ store_id: selStore, camp_name: campName, status: "active" })
            .select("id")
            .single();
          if (newC) {
            campId = newC.id as string;
            campMap.set(campName.toLowerCase(), campId!);
          } else {
            skipped++;
            continue;
          }
        }

        // Parse date
        let dateStr = "";
        const rawDate = r[iDate];
        if (typeof rawDate === "number") {
          // Excel serial date
          const d = new Date((rawDate - 25569) * 86400000);
          dateStr = d.toISOString().slice(0, 10);
        } else {
          const d = new Date(String(rawDate).replace(/\//g, "-"));
          if (!isNaN(d.getTime())) dateStr = d.toISOString().slice(0, 10);
        }
        if (!dateStr) { skipped++; continue; }

        const budgetSpent = iBudget >= 0 ? (parseFloat(String(r[iBudget]).replace(/[^0-9.-]/g, "")) || 0) : 0;
        const gmv = iGMV >= 0 ? (parseFloat(String(r[iGMV]).replace(/[^0-9.-]/g, "")) || 0) : 0;
        const roi = budgetSpent > 0 ? gmv / budgetSpent : 0;
        const cac = gmv > 0 ? budgetSpent / gmv : 0;

        await supabase.from("gmax_daily").upsert({
          store_id: selStore,
          campaign_id: campId,
          date: dateStr,
          budget_spent: budgetSpent,
          gmv,
          roi: parseFloat(roi.toFixed(4)),
          cac: parseFloat(cac.toFixed(4)),
          orders: iOrders >= 0 ? (parseInt(String(r[iOrders])) || 0) : 0,
          clicks: iClicks >= 0 ? (parseInt(String(r[iClicks])) || 0) : 0,
          impressions: iImpressions >= 0 ? (parseInt(String(r[iImpressions])) || 0) : 0,
        }, { onConflict: "campaign_id,date" });
        inserted++;
      }

      setUploadMsg(`✅ ${inserted} baris diupload${skipped > 0 ? `, ${skipped} dilewati` : ""}`);
      fetchData();
    } catch (err: any) {
      setUploadMsg(`❌ Error: ${err.message || "Upload gagal"}`);
    }
    e.target.value = "";
  }, [selStore, fetchData]);

  // ── Sort handler ────────────────────────────────────
  const toggleSort = (col: string) => {
    if (sortBy === col) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortDir("desc"); }
    setPage(0);
  };

  const SortIcon = ({ col }: { col: string }) => (
    sortBy === col
      ? sortDir === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />
      : <ChevronDown size={12} className="opacity-30" />
  );

  // ── ROI Gap color ───────────────────────────────────
  const roiGapColor = (gap: number) => {
    if (gap >= 0) return "text-green-700 bg-green-50";
    if (gap >= -0.5) return "text-yellow-700 bg-yellow-50";
    return "text-red-700 bg-red-50";
  };

  const statusBadge = (s: string) => {
    if (s === "active") return "bg-green-100 text-green-700";
    if (s === "paused") return "bg-yellow-100 text-yellow-700";
    return "bg-gray-100 text-gray-500";
  };

  // ══════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════
  return (
    <div className="space-y-6">
      {/* ═══ HEADER ═══ */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">🚀 GMV Maximizer (GMAX)</h1>
            <p className="text-sm text-gray-400 mt-0.5">Monitoring budget, GMV, dan ROI semua kampanye</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <select value={selMonth} onChange={(e) => { setSelMonth(Number(e.target.value)); setPage(0); }}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400">
              {months.map((m, i) => <option key={i} value={i}>{m.label}</option>)}
            </select>
            <select value={selStore} onChange={(e) => setSelStore(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400">
              {stores.map((s) => <option key={s.id} value={s.id}>{s.avatar} {s.name}</option>)}
            </select>
            <button onClick={() => { setUploadMsg(""); setShowUpload(true); }}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition">
              <Upload size={16} /> Upload Excel
            </button>
            <button onClick={() => setShowAddCampaign(true)}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition">
              <Plus size={16} /> Tambah Kampanye
            </button>
          </div>
        </div>
      </div>

      {loading && (
        <div className="text-center py-8">
          <div className="w-8 h-8 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-2" />
          <p className="text-sm text-gray-400">Memuat data...</p>
        </div>
      )}

      {!loading && (
        <>
          {/* ═══ KPI CARDS ═══ */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Budget Terpakai */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="bg-blue-100 rounded-xl p-2"><DollarSign size={18} className="text-blue-600" /></div>
                <span className="text-xs font-medium text-gray-500">Total Budget Terpakai</span>
              </div>
              <div className="text-xl font-bold text-gray-900 mb-1">{fmtRp(kpi.sumBudget)}</div>
              <div className={`flex items-center gap-1 text-xs font-medium ${kpi.budgetDelta.up ? "text-red-500" : "text-green-500"}`}>
                {kpi.budgetDelta.up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {kpi.budgetDelta.pct.toFixed(1)}% vs bulan lalu
              </div>
            </div>

            {/* 2. Total GMV */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="bg-green-100 rounded-xl p-2"><ShoppingCart size={18} className="text-green-600" /></div>
                <span className="text-xs font-medium text-gray-500">Total GMV</span>
              </div>
              <div className="text-xl font-bold text-gray-900 mb-1">{fmtRp(kpi.sumGMV)}</div>
              <div className={`flex items-center gap-1 text-xs font-medium ${kpi.gmvDelta.up ? "text-green-500" : "text-red-500"}`}>
                {kpi.gmvDelta.up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {kpi.gmvDelta.pct.toFixed(1)}% vs bulan lalu
              </div>
            </div>

            {/* 3. ROI Keseluruhan */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="bg-purple-100 rounded-xl p-2"><Target size={18} className="text-purple-600" /></div>
                <span className="text-xs font-medium text-gray-500">ROI Keseluruhan</span>
              </div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl font-bold text-gray-900">{kpi.roi.toFixed(2)}x</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${kpi.roi >= 2.5 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                  {kpi.roi >= 2.5 ? "🟢 Di atas Min" : "🔴 Di bawah Min"}
                </span>
              </div>
              <div className="text-xs text-gray-400">Target rata-rata: {kpi.avgTarget.toFixed(1)}x</div>
            </div>

            {/* 4. CAC */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="bg-orange-100 rounded-xl p-2"><Percent size={18} className="text-orange-600" /></div>
                <span className="text-xs font-medium text-gray-500">CAC (Cost Acquisition)</span>
              </div>
              <div className="text-xl font-bold text-gray-900 mb-1">{(kpi.cac * 100).toFixed(1)}%</div>
              <div className="text-xs text-gray-400">Per Rp 1 omset = Rp {kpi.cac.toFixed(3)}</div>
            </div>
          </div>

          {/* ═══ CAMPAIGN TABLE ═══ */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="p-5 border-b border-gray-100">
              <h3 className="font-semibold text-sm text-gray-900">📋 Overview Kampanye</h3>
              <p className="text-xs text-gray-400 mt-0.5">{campAgg.length} kampanye · Klik header untuk sort</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b text-left">
                    <th className="p-3 w-8">#</th>
                    <th className="p-3 cursor-pointer hover:bg-gray-100" onClick={() => toggleSort("name")}>
                      <span className="flex items-center gap-1">Nama Kampanye <SortIcon col="name" /></span>
                    </th>
                    <th className="p-3">Tipe</th>
                    <th className="p-3 text-right">Budget Set</th>
                    <th className="p-3 text-right cursor-pointer hover:bg-gray-100" onClick={() => toggleSort("budgetSpent")}>
                      <span className="flex items-center gap-1 justify-end">Budget Spent <SortIcon col="budgetSpent" /></span>
                    </th>
                    <th className="p-3 cursor-pointer hover:bg-gray-100" onClick={() => toggleSort("absorb")}>
                      <span className="flex items-center gap-1">Absorb% <SortIcon col="absorb" /></span>
                    </th>
                    <th className="p-3 text-right cursor-pointer hover:bg-gray-100" onClick={() => toggleSort("gmv")}>
                      <span className="flex items-center gap-1 justify-end">GMV <SortIcon col="gmv" /></span>
                    </th>
                    <th className="p-3 text-right cursor-pointer hover:bg-gray-100" onClick={() => toggleSort("roi")}>
                      <span className="flex items-center gap-1 justify-end">ROI Aktual <SortIcon col="roi" /></span>
                    </th>
                    <th className="p-3 text-right">ROI Target</th>
                    <th className="p-3 text-center cursor-pointer hover:bg-gray-100" onClick={() => toggleSort("roiGap")}>
                      <span className="flex items-center gap-1 justify-center">ROI Gap <SortIcon col="roiGap" /></span>
                    </th>
                    <th className="p-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pageCamps.length === 0 && (
                    <tr><td colSpan={11} className="p-8 text-center text-gray-400">Belum ada data kampanye</td></tr>
                  )}
                  {pageCamps.map((c, i) => (
                    <tr key={c.camp.id} className="border-b hover:bg-gray-50 transition cursor-pointer">
                      <td className="p-3 text-gray-400">{page * PER_PAGE + i + 1}</td>
                      <td className="p-3 font-medium text-gray-900">{c.camp.camp_name}</td>
                      <td className="p-3">
                        <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-[10px] uppercase font-medium">
                          {c.camp.campaign_type}
                        </span>
                      </td>
                      <td className="p-3 text-right">{fmtRp(c.camp.budget_set)}</td>
                      <td className="p-3 text-right font-medium">{fmtRp(c.budgetSpent)}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-100 rounded-full h-2 min-w-[60px]">
                            <div className={`h-2 rounded-full transition-all ${c.absorb >= 80 ? "bg-green-500" : c.absorb >= 50 ? "bg-blue-500" : c.absorb >= 30 ? "bg-yellow-500" : "bg-red-400"}`}
                              style={{ width: `${Math.min(c.absorb, 100)}%` }} />
                          </div>
                          <span className="text-[10px] font-medium w-10 text-right">{c.absorb.toFixed(0)}%</span>
                        </div>
                      </td>
                      <td className="p-3 text-right font-bold text-green-700">{fmtRp(c.gmv)}</td>
                      <td className="p-3 text-right font-bold">{c.roiActual.toFixed(2)}x</td>
                      <td className="p-3 text-right text-gray-500">{c.camp.roi_target.toFixed(1)}x</td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${roiGapColor(c.roiGap)}`}>
                          {c.roiGap >= 0 ? "+" : ""}{c.roiGap.toFixed(2)}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${statusBadge(c.camp.status)}`}>
                          {c.camp.status === "active" ? "Aktif" : c.camp.status === "paused" ? "Paused" : "Selesai"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 p-4 border-t border-gray-100">
                <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}
                  className="px-3 py-1 rounded-lg border text-xs disabled:opacity-40 hover:bg-gray-50">Prev</button>
                <span className="px-3 py-1 text-xs text-gray-500">{page + 1} / {totalPages}</span>
                <button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1}
                  className="px-3 py-1 rounded-lg border text-xs disabled:opacity-40 hover:bg-gray-50">Next</button>
              </div>
            )}
          </div>

          {/* ═══ CHART: GMV & ROI TREND ═══ */}
          {dailyChart.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h3 className="font-semibold text-sm text-gray-900 mb-4">📈 GMV & ROI Trend Harian</h3>
              <ResponsiveContainer width="100%" height={320}>
                <ComposedChart data={dailyChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis yAxisId="left" tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}Jt`} tick={{ fontSize: 10 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} unit="x" />
                  <Tooltip
                    content={({ active, payload, label }: any) => {
                      if (!active || !payload?.length) return null;
                      return (
                        <div className="bg-white shadow-xl border rounded-xl p-3 text-xs">
                          <p className="font-bold mb-1">{label}</p>
                          <p className="text-blue-600">GMV: {fmtRp(payload[0]?.value || 0)}</p>
                          <p className="text-emerald-600">Budget: {fmtRp(payload[1]?.value || 0)}</p>
                          <p className="text-purple-600">ROI: {(payload[2]?.value || 0).toFixed(2)}x</p>
                          <p className="text-gray-400">{payload[0]?.payload?.campaigns || 0} kampanye aktif</p>
                        </div>
                      );
                    }}
                  />
                  <Legend />
                  <Bar yAxisId="left" dataKey="gmv" name="GMV" fill="#2563eb" radius={[4, 4, 0, 0]} opacity={0.8} />
                  <Bar yAxisId="left" dataKey="budget" name="Budget" fill="#f59e0b" radius={[4, 4, 0, 0]} opacity={0.5} />
                  <Line yAxisId="right" type="monotone" dataKey="roi" name="ROI" stroke="#7c3aed" strokeWidth={2.5} dot={{ r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* ═══ ALERTS ═══ */}
          {alerts.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-gray-900">🔔 Peringatan</h3>
              {alerts.map((a, i) => (
                <div key={i} className={`rounded-2xl border p-4 text-sm font-medium ${
                  a.type === "danger" ? "bg-red-50 border-red-100 text-red-700"
                    : a.type === "warning" ? "bg-yellow-50 border-yellow-100 text-yellow-700"
                    : "bg-blue-50 border-blue-100 text-blue-700"
                }`}>
                  {a.msg}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ═══ UPLOAD MODAL ═══ */}
      {showUpload && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowUpload(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-2">📤 Upload Data GMAX</h3>
            <p className="text-xs text-gray-500 mb-4">
              Format Excel: kolom Campaign/Kampanye, Date/Tanggal, Budget Spent, GMV, Orders (opsional), Clicks (opsional), Impressions (opsional)
            </p>
            <label className="block w-full cursor-pointer bg-blue-50 hover:bg-blue-100 border-2 border-dashed border-blue-200 rounded-xl p-8 text-center transition">
              <Upload size={32} className="mx-auto text-blue-400 mb-2" />
              <span className="text-sm font-medium text-blue-600">Pilih file Excel (.xlsx / .xls)</span>
              <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleUpload} />
            </label>
            {uploadMsg && <p className="mt-3 text-sm text-center font-medium">{uploadMsg}</p>}
            <button onClick={() => setShowUpload(false)} className="w-full mt-4 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2.5 rounded-xl text-sm font-medium transition">
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* ═══ ADD CAMPAIGN MODAL ═══ */}
      {showAddCampaign && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowAddCampaign(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">➕ Tambah Kampanye Baru</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Nama Kampanye *</label>
                <input value={newCamp.camp_name} onChange={(e) => setNewCamp({ ...newCamp, camp_name: e.target.value })}
                  placeholder="cth: Flash Sale Jan 2025" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Kode</label>
                  <input value={newCamp.camp_code} onChange={(e) => setNewCamp({ ...newCamp, camp_code: e.target.value })}
                    placeholder="CAMP-01" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Tipe</label>
                  <select value={newCamp.campaign_type} onChange={(e) => setNewCamp({ ...newCamp, campaign_type: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400">
                    {CAMPAIGN_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Budget Set (Rp)</label>
                  <input type="number" value={newCamp.budget_set} onChange={(e) => setNewCamp({ ...newCamp, budget_set: e.target.value })}
                    placeholder="50000000" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">ROI Target</label>
                  <input type="number" step="0.1" value={newCamp.roi_target} onChange={(e) => setNewCamp({ ...newCamp, roi_target: e.target.value })}
                    placeholder="3.0" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Catatan</label>
                <textarea value={newCamp.notes} onChange={(e) => setNewCamp({ ...newCamp, notes: e.target.value })}
                  rows={2} placeholder="Opsional..." className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowAddCampaign(false)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2.5 rounded-xl text-sm font-medium transition">Batal</button>
              <button onClick={handleAddCampaign} disabled={!newCamp.camp_name.trim()}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition disabled:opacity-40">
                ✅ Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
