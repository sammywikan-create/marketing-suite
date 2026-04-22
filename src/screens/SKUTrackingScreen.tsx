"use client";
import { useEffect, useState, useMemo, useRef } from "react";
import * as XLSX from "xlsx";
import { SKUItem } from "@/lib/types";
import PageHeader from "@/components/PageHeader";
import Modal, { FormField, inputClass, btnPrimary, btnSecondary } from "@/components/Modal";
import StatusBadge from "@/components/StatusBadge";
import toast from "react-hot-toast";
import { saveSkuPhoto, getSkuPhotos, deleteSkuPhoto } from "@/lib/skuPhotoStorage";
import { Upload, ScanBarcode, Camera, X, TrendingUp, ShoppingBag, Package, CheckCircle } from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell,
} from "recharts";

// --- Helpers ---
function parseRp(val: string | number): number {
  if (typeof val === "number") return val;
  return Number(String(val).replace(/[^0-9-]/g, "")) || 0;
}
function fmtRp(n: number): string { return "Rp " + n.toLocaleString("id-ID"); }
function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 }) + "M";
  if (n >= 1_000) return (n / 1_000).toLocaleString("id-ID", { maximumFractionDigits: 1 }) + "K";
  return n.toLocaleString("id-ID");
}

// Parse period "2026-01-01 ~ 2026-03-31" → number of days
function parsePeriodDays(period: string): number {
  const m = period.match(/(\d{4}-\d{2}-\d{2})\s*~\s*(\d{4}-\d{2}-\d{2})/);
  if (!m) return 1;
  const start = new Date(m[1]);
  const end = new Date(m[2]);
  const diff = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  return diff > 0 ? diff : 1;
}

type Klasifikasi = "Best Seller" | "Potensial" | "Slow Moving" | "Dead Stock";
const KLASIFIKASI_COLORS: Record<Klasifikasi, string> = {
  "Best Seller": "bg-green-100 text-green-700",
  "Potensial": "bg-blue-100 text-blue-700",
  "Slow Moving": "bg-yellow-100 text-yellow-700",
  "Dead Stock": "bg-red-100 text-red-700",
};

function classifySku(item: SKUItem, totalGmv: number, totalItems: number): Klasifikasi {
  if (totalItems === 0 || totalGmv === 0) return "Dead Stock";
  const avgGmv = totalGmv / totalItems;
  if (item.gmv >= avgGmv * 2) return "Best Seller";
  if (item.gmv >= avgGmv * 0.5) return "Potensial";
  if (item.gmv > 0) return "Slow Moving";
  return "Dead Stock";
}

const CH_COLORS: Record<string, string> = {
  "Tab Toko": "#3b82f6",
  LIVE: "#f97316",
  Video: "#8b5cf6",
  "Kartu Produk": "#10b981",
};
const CH_KEYS = ["Tab Toko", "LIVE", "Video", "Kartu Produk"] as const;
const PAGE_SIZE = 10;

