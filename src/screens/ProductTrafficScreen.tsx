"use client";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useStoreManager } from "@/store/useStoreManager";
import MetricHelpTooltip from "@/components/MetricHelpTooltip";
import toast from "react-hot-toast";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import {
  parseProductTrafficFile,
  FILE_TYPE_LABELS,
  CONTENT_TYPE_LABELS,
  type PtListChannelRow,
} from "@/lib/product-traffic/parser";
import {
  saveProductTrafficDaily,
  loadProductTrafficDaily,
  listProductTrafficProducts,
  saveProductCatalog,
  loadProductCatalog,
  saveVideoCoreStats,
  loadVideoCoreStats,
  loadLiveCoreStatsDb,
  saveLiveCoreStats,
  type ProductTrafficProductInfo,
} from "@/lib/db";
import type {
  ProductTrafficDaily,
  ProductTrafficContentType,
  ProductCatalogEntry,
  VideoCoreStatDaily,
} from "@/lib/types";
import type { LiveCoreStat } from "@/hooks/useLiveAnalytics";

// ─── HELPERS ────────────────────────────────────────────────
const fRp = (n: number) => "Rp " + Math.round(n).toLocaleString("id-ID");
const fRpShort = (n: number) =>
  n >= 1e9 ? `Rp ${(n / 1e9).toFixed(2)}M` : n >= 1e6 ? `Rp ${(n / 1e6).toFixed(1)}Jt` : fRp(n);
const fN = (n: number) => Math.round(n).toLocaleString("id-ID");
const fP = (n: number) => `${n.toFixed(2)}%`;

const TYPE_COLORS: Record<ProductTrafficContentType, string> = {
  all: "#1a237e",
  live_penjual: "#ff6b35",
  video_penjual: "#7c3aed",
  kartu_produk: "#00bcd4",
  afiliasi: "#10b981",
};

function friendlyError(e: unknown): string {
  const m = e instanceof Error ? e.message : String(e);
  if (m === "__SUPABASE_NOT_CONFIGURED__") {
    return "Supabase belum dikonfigurasi. Isi NEXT_PUBLIC_SUPABASE_URL & NEXT_PUBLIC_SUPABASE_ANON_KEY.";
  }
  return m;
}

interface UploadResult {
  name: string;
  label: string;
  ok: boolean;
  detail: string;
}

interface Ma7Alert {
  metric: string;
  dropPct: number;
  current: string;
  avg: string;
}

// Deteksi drop >20% vs rata-rata 7 hari sebelumnya
function detectMa7Drops(
  rows: { date: string; gmv: number; ctr: number; ctor: number }[]
): Ma7Alert[] {
  if (rows.length < 8) return [];
  const sorted = [...rows].sort((a, b) => a.date.localeCompare(b.date));
  const last = sorted[sorted.length - 1];
  const prev7 = sorted.slice(-8, -1);
  const alerts: Ma7Alert[] = [];
  const checks: { metric: string; curr: number; avg: number; fmt: (n: number) => string }[] = [
    { metric: "GMV", curr: last.gmv, avg: prev7.reduce((a, r) => a + r.gmv, 0) / prev7.length, fmt: fRpShort },
    { metric: "CTR", curr: last.ctr, avg: prev7.reduce((a, r) => a + r.ctr, 0) / prev7.length, fmt: fP },
    { metric: "CTOR", curr: last.ctor, avg: prev7.reduce((a, r) => a + r.ctor, 0) / prev7.length, fmt: fP },
  ];
  for (const c of checks) {
    if (c.avg > 0 && c.curr < c.avg * 0.8) {
      alerts.push({
        metric: c.metric,
        dropPct: ((c.avg - c.curr) / c.avg) * 100,
        current: c.fmt(c.curr),
        avg: c.fmt(c.avg),
      });
    }
  }
  return alerts;
}

const CONTENT_TYPES: ProductTrafficContentType[] = [
  "all", "live_penjual", "video_penjual", "kartu_produk", "afiliasi",
];

