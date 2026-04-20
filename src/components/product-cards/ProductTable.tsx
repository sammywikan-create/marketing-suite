"use client";
import { useState, useMemo } from "react";
import { calculateProductScore } from "@/lib/product-card/scoring";
import { getBenchmarkEmoji } from "@/lib/product-card/benchmarks";
import { BENCH_PRODUCT_CARD, BENCH_SHOP_TAB } from "@/lib/product-card/benchmarks";

function fR(v: number) {
  if (v >= 1_000_000_000) return `Rp ${(v / 1_000_000_000).toFixed(1)}M`;
  if (v >= 1_000_000) return `Rp ${(v / 1_000_000).toFixed(1)}Jt`;
  if (v >= 1_000) return `Rp ${(v / 1_000).toFixed(1)}Rb`;
  return `Rp ${v.toLocaleString("id-ID")}`;
}
function fN(v: number) { return v.toLocaleString("id-ID"); }
function fP(v: number) { return (v * 100).toFixed(2) + "%"; }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function ProductTable({
  data, channel = "product_card", onSelectProduct,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any[];
  channel?: string;
  onSelectProduct?: (productId: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("gmv");
  const [sortAsc, setSortAsc] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [page, setPage] = useState(0);
  const PER_PAGE = 15;

  const bench = channel === "product_card" ? BENCH_PRODUCT_CARD : BENCH_SHOP_TAB;
  const avgGmv = useMemo(() => {
    const n = data.length || 1;
    return data.reduce((a, d) => a + (d.gmv || 0), 0) / n;
  }, [data]);

  const scored = useMemo(() => {
    return data.map((d) => {
      const score = calculateProductScore(
        d.rate_tayangan_to_klik || 0,
        d.rate_klik_to_pembayaran || 0,
        d.rate_klik_to_cart || 0,
        d.gmv || 0,
        avgGmv,
        d.gmv_from_content || 0,
      );
      return { ...d, _score: score };
    });
  }, [data, avgGmv]);

  const filtered = useMemo(() => {
    let list = scored;
    if (search) list = list.filter((d) => (d.product_name || "").toLowerCase().includes(search.toLowerCase()));
    list.sort((a, b) => {
      if (sortKey === "_score") return sortAsc ? a._score.total - b._score.total : b._score.total - a._score.total;
      const va = a[sortKey] ?? 0;
      const vb = b[sortKey] ?? 0;
      return sortAsc ? va - vb : vb - va;
    });
    return list;
  }, [scored, search, sortKey, sortAsc]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paged = filtered.slice(page * PER_PAGE, (page + 1) * PER_PAGE);

  const toggleSort = (key: string) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  const th = (label: string, key: string) => (
    <th key={key} className="p-2 text-left cursor-pointer hover:bg-gray-100 whitespace-nowrap select-none" onClick={() => toggleSort(key)}>
      {label} {sortKey === key ? (sortAsc ? "▲" : "▼") : ""}
    </th>
  );

  const getRowBg = (d: typeof scored[0]) => {
    if ((d.rate_klik_to_pembayaran || 0) > 0.20) return "bg-green-50";
    if ((d.tayangan || 0) > 5000 && (d.pembeli || 0) === 0) return "bg-yellow-50";
    if ((d.tayangan || 0) > 1000 && (d.rate_tayangan_to_klik || 0) < 0.02) return "bg-red-50";
    return "";
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <span className="text-sm">🔍</span>
          <input type="text" placeholder="Cari nama produk..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
        <select value={sortKey} onChange={(e) => { setSortKey(e.target.value); setSortAsc(false); }}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm">
          <option value="gmv">Sort: GMV ↓</option>
          <option value="tayangan">Tayangan ↓</option>
          <option value="pembeli">Pembeli ↓</option>
          <option value="rate_tayangan_to_klik">CTR ↓</option>
          <option value="rate_klik_to_pembayaran">CVR ↓</option>
          <option value="_score">Skor ↓</option>
        </select>
        <div className="flex bg-gray-100 rounded-lg p-0.5">
          <button onClick={() => setViewMode("list")}
            className={`px-2.5 py-1 text-xs rounded-md ${viewMode === "list" ? "bg-white shadow-sm font-medium" : "text-gray-500"}`}>📋 List</button>
          <button onClick={() => setViewMode("grid")}
            className={`px-2.5 py-1 text-xs rounded-md ${viewMode === "grid" ? "bg-white shadow-sm font-medium" : "text-gray-500"}`}>⊞ Grid</button>
        </div>
      </div>

      {/* List view */}
      {viewMode === "list" && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-gray-50 z-10">
              <tr className="border-b">
                <th className="p-2 text-left w-8">#</th>
                <th className="p-2 text-left min-w-[200px]">Produk</th>
                {th("Penonton", "penonton")}
                {th("Tayangan", "tayangan")}
                {th("Klik Unik", "klik_unik")}
                {th("Klik", "klik")}
                {th("SKU", "pesanan_sku")}
                {th("Pembeli", "pembeli")}
                {th("+Krj", "add_to_cart")}
                {th("GMV", "gmv")}
                {channel === "product_card" && th("GMV Konten", "gmv_from_content")}
                {th("CTR", "rate_tayangan_to_klik")}
                {th("CVR", "rate_klik_to_pembayaran")}
                {channel === "product_card" && th("Krj→Bayar", "rate_cart_to_pembayaran")}
                {channel !== "product_card" && th("Produk Terjual", "produk_terjual")}
                {th("Skor", "_score")}
              </tr>
            </thead>
            <tbody>
              {paged.map((d, i) => (
                <tr key={d.product_id} className={`border-b hover:bg-gray-50 cursor-pointer ${getRowBg(d)}`}
                  onClick={() => onSelectProduct?.(d.product_id)}>
                  <td className="p-2 text-gray-400">{page * PER_PAGE + i + 1}</td>
                  <td className="p-2">
                    <div className="font-medium text-gray-900 truncate max-w-[250px]">{d.product_name}</div>
                    <div className="text-[10px] text-gray-400">{d.product_id}</div>
                  </td>
                  <td className="p-2 text-right">{fN(d.penonton || 0)}</td>
                  <td className="p-2 text-right">{fN(d.tayangan || 0)}</td>
                  <td className="p-2 text-right">{fN(d.klik_unik || 0)}</td>
                  <td className="p-2 text-right">{fN(d.klik || 0)}</td>
                  <td className="p-2 text-right">{fN(d.pesanan_sku || 0)}</td>
                  <td className="p-2 text-right">{fN(d.pembeli || 0)}</td>
                  <td className="p-2 text-right">{fN(d.add_to_cart || 0)}</td>
                  <td className="p-2 text-right font-bold text-green-700">{fR(d.gmv || 0)}</td>
                  {channel === "product_card" && <td className="p-2 text-right">{fR(d.gmv_from_content || 0)}</td>}
                  <td className="p-2 text-right">{getBenchmarkEmoji(d.rate_tayangan_to_klik || 0, bench.ctr)} {fP(d.rate_tayangan_to_klik || 0)}</td>
                  <td className="p-2 text-right">{getBenchmarkEmoji(d.rate_klik_to_pembayaran || 0, bench.cvr)} {fP(d.rate_klik_to_pembayaran || 0)}</td>
                  {channel === "product_card" && <td className="p-2 text-right">{fP(d.rate_cart_to_pembayaran || 0)}</td>}
                  {channel !== "product_card" && <td className="p-2 text-right">{fN(d.produk_terjual || 0)}</td>}
                  <td className="p-2 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      d._score.total >= 80 ? "bg-green-100 text-green-700" :
                      d._score.total >= 60 ? "bg-blue-100 text-blue-700" :
                      d._score.total >= 40 ? "bg-yellow-100 text-yellow-700" :
                      "bg-red-100 text-red-700"
                    }`}>
                      {d._score.emoji} {d._score.total}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <p className="text-center text-gray-400 py-8 text-sm">Tidak ada data produk</p>}
        </div>
      )}

      {/* Grid view */}
      {viewMode === "grid" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {paged.map((d) => (
            <div key={d.product_id} className={`rounded-xl border p-4 cursor-pointer hover:shadow-md transition ${getRowBg(d) || "bg-white"}`}
              onClick={() => onSelectProduct?.(d.product_id)}>
              <div className="font-medium text-sm text-gray-900 mb-1 line-clamp-2">{d.product_name}</div>
              <div className="text-[10px] text-gray-400 mb-3">ID: {d.product_id}</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-gray-400">Tayangan</span> <span className="font-bold ml-1">{fN(d.tayangan || 0)}</span></div>
                <div><span className="text-gray-400">CTR</span> <span className="font-bold ml-1">{fP(d.rate_tayangan_to_klik || 0)}</span></div>
                <div><span className="text-gray-400">GMV</span> <span className="font-bold text-green-700 ml-1">{fR(d.gmv || 0)}</span></div>
                <div><span className="text-gray-400">CVR</span> <span className="font-bold ml-1">{fP(d.rate_klik_to_pembayaran || 0)}</span></div>
                <div><span className="text-gray-400">Pembeli</span> <span className="font-bold ml-1">{fN(d.pembeli || 0)}</span></div>
                <div>
                  <span className="text-gray-400">Skor</span>
                  <span className={`ml-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    d._score.total >= 80 ? "bg-green-100 text-green-700" :
                    d._score.total >= 60 ? "bg-blue-100 text-blue-700" :
                    d._score.total >= 40 ? "bg-yellow-100 text-yellow-700" :
                    "bg-red-100 text-red-700"
                  }`}>{d._score.emoji} {d._score.total}</span>
                </div>
              </div>
              <button className="mt-3 text-xs text-blue-600 font-medium hover:underline">Lihat Detail →</button>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-xs">
          <span className="text-gray-400">{filtered.length} produk</span>
          <div className="flex gap-1">
            <button disabled={page === 0} onClick={() => setPage(page - 1)}
              className="px-3 py-1.5 rounded-lg border disabled:opacity-30">←</button>
            <span className="px-3 py-1.5">{page + 1}/{totalPages}</span>
            <button disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}
              className="px-3 py-1.5 rounded-lg border disabled:opacity-30">→</button>
          </div>
        </div>
      )}
    </div>
  );
}