export default function SKUTrackingScreen() {
  const [skuItems, setSkuItems] = useState<SKUItem[]>([]);
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const [period, setPeriod] = useState<string>("");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "Active" | "Inactive">("all");
  const [filterKlasifikasi, setFilterKlasifikasi] = useState<"all" | Klasifikasi>("all");
  const [sortBy, setSortBy] = useState<"gmv" | "orders" | "sold">("gmv");
  const [page, setPage] = useState(1);
  const [photoModal, setPhotoModal] = useState<SKUItem | null>(null);
  const [detailModal, setDetailModal] = useState<SKUItem | null>(null);
  const [uploading, setUploading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Load photos on mount
  useEffect(() => {
    getSkuPhotos().then(setPhotos).catch(() => {});
  }, []);

  // Reset page on filter/search/sort change
  useEffect(() => { setPage(1); }, [search, filterStatus, filterKlasifikasi, sortBy]);

  // --- Excel Parsing ---
  async function handleFileUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setParsing(true);
    try {
      let parsedSku: SKUItem[] = [];
      let parsedPeriod = "";
      const productMap = new Map<string, Partial<SKUItem>>();

      for (let fi = 0; fi < files.length; fi++) {
        const file = files[fi];
        const ab = await file.arrayBuffer();
        const wb = XLSX.read(ab, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw: string[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
        if (raw.length < 3) continue;

        // Detect file type by header row
        const headerRow = raw.find(r => r.some(c => String(c).includes("SKU ID") || String(c).includes("Produk terjual dari Tab Shop")));
        const headerIdx = headerRow ? raw.indexOf(headerRow) : -1;

        if (headerRow && headerRow.some(c => String(c).includes("SKU ID"))) {
          // --- SKU List file ---
          // First row is typically the period
          if (raw[0] && raw[0][0]) parsedPeriod = String(raw[0][0]);

          const headers = headerRow.map(h => String(h).trim());
          const colIdx = (name: string) => headers.findIndex(h => h.toLowerCase().includes(name.toLowerCase()));
          const iSku = colIdx("SKU ID");
          const iProd = colIdx("ID Produk") !== -1 ? colIdx("ID Produk") : colIdx("Product ID");
          const iName = colIdx("Nama Produk") !== -1 ? colIdx("Nama Produk") : colIdx("Product Name");
          const iStatus = colIdx("Status");
          const iGmv = headers.findIndex(h => /GMV/i.test(h) && !/Tab|Live|Video|Kartu/i.test(h));
          const iOrders = colIdx("Pesanan") !== -1 ? colIdx("Pesanan") : colIdx("Orders");
          const iSold = colIdx("Produk Terjual") !== -1 ? colIdx("Produk Terjual") : colIdx("Sold");

          for (let r = headerIdx + 1; r < raw.length; r++) {
            const row = raw[r];
            if (!row || !row[iSku]) continue;
            parsedSku.push({
              skuId: String(row[iSku] ?? "").trim(),
              productId: String(row[iProd] ?? "").trim(),
              productName: String(row[iName] ?? "").trim(),
              status: String(row[iStatus] ?? "").includes("Aktif") || String(row[iStatus] ?? "").includes("Active") ? "Active" : "Inactive",
              gmv: parseRp(row[iGmv] ?? 0),
              orders: Number(String(row[iOrders] ?? 0).replace(/[^0-9]/g, "")) || 0,
              sold: Number(String(row[iSold] ?? 0).replace(/[^0-9]/g, "")) || 0,
            });
          }
        } else if (headerRow && headerRow.some(c => String(c).includes("Produk terjual dari Tab Shop"))) {
          // --- Product List file ---
          const headers = headerRow.map(h => String(h).trim());
          const col = (name: string) => headers.findIndex(h => h.toLowerCase().includes(name.toLowerCase()));
          const iId = col("ID") !== -1 ? headers.indexOf("ID") : col("Product ID");
          const iGmvTab = col("GMV dari Tab Shop") !== -1 ? col("GMV dari Tab Shop") : col("GMV Tab Toko");
          const iGmvLive = col("GMV dari LIVE");
          const iGmvVid = col("GMV dari Video");
          const iGmvKartu = col("GMV dari Kartu Produk");
          const iCtrTab = col("CTR dari Tab Shop") !== -1 ? col("CTR dari Tab Shop") : col("CTR Tab Toko");
          const iKonvTab = col("Konversi dari Tab Shop") !== -1 ? col("Konversi dari Tab Shop") : col("Konversi Tab Toko");
          const iCtrLive = col("CTR dari LIVE");
          const iKonvLive = col("Konversi dari LIVE");
          const iCtrVid = col("CTR dari Video");
          const iKonvVid = col("Konversi dari Video");
          const iCtrKartu = col("CTR dari Kartu Produk");
          const iKonvKartu = col("Konversi dari Kartu Produk");
          const iSoldTab = col("Produk terjual dari Tab Shop");
          const iSoldLive = col("Produk terjual dari LIVE");
          const iSoldVid = col("Produk terjual dari Video");
          const iSoldKartu = col("Produk terjual dari Kartu Produk");

          for (let r = headerIdx + 1; r < raw.length; r++) {
            const row = raw[r];
            if (!row || !row[iId]) continue;
            const pid = String(row[iId]).trim();
            productMap.set(pid, {
              gmvTabToko: parseRp(row[iGmvTab] ?? 0),
              gmvLive: parseRp(row[iGmvLive] ?? 0),
              gmvVideo: parseRp(row[iGmvVid] ?? 0),
              gmvKartuProduk: parseRp(row[iGmvKartu] ?? 0),
              ctrTabToko: iCtrTab >= 0 ? String(row[iCtrTab] ?? "") : undefined,
              konversiTabToko: iKonvTab >= 0 ? String(row[iKonvTab] ?? "") : undefined,
              ctrLive: iCtrLive >= 0 ? String(row[iCtrLive] ?? "") : undefined,
              konversiLive: iKonvLive >= 0 ? String(row[iKonvLive] ?? "") : undefined,
              ctrVideo: iCtrVid >= 0 ? String(row[iCtrVid] ?? "") : undefined,
              konversiVideo: iKonvVid >= 0 ? String(row[iKonvVid] ?? "") : undefined,
              ctrKartu: iCtrKartu >= 0 ? String(row[iCtrKartu] ?? "") : undefined,
              konversiKartu: iKonvKartu >= 0 ? String(row[iKonvKartu] ?? "") : undefined,
            });
            // Use sold columns for extra context (unused for now but available)
            void iSoldTab; void iSoldLive; void iSoldVid; void iSoldKartu;
          }
        }
      }

      // Merge product data into SKU items
      if (productMap.size > 0) {
        parsedSku = parsedSku.map(sku => {
          const extra = productMap.get(sku.productId);
          return extra ? { ...sku, ...extra } : sku;
        });
      }

      if (parsedSku.length === 0) {
        toast.error("Tidak ditemukan data SKU yang valid di file ini");
      } else {
        setSkuItems(parsedSku);
        setPeriod(parsedPeriod);
        toast.success(`Data berhasil dimuat — ${parsedSku.length} SKU ditemukan`);
      }
    } catch (err) {
      console.error(err);
      toast.error("Gagal membaca file Excel");
    } finally {
      setParsing(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  // --- Computed ---
  const periodDays = useMemo(() => parsePeriodDays(period), [period]);

  const summary = useMemo(() => ({
    totalGmv: skuItems.reduce((s, i) => s + i.gmv, 0),
    totalSold: skuItems.reduce((s, i) => s + i.sold, 0),
    totalOrders: skuItems.reduce((s, i) => s + i.orders, 0),
    activeCount: skuItems.filter(i => i.status === "Active").length,
    inactiveCount: skuItems.filter(i => i.status === "Inactive").length,
  }), [skuItems]);

  const top3 = useMemo(() => [...skuItems].sort((a, b) => b.gmv - a.gmv).slice(0, 3), [skuItems]);

  const filtered = useMemo(() => {
    let list = skuItems;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(i => i.productName.toLowerCase().includes(q) || i.skuId.toLowerCase().includes(q));
    }
    if (filterStatus !== "all") list = list.filter(i => i.status === filterStatus);
    if (filterKlasifikasi !== "all") list = list.filter(i => classifySku(i, summary.totalGmv, skuItems.length) === filterKlasifikasi);
    list = [...list].sort((a, b) => (b[sortBy] as number) - (a[sortBy] as number));
    return list;
  }, [skuItems, search, filterStatus, filterKlasifikasi, sortBy, summary.totalGmv]);

  const paginated = useMemo(() => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filtered, page]);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const hasChannelData = skuItems.some(i => i.gmvTabToko || i.gmvLive || i.gmvVideo || i.gmvKartuProduk);

  const channelChartData = useMemo(() => [
    { name: "Tab Toko", gmv: skuItems.reduce((s, i) => s + (i.gmvTabToko || 0), 0) },
    { name: "LIVE", gmv: skuItems.reduce((s, i) => s + (i.gmvLive || 0), 0) },
    { name: "Video", gmv: skuItems.reduce((s, i) => s + (i.gmvVideo || 0), 0) },
    { name: "Kartu Produk", gmv: skuItems.reduce((s, i) => s + (i.gmvKartuProduk || 0), 0) },
  ], [skuItems]);

  const channelTotal = channelChartData.reduce((s, c) => s + c.gmv, 0);

  // --- Photo handlers ---
  function openPhotoModal(item: SKUItem) {
    setPhotoModal(item);
    setPhotoPreview(photos[item.skuId] || null);
    setPhotoFile(null);
  }

  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setPhotoFile(f);
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(f);
  }

  async function handlePhotoSave() {
    if (!photoModal || !photoFile) return;
    setUploading(true);
    try {
      const url = await saveSkuPhoto(photoModal.skuId, photoFile);
      setPhotos(prev => ({ ...prev, [photoModal.skuId]: url }));
      toast.success("Foto berhasil disimpan");
      setPhotoModal(null);
    } catch (err) {
      console.error(err);
      toast.error("Gagal menyimpan foto");
    } finally {
      setUploading(false);
    }
  }

  async function handlePhotoDelete() {
    if (!photoModal) return;
    setUploading(true);
    try {
      await deleteSkuPhoto(photoModal.skuId);
      setPhotos(prev => {
        const next = { ...prev };
        delete next[photoModal.skuId];
        return next;
      });
      setPhotoPreview(null);
      setPhotoFile(null);
      toast.success("Foto dihapus");
      setPhotoModal(null);
    } catch {
      toast.error("Gagal menghapus foto");
    } finally {
      setUploading(false);
    }
  }

  // --- Rank helper ---
  const globalRanked = useMemo(() => {
    const sorted = [...skuItems].sort((a, b) => b.gmv - a.gmv);
    const map = new Map<string, number>();
    sorted.forEach((s, i) => map.set(s.skuId, i + 1));
    return map;
  }, [skuItems]);

  return (
    <div className="space-y-5">
      <PageHeader title="SKU Tracking" icon={<ScanBarcode size={20} />} count={skuItems.length} search={search} onSearch={setSearch} />

      {/* Hidden file input */}
      <input ref={fileRef} type="file" accept=".xlsx" multiple className="hidden" onChange={e => handleFileUpload(e.target.files)} />

      {/* Upload Section */}
      {skuItems.length === 0 ? (
        <div
          onClick={() => !parsing && fileRef.current?.click()}
          className="bg-white rounded-xl border-2 border-dashed border-gray-300 p-12 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition"
        >
          {parsing ? (
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
              <p className="text-sm text-gray-500">Memproses file...</p>
            </div>
          ) : (
            <>
              <Upload size={40} className="mx-auto text-gray-400 mb-3" />
              <p className="text-sm font-semibold text-gray-700">Upload file Excel SKU List & Product List</p>
              <p className="text-xs text-gray-400 mt-1">Format: .xlsx — bisa upload 2 file sekaligus</p>
            </>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border p-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <span>📅</span>
            <span className="font-medium">Periode: {period || "-"}</span>
            <span className="text-gray-400">·</span>
            <span className="text-gray-500">{skuItems.length} SKU</span>
          </div>
          <button
            onClick={() => fileRef.current?.click()}
            className="text-sm px-3 py-1.5 rounded-lg border text-gray-600 hover:bg-gray-50 transition"
            disabled={parsing}
          >
            {parsing ? "Memproses..." : "Ganti Data"}
          </button>
        </div>
      )}

      {/* Summary Cards */}
      {skuItems.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl border p-4">
            <div className="flex items-center gap-2 text-xs text-gray-400 mb-1"><TrendingUp size={14} /> Total GMV</div>
            <div className="text-xl font-bold text-gray-900">{fmtRp(summary.totalGmv)}</div>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <div className="flex items-center gap-2 text-xs text-gray-400 mb-1"><Package size={14} /> Produk Terjual</div>
            <div className="text-xl font-bold text-gray-900">{fmt(summary.totalSold)}</div>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <div className="flex items-center gap-2 text-xs text-gray-400 mb-1"><ShoppingBag size={14} /> Total Pesanan</div>
            <div className="text-xl font-bold text-gray-900">{fmt(summary.totalOrders)}</div>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <div className="flex items-center gap-2 text-xs text-gray-400 mb-1"><CheckCircle size={14} /> SKU Aktif</div>
            <div className="text-xl font-bold text-gray-900">{summary.activeCount} <span className="text-sm font-normal text-gray-400">/ {summary.inactiveCount} Non-Aktif</span></div>
          </div>
        </div>
      )}

      {/* Top 3 Best Seller */}
      {skuItems.length > 0 && top3.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {top3.map((item, idx) => (
            <div key={item.skuId} className="bg-white rounded-xl border p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">⭐ #{idx + 1}</span>
                <StatusBadge value={item.status} />
              </div>
              <div className="flex items-center gap-3 mb-3">
                {photos[item.skuId] ? (
                  <img src={photos[item.skuId]} alt="" className="w-16 h-16 rounded-lg object-cover border" />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center border">
                    <Camera size={20} className="text-gray-300" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold line-clamp-2">{item.productName}</p>
                </div>
              </div>
              <div className="text-lg font-bold text-green-600 mb-1">{fmtRp(item.gmv)}</div>
              <div className="flex gap-3 text-xs text-gray-500">
                <span>{fmt(item.orders)} pesanan</span>
                <span>{fmt(item.sold)} terjual</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Channel GMV Charts */}
      {hasChannelData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-white rounded-xl border p-5">
            <h3 className="text-sm font-semibold mb-3">GMV per Channel</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={channelChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 9 }} tickFormatter={v => fmtRp(v)} />
                <Tooltip formatter={(v) => fmtRp(Number(v))} />
                <Bar dataKey="gmv" name="GMV" radius={[4, 4, 0, 0]}>
                  {channelChartData.map((d, i) => <Cell key={i} fill={CH_COLORS[d.name] || "#888"} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-white rounded-xl border p-5">
            <h3 className="text-sm font-semibold mb-3">Distribusi GMV Channel</h3>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={channelChartData.filter(c => c.gmv > 0)}
                  dataKey="gmv" nameKey="name" cx="50%" cy="50%"
                  outerRadius={80} innerRadius={40}
                  label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  labelLine={false} fontSize={9}
                >
                  {channelChartData.filter(c => c.gmv > 0).map((d, i) => (
                    <Cell key={i} fill={CH_COLORS[d.name] || "#888"} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => fmtRp(Number(v))} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Filter & Sort Bar */}
      {skuItems.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 bg-white rounded-xl border p-4">
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as typeof filterStatus)}
            className="text-sm border rounded-lg px-3 py-1.5 bg-white"
          >
            <option value="all">Semua Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
          <select
            value={filterKlasifikasi}
            onChange={e => setFilterKlasifikasi(e.target.value as typeof filterKlasifikasi)}
            className="text-sm border rounded-lg px-3 py-1.5 bg-white"
          >
            <option value="all">Semua Klasifikasi</option>
            <option value="Best Seller">Best Seller</option>
            <option value="Potensial">Potensial</option>
            <option value="Slow Moving">Slow Moving</option>
            <option value="Dead Stock">Dead Stock</option>
          </select>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as typeof sortBy)}
            className="text-sm border rounded-lg px-3 py-1.5 bg-white"
          >
            <option value="gmv">GMV Tertinggi</option>
            <option value="orders">Pesanan Terbanyak</option>
            <option value="sold">Terjual Terbanyak</option>
          </select>
          <span className="text-xs text-gray-400 ml-auto">Menampilkan {filtered.length} dari {skuItems.length} SKU</span>
        </div>
      )}

      {/* SKU Table */}
      {skuItems.length > 0 && (
        <div className="bg-white rounded-xl border shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-xs text-gray-500 uppercase">
                <th className="px-3 py-3 text-left w-10">No.</th>
                <th className="px-3 py-3 text-left w-12">Foto</th>
                <th className="px-3 py-3 text-left">Nama Produk</th>
                <th className="px-3 py-3 text-left">SKU ID</th>
                <th className="px-3 py-3 text-center">Klasifikasi</th>
                <th className="px-3 py-3 text-right">GMV</th>
                <th className="px-3 py-3 text-right">Produk Terjual</th>
                <th className="px-3 py-3 text-right">Pesanan</th>
                <th className="px-3 py-3 text-right">GMV / Hari</th>
                <th className="px-3 py-3 text-right">Terjual / Hari</th>
                <th className="px-3 py-3 text-right">Pesanan / Hari</th>
                <th className="px-3 py-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map(item => {
                const rank = globalRanked.get(item.skuId) ?? 0;
                const isTop3 = rank <= 3;
                const klas = classifySku(item, summary.totalGmv, skuItems.length);
                const gmvPerDay = item.gmv / periodDays;
                const soldPerDay = item.sold / periodDays;
                const ordersPerDay = item.orders / periodDays;
                return (
                  <tr key={item.skuId} className={`border-b hover:bg-gray-50 transition ${isTop3 ? "border-l-4 border-l-green-500" : ""}`}>
                    <td className="px-3 py-2.5 text-xs text-gray-400 font-mono">{rank}</td>
                    <td className="px-3 py-2.5">
                      {photos[item.skuId] ? (
                        <img
                          src={photos[item.skuId]} alt=""
                          className="w-10 h-10 rounded object-cover border cursor-pointer"
                          onClick={() => openPhotoModal(item)}
                        />
                      ) : (
                        <div
                          className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center border cursor-pointer hover:bg-gray-200 transition"
                          onClick={() => openPhotoModal(item)}
                        >
                          <Camera size={14} className="text-gray-300" />
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <button onClick={() => setDetailModal(item)} className="text-left hover:text-blue-600 transition">
                        <span className="text-sm font-medium line-clamp-2">{item.productName}</span>
                      </button>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs text-gray-400 truncate max-w-[120px]">{item.skuId}</td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${KLASIFIKASI_COLORS[klas]}`}>{klas}</span>
                    </td>
                    <td className="px-3 py-2.5 text-right font-semibold">{fmtRp(item.gmv)}</td>
                    <td className="px-3 py-2.5 text-right">{fmt(item.sold)}</td>
                    <td className="px-3 py-2.5 text-right">{fmt(item.orders)}</td>
                    <td className="px-3 py-2.5 text-right text-xs text-gray-600">{fmtRp(Math.round(gmvPerDay))}</td>
                    <td className="px-3 py-2.5 text-right text-xs text-gray-600">{soldPerDay.toFixed(1)}</td>
                    <td className="px-3 py-2.5 text-right text-xs text-gray-600">{ordersPerDay.toFixed(1)}</td>
                    <td className="px-3 py-2.5 text-center">
                      <button
                        onClick={() => openPhotoModal(item)}
                        className="text-xs px-2 py-1 rounded border hover:bg-gray-50 text-gray-500 transition"
                      >
                        📷 Foto
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="text-sm px-3 py-1.5 rounded-lg border disabled:opacity-40 hover:bg-gray-50 transition"
          >
            Prev
          </button>
          <span className="text-sm text-gray-500">Halaman {page} dari {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="text-sm px-3 py-1.5 rounded-lg border disabled:opacity-40 hover:bg-gray-50 transition"
          >
            Next
          </button>
        </div>
      )}

      {/* Photo Modal */}
      <Modal open={photoModal !== null} onClose={() => setPhotoModal(null)} title="Upload Foto SKU">
        {photoModal && (
          <div className="space-y-4">
            <p className="text-sm font-medium line-clamp-2">{photoModal.productName}</p>
            <div className="flex justify-center">
              {photoPreview ? (
                <img src={photoPreview} alt="" className="w-[200px] h-[200px] object-cover rounded-xl border" />
              ) : (
                <div className="w-[200px] h-[200px] rounded-xl bg-gray-100 flex items-center justify-center border">
                  <Camera size={40} className="text-gray-300" />
                </div>
              )}
            </div>
            <input type="file" accept="image/*" onChange={handlePhotoSelect} className={inputClass} />
            <div className="flex gap-2">
              <button
                onClick={handlePhotoSave}
                disabled={!photoFile || uploading}
                className={btnPrimary + " disabled:opacity-40"}
              >
                {uploading ? "Menyimpan..." : "Simpan Foto"}
              </button>
              {photos[photoModal.skuId] && (
                <button
                  onClick={handlePhotoDelete}
                  disabled={uploading}
                  className="px-4 py-2 rounded-lg border border-red-300 text-red-600 hover:bg-red-50 text-sm font-medium transition disabled:opacity-40"
                >
                  Hapus Foto
                </button>
              )}
              <button onClick={() => setPhotoModal(null)} className={btnSecondary}>Batal</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Detail Modal */}
      <Modal open={detailModal !== null} onClose={() => setDetailModal(null)} title="Detail SKU" wide>
        {detailModal && (
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              {photos[detailModal.skuId] ? (
                <img src={photos[detailModal.skuId]} alt="" className="w-[120px] h-[120px] object-cover rounded-xl border shrink-0" />
              ) : (
                <div className="w-[120px] h-[120px] rounded-xl bg-gray-100 flex items-center justify-center border shrink-0">
                  <Camera size={32} className="text-gray-300" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold mb-2">{detailModal.productName}</h3>
                <StatusBadge value={detailModal.status} />
                <div className="mt-3 space-y-1 text-xs text-gray-500">
                  <p><span className="text-gray-400">SKU ID:</span> <span className="font-mono select-all">{detailModal.skuId}</span></p>
                  <p><span className="text-gray-400">Product ID:</span> <span className="font-mono select-all">{detailModal.productId}</span></p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <div className="text-xs text-gray-400">GMV</div>
                <div className="text-lg font-bold text-green-600">{fmtRp(detailModal.gmv)}</div>
                <div className="text-[10px] text-gray-400 mt-0.5">~{fmtRp(Math.round(detailModal.gmv / periodDays))} / hari</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <div className="text-xs text-gray-400">Produk Terjual</div>
                <div className="text-lg font-bold">{fmt(detailModal.sold)}</div>
                <div className="text-[10px] text-gray-400 mt-0.5">~{(detailModal.sold / periodDays).toFixed(1)} / hari</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <div className="text-xs text-gray-400">Pesanan</div>
                <div className="text-lg font-bold">{fmt(detailModal.orders)}</div>
                <div className="text-[10px] text-gray-400 mt-0.5">~{(detailModal.orders / periodDays).toFixed(1)} / hari</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">Klasifikasi:</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${KLASIFIKASI_COLORS[classifySku(detailModal, summary.totalGmv, skuItems.length)]}`}>
                {classifySku(detailModal, summary.totalGmv, skuItems.length)}
              </span>
              <span className="text-xs text-gray-400 ml-2">Periode: {periodDays} hari</span>
            </div>

            {(detailModal.gmvTabToko || detailModal.gmvLive || detailModal.gmvVideo || detailModal.gmvKartuProduk) && (
              <div>
                <h4 className="text-sm font-semibold mb-2">Breakdown per Channel</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-xs text-gray-500 uppercase">
                        <th className="py-2 text-left">Channel</th>
                        <th className="py-2 text-right">GMV</th>
                        <th className="py-2 text-right">CTR</th>
                        <th className="py-2 text-right">Konversi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {([
                        { ch: "Tab Toko", gmv: detailModal.gmvTabToko, ctr: detailModal.ctrTabToko, konv: detailModal.konversiTabToko },
                        { ch: "LIVE", gmv: detailModal.gmvLive, ctr: detailModal.ctrLive, konv: detailModal.konversiLive },
                        { ch: "Video", gmv: detailModal.gmvVideo, ctr: detailModal.ctrVideo, konv: detailModal.konversiVideo },
                        { ch: "Kartu Produk", gmv: detailModal.gmvKartuProduk, ctr: detailModal.ctrKartu, konv: detailModal.konversiKartu },
                      ] as const).map(row => (
                        <tr key={row.ch} className="border-b">
                          <td className="py-2 flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CH_COLORS[row.ch] }} />
                            {row.ch}
                          </td>
                          <td className="py-2 text-right font-medium">{row.gmv ? fmtRp(row.gmv) : "-"}</td>
                          <td className="py-2 text-right">{row.ctr || "-"}</td>
                          <td className="py-2 text-right">{row.konv || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