// ═══════════════════════════════════════════════════════════
// MAIN SCREEN
// ═══════════════════════════════════════════════════════════
export default function ProductTrafficScreen() {
  const { getActiveStore } = useStoreManager();
  const activeStore = getActiveStore();
  const storeId = activeStore?.id || "";

  type SubTab = "produk" | "katalog" | "channel";
  const [subTab, setSubTab] = useState<SubTab>("produk");

  // Upload state
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState<UploadResult[]>([]);
  const [ptListPreview, setPtListPreview] = useState<PtListChannelRow[] | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Data state
  const [products, setProducts] = useState<ProductTrafficProductInfo[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [dailyData, setDailyData] = useState<{ productId: string; rows: ProductTrafficDaily[] }>({ productId: "", rows: [] });
  const [catalog, setCatalog] = useState<ProductCatalogEntry[]>([]);
  const [videoStats, setVideoStats] = useState<VideoCoreStatDaily[]>([]);
  const [liveStats, setLiveStats] = useState<LiveCoreStat[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [contentType, setContentType] = useState<ProductTrafficContentType>("all");
  const [search, setSearch] = useState("");

  // ─── LOAD SEMUA DATA (per toko) ───────────────────────
  useEffect(() => {
    if (!storeId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError("");
      const errors: string[] = [];
      const safe = async <T,>(fn: () => Promise<T>, fallback: T): Promise<T> => {
        try {
          return await fn();
        } catch (e) {
          errors.push(friendlyError(e));
          return fallback;
        }
      };
      const [prods, cat, vids, lives] = await Promise.all([
        safe(() => listProductTrafficProducts(storeId), [] as ProductTrafficProductInfo[]),
        safe(() => loadProductCatalog(storeId), [] as ProductCatalogEntry[]),
        safe(() => loadVideoCoreStats(storeId), [] as VideoCoreStatDaily[]),
        safe(() => loadLiveCoreStatsDb(storeId), [] as LiveCoreStat[]),
      ]);
      if (cancelled) return;
      setProducts(prods);
      setCatalog(cat);
      setVideoStats(vids);
      setLiveStats(lives);
      setSelectedProductId((prev) =>
        prods.length > 0 && !prods.some((p) => p.product_id === prev) ? prods[0].product_id : prev
      );
      if (errors.length > 0) setLoadError(errors[0]);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [storeId, reloadKey]);

  // ─── LOAD HARIAN PRODUK TERPILIH ──────────────────────
  useEffect(() => {
    if (!storeId || !selectedProductId) return;
    let cancelled = false;
    loadProductTrafficDaily(storeId, selectedProductId)
      .then((rows) => { if (!cancelled) setDailyData({ productId: selectedProductId, rows }); })
      .catch(() => { if (!cancelled) setDailyData({ productId: selectedProductId, rows: [] }); });
    return () => { cancelled = true; };
  }, [storeId, selectedProductId, reloadKey]);

  // Baris harian valid hanya jika milik produk yang sedang dipilih (hindari data basi)
  const dailyRows = useMemo(
    () => (dailyData.productId === selectedProductId ? dailyData.rows : []),
    [dailyData, selectedProductId]
  );

  // ─── UPLOAD HANDLER ───────────────────────────────────
  const handleFiles = useCallback(async (fileList: FileList | null) => {
    if (!fileList?.length || !storeId) return;
    setUploading(true);
    const results: UploadResult[] = [];
    for (const file of Array.from(fileList)) {
      if (!file.name.match(/\.xlsx?$/i)) {
        results.push({ name: file.name, label: "—", ok: false, detail: "Hanya file .xlsx / .xls" });
        continue;
      }
      try {
        const parsed = await parseProductTrafficFile(file, storeId);
        switch (parsed.type) {
          case "PT_KEY_METRICS": {
            await saveProductTrafficDaily(parsed.rows);
            const days = new Set(parsed.rows.map((r) => r.date)).size;
            results.push({
              name: file.name, label: FILE_TYPE_LABELS[parsed.type], ok: true,
              detail: `${parsed.rows.length} baris (${days} hari × 5 jenis konten) tersimpan — ${parsed.productName || parsed.productId}`,
            });
            break;
          }
          case "PRODUCT_LIST": {
            await saveProductCatalog(parsed.items);
            results.push({
              name: file.name, label: FILE_TYPE_LABELS[parsed.type], ok: true,
              detail: `${parsed.items.length} produk tersimpan (periode ${parsed.periodStart} s/d ${parsed.periodEnd})`,
            });
            break;
          }
          case "VIDEO_DAILY": {
            await saveVideoCoreStats(parsed.rows);
            results.push({
              name: file.name, label: FILE_TYPE_LABELS[parsed.type], ok: true,
              detail: `${parsed.rows.length} hari statistik video tersimpan`,
            });
            break;
          }
          case "LIVE_DAILY": {
            await saveLiveCoreStats(parsed.rows);
            results.push({
              name: file.name, label: FILE_TYPE_LABELS[parsed.type], ok: true,
              detail: `${parsed.rows.length} hari statistik LIVE tersimpan — menu Live Analytics ikut terisi`,
            });
            break;
          }
          case "PT_LIST": {
            setPtListPreview(parsed.channels);
            results.push({
              name: file.name, label: FILE_TYPE_LABELS[parsed.type], ok: true,
              detail: "File rekap agregat — ditampilkan di bawah (untuk data harian gunakan file Key Metrics)",
            });
            break;
          }
          default:
            results.push({ name: file.name, label: FILE_TYPE_LABELS.UNKNOWN, ok: false, detail: parsed.reason });
        }
      } catch (e) {
        results.push({ name: file.name, label: "⚠️ Gagal", ok: false, detail: friendlyError(e) });
      }
    }
    setUploadResults(results);
    setUploading(false);
    setReloadKey((k) => k + 1);
    const okCount = results.filter((r) => r.ok).length;
    if (okCount > 0) toast.success(`${okCount}/${results.length} file berhasil diproses`);
    else toast.error("Tidak ada file yang berhasil diproses");
    if (fileRef.current) fileRef.current.value = "";
  }, [storeId]);

  // ─── TAB 1: DATA PRODUK TERPILIH ──────────────────────
  const typeRows = useMemo(
    () => dailyRows.filter((r) => r.content_type === contentType).sort((a, b) => a.date.localeCompare(b.date)),
    [dailyRows, contentType]
  );

  const totals = useMemo(() => {
    const sum = (k: keyof ProductTrafficDaily) =>
      typeRows.reduce((a, r) => a + (Number(r[k]) || 0), 0);
    const gmv = sum("gmv");
    const skuOrders = sum("sku_orders");
    const impressions = sum("impressions");
    const clicks = sum("clicks");
    const atc = sum("atc");
    const buyers = sum("buyers");
    return {
      gmv, skuOrders, impressions, clicks, atc, buyers,
      ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
      atcRate: clicks > 0 ? (atc / clicks) * 100 : 0,
      ctor: clicks > 0 ? (skuOrders / clicks) * 100 : 0,
      aov: skuOrders > 0 ? gmv / skuOrders : 0,
      days: typeRows.length,
    };
  }, [typeRows]);

  const trendChartData = useMemo(() => {
    const byDate = new Map<string, Record<string, number | string>>();
    for (const r of dailyRows) {
      const row = byDate.get(r.date) || { date: r.date.slice(5) };
      row[CONTENT_TYPE_LABELS[r.content_type]] = parseFloat((r.gmv / 1e6).toFixed(2));
      byDate.set(r.date, row);
    }
    return [...byDate.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([, v]) => v);
  }, [dailyRows]);

  const ma7Alerts = useMemo(() => detectMa7Drops(typeRows), [typeRows]);

  const selectedProduct = products.find((p) => p.product_id === selectedProductId);

  // ─── TAB 2: KATALOG ───────────────────────────────────
  const filteredCatalog = useMemo(() => {
    const q = search.trim().toLowerCase();
    return catalog
      .filter((c) => !q || c.name.toLowerCase().includes(q) || c.product_id.includes(q))
      .sort((a, b) => b.gmv - a.gmv);
  }, [catalog, search]);

  const topChannelOf = useCallback((item: ProductCatalogEntry): string => {
    const entries = Object.entries(item.channel_gmv || {}).filter(
      ([k, v]) => v > 0 && k.startsWith("dari_")
    );
    if (!entries.length) return "—";
    entries.sort((a, b) => b[1] - a[1]);
    return entries[0][0]
      .replace(/^dari_/, "")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }, []);

  // ─── TAB 3: CHANNEL HARIAN ────────────────────────────
  const channelChartData = useMemo(() => {
    const byDate = new Map<string, { date: string; Video?: number; LIVE?: number }>();
    for (const v of videoStats) {
      const row = byDate.get(v.date) || { date: v.date.slice(5) };
      row.Video = parseFloat((v.gmv_from_video / 1e6).toFixed(2));
      byDate.set(v.date, row);
    }
    for (const l of liveStats) {
      const row = byDate.get(l.date) || { date: l.date.slice(5) };
      row.LIVE = parseFloat((l.gmv_live / 1e6).toFixed(2));
      byDate.set(l.date, row);
    }
    return [...byDate.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([, v]) => v);
  }, [videoStats, liveStats]);

  const channelTotals = useMemo(() => {
    const videoGMV = videoStats.reduce((a, r) => a + r.gmv_from_video, 0);
    const liveGMV = liveStats.reduce((a, r) => a + r.gmv_live, 0);
    const totalVV = videoStats.reduce((a, r) => a + r.vv, 0);
    const totalLiveViews = liveStats.reduce((a, r) => a + r.impressions, 0);
    return {
      videoGMV, liveGMV,
      videoGPM: totalVV > 0 ? (videoGMV / totalVV) * 1000 : 0,
      liveGPM: totalLiveViews > 0 ? (liveGMV / totalLiveViews) * 1000 : 0,
      videoDays: videoStats.length,
      liveDays: liveStats.length,
    };
  }, [videoStats, liveStats]);

  const channelMa7 = useMemo(() => {
    const video = detectMa7Drops(videoStats.map((r) => ({ date: r.date, gmv: r.gmv_from_video, ctr: r.ctr_video, ctor: r.ctor_video })));
    const live = detectMa7Drops(liveStats.map((r) => ({ date: r.date, gmv: r.gmv_live, ctr: r.ctr_live, ctor: r.order_per_click })));
    return { video, live };
  }, [videoStats, liveStats]);

  const subTabs: { key: SubTab; icon: string; label: string; badge?: number }[] = [
    { key: "produk", icon: "📦", label: "Trafik Per Produk", badge: products.length },
    { key: "katalog", icon: "🗂️", label: "Katalog Produk", badge: catalog.length },
    { key: "channel", icon: "📈", label: "Channel Harian" },
  ];

  // ═══════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            📊 Analisis Trafik Produk
            <MetricHelpTooltip
              title="Analisis Trafik Produk"
              desc="Import export TikTok Shop (Product Traffic, product_list, Video/Live Core Stats) ke Supabase, lalu analisis funnel per produk per channel."
            />
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Funnel per produk (Impresi → Klik → Keranjang → Pesanan) untuk toko {activeStore?.name || "—"}
          </p>
        </div>
      </div>

      {/* Purpose & Benefit */}
      <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs leading-relaxed">
        <div className="space-y-1">
          <span className="font-bold text-foreground">🎯 Tujuan:</span>
          <p className="text-muted">
            Mengetahui produk mana yang menang/kalah di channel mana (LIVE, Video, Kartu Produk, Afiliasi)
            hingga level konversi harian — bukan sekadar total GMV toko.
          </p>
        </div>
        <div className="space-y-1">
          <span className="font-bold text-foreground">💡 Manfaat:</span>
          <p className="text-muted">
            Deteksi dini funnel yang bocor (CTR/CTOR drop vs rata-rata 7 hari), bandingkan efisiensi channel,
            dan data tersimpan permanen di Supabase untuk analisis lintas periode.
          </p>
        </div>
      </div>

      {/* ─── UPLOAD ZONE ─────────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">⬆️ Upload Export TikTok Shop</h2>
            <p className="text-[11px] text-gray-400 mt-0.5">
              Auto-detect: Product Traffic Key Metrics · Product Traffic List · product_list · Video Core Stats · Live Core Stats — boleh pilih banyak file sekaligus
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              multiple
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading || !storeId}
              className="flex items-center gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white px-4 py-2 rounded-lg font-medium transition"
            >
              {uploading ? (
                <><span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Memproses...</>
              ) : (
                <>📂 Pilih File Excel</>
              )}
            </button>
          </div>
        </div>

        {loadError && (
          <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3 mb-3">
            <span className="text-amber-500">⚠️</span>
            <p className="text-xs text-amber-700 dark:text-amber-300">{loadError}</p>
          </div>
        )}

        {uploadResults.length > 0 && (
          <div className="space-y-1.5">
            {uploadResults.map((r, i) => (
              <div key={i} className={`flex items-start gap-2 rounded-lg px-3 py-2 text-xs border ${r.ok ? "bg-green-50 border-green-100 dark:bg-green-900/10 dark:border-green-900/30" : "bg-red-50 border-red-100 dark:bg-red-900/10 dark:border-red-900/30"}`}>
                <span>{r.ok ? "✅" : "❌"}</span>
                <div className="min-w-0">
                  <span className="font-semibold text-gray-800 dark:text-gray-200">{r.label}</span>
                  <span className="text-gray-400"> — {r.name}</span>
                  <div className={r.ok ? "text-green-700 dark:text-green-400" : "text-red-600 dark:text-red-400"}>{r.detail}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Preview PT_LIST (agregat) */}
        {ptListPreview && ptListPreview.length > 0 && (
          <div className="mt-3 overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-700">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 font-semibold text-left">
                  <th className="py-2 px-3">Rekap Channel (file List)</th>
                  <th className="py-2 px-3 text-right">GMV</th>
                  <th className="py-2 px-3 text-right">Pesanan SKU</th>
                  <th className="py-2 px-3 text-right">Impresi</th>
                  <th className="py-2 px-3 text-right">CTR</th>
                  <th className="py-2 px-3 text-right">CTOR</th>
                </tr>
              </thead>
              <tbody>
                {ptListPreview.map((c) => (
                  <tr key={c.channel} className="border-t border-gray-50 dark:border-gray-700/50">
                    <td className="py-2 px-3 font-medium text-gray-800 dark:text-gray-200">{c.channel}</td>
                    <td className="py-2 px-3 text-right font-bold text-gray-900 dark:text-white">{fRpShort(c.gmv)}</td>
                    <td className="py-2 px-3 text-right">{fN(c.sku_orders)}</td>
                    <td className="py-2 px-3 text-right">{fN(c.impressions)}</td>
                    <td className="py-2 px-3 text-right">{fP(c.ctr)}</td>
                    <td className="py-2 px-3 text-right">{fP(c.ctor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── SUB TAB NAV ─────────────────────────────── */}
      <div className="flex gap-1 rounded-xl border border-border bg-background/95 p-1 overflow-x-auto">
        {subTabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setSubTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${
              subTab === t.key
                ? "bg-white dark:bg-gray-800 shadow-md text-gray-900 dark:text-white ring-1 ring-black/5"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50"
            }`}
          >
            <span>{t.icon}</span>
            <span>{t.label}</span>
            {t.badge != null && t.badge > 0 && (
              <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">{t.badge}</span>
            )}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
          <div className="w-4 h-4 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" /> Memuat data...
        </div>
      )}

      {/* ═══ TAB 1: TRAFIK PER PRODUK ═══ */}
      {subTab === "produk" && (
        <div className="space-y-5">
          {products.length === 0 && !loading ? (
            <div className="text-center py-10 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-200 dark:border-gray-600">
              <span className="text-3xl block mb-2">📦</span>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Belum ada data trafik produk</p>
              <p className="text-xs text-gray-400 mt-1">Upload file <b>Product_Traffic_[total]_Key_Metrics_*.xlsx</b> dari TikTok Shop Analytics.</p>
            </div>
          ) : (
            <>
              {/* Selector produk + jenis konten */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 flex flex-col lg:flex-row lg:items-center gap-3">
                <label className="flex flex-col gap-1 text-xs font-semibold text-muted min-w-64">
                  Produk
                  <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="min-h-10 rounded-xl border border-border bg-card px-3 text-sm font-semibold text-foreground outline-none focus:ring-2 focus:ring-primary/25"
                  >
                    {products.map((p) => (
                      <option key={p.product_id} value={p.product_id}>
                        {p.product_name || p.product_id} ({p.days} hari)
                      </option>
                    ))}
                  </select>
                </label>
                <div className="flex-1">
                  <div className="text-xs font-semibold text-muted mb-1">Jenis Konten</div>
                  <div className="flex flex-wrap gap-1.5">
                    {CONTENT_TYPES.map((ct) => (
                      <button
                        key={ct}
                        onClick={() => setContentType(ct)}
                        className={`text-xs px-3 py-1.5 rounded-lg font-medium transition border ${
                          contentType === ct
                            ? "text-white border-transparent"
                            : "bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-100"
                        }`}
                        style={contentType === ct ? { backgroundColor: TYPE_COLORS[ct] } : undefined}
                      >
                        {CONTENT_TYPE_LABELS[ct]}
                      </button>
                    ))}
                  </div>
                </div>
                {selectedProduct && (
                  <div className="text-right text-xs text-gray-400">
                    <div>Periode data: {selectedProduct.min_date} → {selectedProduct.max_date}</div>
                    <div>ID: {selectedProduct.product_id}</div>
                  </div>
                )}
              </div>

              {/* MA7 Alerts */}
              {ma7Alerts.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {ma7Alerts.map((a) => (
                    <span key={a.metric} className="flex items-center gap-1.5 text-xs font-semibold bg-red-50 text-red-700 border border-red-200 rounded-full px-3 py-1.5">
                      📉 {a.metric} drop {a.dropPct.toFixed(0)}% vs MA7 — hari terakhir {a.current} (rata-rata {a.avg})
                    </span>
                  ))}
                </div>
              )}

              {/* KPI Cards */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                  { label: "GMV", value: fRpShort(totals.gmv), sub: `${totals.days} hari`, help: "Total GMV produk pada jenis konten terpilih." },
                  { label: "Pesanan SKU", value: fN(totals.skuOrders), sub: `AOV ${fRpShort(totals.aov)}`, help: "Jumlah pesanan SKU + rata-rata nilai pesanan." },
                  { label: "Impresi", value: fN(totals.impressions), sub: `${fN(totals.clicks)} klik`, help: "Berapa kali produk tampil di layar pembeli." },
                  { label: "CTR", value: fP(totals.ctr), sub: "klik / impresi", help: "Rasio klik terhadap impresi. Benchmark sehat > 3%." },
                  { label: "ATC Rate", value: fP(totals.atcRate), sub: `${fN(totals.atc)} keranjang`, help: "Persentase klik yang lanjut menambahkan ke keranjang." },
                  { label: "CTOR", value: fP(totals.ctor), sub: "pesanan / klik", help: "Rasio klik yang berujung pesanan. Benchmark sehat > 8%." },
                ].map((c) => (
                  <div key={c.label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-3.5 relative">
                    <div className="absolute top-2.5 right-2.5"><MetricHelpTooltip title={c.label} desc={c.help} /></div>
                    <div className="text-base font-black text-gray-900 dark:text-white">{c.value}</div>
                    <div className="text-[11px] font-medium text-gray-500 mt-0.5">{c.label}</div>
                    <div className="text-[10px] text-gray-400">{c.sub}</div>
                  </div>
                ))}
              </div>

              {/* Funnel */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  🔻 Funnel Konversi — {CONTENT_TYPE_LABELS[contentType]}
                  <MetricHelpTooltip title="Funnel Konversi" desc="Alur pembeli dari melihat produk hingga memesan. Persentase = konversi dari tahap sebelumnya." />
                </h3>
                <div className="space-y-2.5">
                  {(() => {
                    const stages = [
                      { label: "Impresi Produk", value: totals.impressions, color: "#6366f1" },
                      { label: "Klik Produk", value: totals.clicks, color: "#8b5cf6", rate: totals.ctr, rateLabel: "CTR" },
                      { label: "Tambah ke Keranjang", value: totals.atc, color: "#f59e0b", rate: totals.atcRate, rateLabel: "ATC%" },
                      { label: "Pesanan SKU", value: totals.skuOrders, color: "#10b981", rate: totals.ctor, rateLabel: "CTOR (dari klik)" },
                    ];
                    const max = stages[0].value || 1;
                    return stages.map((s) => (
                      <div key={s.label} className="flex items-center gap-3">
                        <span className="text-xs text-gray-500 w-40 flex-shrink-0">{s.label}</span>
                        <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-5 overflow-hidden">
                          <div
                            className="h-5 rounded-full flex items-center justify-end pr-2 transition-all"
                            style={{ width: `${Math.max(2, (s.value / max) * 100)}%`, backgroundColor: s.color }}
                          >
                            <span className="text-[10px] font-bold text-white whitespace-nowrap">{fN(s.value)}</span>
                          </div>
                        </div>
                        <span className="text-[10px] font-semibold text-gray-500 w-28 text-right">
                          {s.rate !== undefined ? `${s.rateLabel}: ${fP(s.rate)}` : "100%"}
                        </span>
                      </div>
                    ));
                  })()}
                </div>
              </div>

              {/* Tren GMV per jenis konten */}
              {trendChartData.length > 1 && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">📈 Tren GMV Harian per Jenis Konten (juta Rp)</h3>
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={trendChartData} margin={{ top: 5, right: 16, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}Jt`} />
                      <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #e5e7eb", fontSize: "12px" }} formatter={(val: unknown) => [`Rp ${Number(val).toFixed(2)}Jt`, ""]} />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                      {CONTENT_TYPES.map((ct) => (
                        <Line
                          key={ct}
                          type="monotone"
                          dataKey={CONTENT_TYPE_LABELS[ct]}
                          stroke={TYPE_COLORS[ct]}
                          strokeWidth={ct === contentType ? 3 : 1.5}
                          dot={false}
                          connectNulls
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Tabel 14 hari terakhir */}
              {typeRows.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">📋 Detail Harian Terakhir — {CONTENT_TYPE_LABELS[contentType]}</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b-2 border-gray-100 dark:border-gray-700 text-gray-500 font-semibold text-left">
                          <th className="py-2 px-2">Tanggal</th>
                          <th className="py-2 px-2 text-right">GMV</th>
                          <th className="py-2 px-2 text-right">Pesanan SKU</th>
                          <th className="py-2 px-2 text-right">Impresi</th>
                          <th className="py-2 px-2 text-right">Klik</th>
                          <th className="py-2 px-2 text-right">CTR</th>
                          <th className="py-2 px-2 text-right">ATC</th>
                          <th className="py-2 px-2 text-right">CTOR</th>
                        </tr>
                      </thead>
                      <tbody>
                        {typeRows.slice(-14).reverse().map((r) => (
                          <tr key={r.date} className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50/50 dark:hover:bg-gray-700/30">
                            <td className="py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300">{r.date}</td>
                            <td className="py-1.5 px-2 text-right font-bold text-gray-900 dark:text-white">{fRpShort(r.gmv)}</td>
                            <td className="py-1.5 px-2 text-right">{fN(r.sku_orders)}</td>
                            <td className="py-1.5 px-2 text-right">{fN(r.impressions)}</td>
                            <td className="py-1.5 px-2 text-right">{fN(r.clicks)}</td>
                            <td className="py-1.5 px-2 text-right">{fP(r.ctr)}</td>
                            <td className="py-1.5 px-2 text-right">{fN(r.atc)}</td>
                            <td className="py-1.5 px-2 text-right">{fP(r.ctor)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ═══ TAB 2: KATALOG PRODUK ═══ */}
      {subTab === "katalog" && (
        <div className="space-y-4">
          {catalog.length === 0 && !loading ? (
            <div className="text-center py-10 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-200 dark:border-gray-600">
              <span className="text-3xl block mb-2">🗂️</span>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Belum ada katalog produk</p>
              <p className="text-xs text-gray-400 mt-1">Upload file <b>product_list_*.xlsx</b> dari TikTok Shop Analytics.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="🔍 Cari nama / ID produk..."
                  className="min-h-10 w-72 rounded-xl border border-border bg-card px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/25"
                />
                <span className="text-xs text-gray-400">
                  {filteredCatalog.length} produk · Total GMV {fRpShort(filteredCatalog.reduce((a, c) => a + c.gmv, 0))}
                  {catalog[0] && ` · Periode ${catalog[0].period_start} → ${catalog[0].period_end}`}
                </span>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b-2 border-gray-100 dark:border-gray-700 text-gray-500 font-semibold text-left">
                      <th className="py-2 px-2">#</th>
                      <th className="py-2 px-2">Produk</th>
                      <th className="py-2 px-2">Status</th>
                      <th className="py-2 px-2 text-right">GMV</th>
                      <th className="py-2 px-2 text-right">Pesanan SKU</th>
                      <th className="py-2 px-2 text-right">Impresi</th>
                      <th className="py-2 px-2 text-right">CTR</th>
                      <th className="py-2 px-2 text-right">CTOR</th>
                      <th className="py-2 px-2">Channel Terkuat</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCatalog.map((c, i) => (
                      <tr key={c.product_id} className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50/50 dark:hover:bg-gray-700/30">
                        <td className="py-2 px-2 text-gray-400">{i + 1}</td>
                        <td className="py-2 px-2">
                          <div className="font-medium text-gray-900 dark:text-white max-w-xs truncate">{c.name}</div>
                          <div className="text-[10px] text-gray-400">{c.product_id}</div>
                        </td>
                        <td className="py-2 px-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${c.status.toLowerCase() === "aktif" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                            {c.status || "—"}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-right font-black text-gray-900 dark:text-white">{fRpShort(c.gmv)}</td>
                        <td className="py-2 px-2 text-right">{fN(c.sku_orders)}</td>
                        <td className="py-2 px-2 text-right">{fN(c.impressions)}</td>
                        <td className={`py-2 px-2 text-right font-semibold ${c.ctr < 2 && c.impressions > 1000 ? "text-red-500" : "text-gray-700 dark:text-gray-300"}`}>{fP(c.ctr)}</td>
                        <td className={`py-2 px-2 text-right font-semibold ${c.ctor < 5 && c.clicks > 100 ? "text-red-500" : "text-gray-700 dark:text-gray-300"}`}>{fP(c.ctor)}</td>
                        <td className="py-2 px-2 text-indigo-600 dark:text-indigo-400 font-medium">{topChannelOf(c)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* ═══ TAB 3: CHANNEL HARIAN ═══ */}
      {subTab === "channel" && (
        <div className="space-y-4">
          {videoStats.length === 0 && liveStats.length === 0 && !loading ? (
            <div className="text-center py-10 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-200 dark:border-gray-600">
              <span className="text-3xl block mb-2">📈</span>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Belum ada data channel harian</p>
              <p className="text-xs text-gray-400 mt-1">
                Upload file <b>Video Performance Core Stats_*.xlsx</b> dan <b>Live Performance Core Stats_*.xlsx</b>.
              </p>
            </div>
          ) : (
            <>
              {/* MA7 channel alerts */}
              {(channelMa7.video.length > 0 || channelMa7.live.length > 0) && (
                <div className="flex flex-wrap gap-2">
                  {channelMa7.video.map((a) => (
                    <span key={`v-${a.metric}`} className="text-xs font-semibold bg-red-50 text-red-700 border border-red-200 rounded-full px-3 py-1.5">
                      📹 Video: {a.metric} drop {a.dropPct.toFixed(0)}% vs MA7
                    </span>
                  ))}
                  {channelMa7.live.map((a) => (
                    <span key={`l-${a.metric}`} className="text-xs font-semibold bg-red-50 text-red-700 border border-red-200 rounded-full px-3 py-1.5">
                      🔴 LIVE: {a.metric} drop {a.dropPct.toFixed(0)}% vs MA7
                    </span>
                  ))}
                </div>
              )}

              {/* KPI channel */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { label: "GMV Channel Video", value: fRpShort(channelTotals.videoGMV), sub: `${channelTotals.videoDays} hari data`, icon: "📹" },
                  { label: "GMV Channel LIVE", value: fRpShort(channelTotals.liveGMV), sub: `${channelTotals.liveDays} hari data`, icon: "🔴" },
                  { label: "GPM Video (per 1rb VV)", value: fRpShort(channelTotals.videoGPM), sub: "benchmark > Rp15rb", icon: "🎬" },
                  { label: "GPM LIVE (per 1rb tayang)", value: fRpShort(channelTotals.liveGPM), sub: "benchmark > Rp15rb", icon: "📡" },
                ].map((c) => (
                  <div key={c.label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4">
                    <div className="text-lg mb-1">{c.icon}</div>
                    <div className="text-base font-black text-gray-900 dark:text-white">{c.value}</div>
                    <div className="text-[11px] font-medium text-gray-500 mt-0.5">{c.label}</div>
                    <div className="text-[10px] text-gray-400">{c.sub}</div>
                  </div>
                ))}
              </div>

              {/* Chart Video vs LIVE */}
              {channelChartData.length > 1 && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    ⚔️ GMV Harian: Video vs LIVE (juta Rp)
                    <MetricHelpTooltip title="Video vs LIVE" desc="Perbandingan GMV harian channel video dan LIVE dari file Core Stats — data real TikTok Shop, bukan estimasi." />
                  </h3>
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={channelChartData} margin={{ top: 5, right: 16, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}Jt`} />
                      <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #e5e7eb", fontSize: "12px" }} formatter={(val: unknown) => [`Rp ${Number(val).toFixed(2)}Jt`, ""]} />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                      <Line type="monotone" dataKey="Video" stroke="#7c3aed" strokeWidth={2.5} dot={false} connectNulls />
                      <Line type="monotone" dataKey="LIVE" stroke="#ff6b35" strokeWidth={2.5} dot={false} connectNulls />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Tabel gabungan 14 hari */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 overflow-x-auto">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">📋 Ringkasan 14 Hari Terakhir</h3>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b-2 border-gray-100 dark:border-gray-700 text-gray-500 font-semibold text-left">
                      <th className="py-2 px-2">Tanggal</th>
                      <th className="py-2 px-2 text-right">GMV Video</th>
                      <th className="py-2 px-2 text-right">VV</th>
                      <th className="py-2 px-2 text-right">GPM Video</th>
                      <th className="py-2 px-2 text-right">GMV LIVE</th>
                      <th className="py-2 px-2 text-right">Siaran</th>
                      <th className="py-2 px-2 text-right">GPM LIVE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const vMap = new Map(videoStats.map((v) => [v.date, v]));
                      const lMap = new Map(liveStats.map((l) => [l.date, l]));
                      const dates = [...new Set([...vMap.keys(), ...lMap.keys()])].sort().slice(-14).reverse();
                      return dates.map((d) => {
                        const v = vMap.get(d);
                        const l = lMap.get(d);
                        return (
                          <tr key={d} className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50/50 dark:hover:bg-gray-700/30">
                            <td className="py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300">{d}</td>
                            <td className="py-1.5 px-2 text-right font-bold text-violet-600">{v ? fRpShort(v.gmv_from_video) : "—"}</td>
                            <td className="py-1.5 px-2 text-right">{v ? fN(v.vv) : "—"}</td>
                            <td className="py-1.5 px-2 text-right">{v ? fRpShort(v.gpm) : "—"}</td>
                            <td className="py-1.5 px-2 text-right font-bold text-orange-600">{l ? fRpShort(l.gmv_live) : "—"}</td>
                            <td className="py-1.5 px-2 text-right">{l ? fN(l.sessions_total) : "—"}</td>
                            <td className="py-1.5 px-2 text-right">{l ? fRpShort(l.gpm) : "—"}</td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
