"use client";
import { useState, useMemo } from "react";

function fR(v: number) {
  if (v >= 1_000_000_000) return `Rp ${(v / 1_000_000_000).toFixed(1)}M`;
  if (v >= 1_000_000) return `Rp ${(v / 1_000_000).toFixed(1)}Jt`;
  if (v >= 1_000) return `Rp ${(v / 1_000).toFixed(1)}Rb`;
  return `Rp ${v.toLocaleString("id-ID")}`;
}
function fN(v: number) { return v.toLocaleString("id-ID"); }
function fP(v: number) { return (v * 100).toFixed(2) + "%"; }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function DailyTrafficTable({ data, showShopCols = false }: { data: any[]; showShopCols?: boolean }) {
  const [sortKey, setSortKey] = useState("date");
  const [sortAsc, setSortAsc] = useState(false);

  const sorted = useMemo(() => {
    return [...data].sort((a, b) => {
      const va = a[sortKey] ?? 0;
      const vb = b[sortKey] ?? 0;
      if (typeof va === "string") return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
      return sortAsc ? va - vb : vb - va;
    });
  }, [data, sortKey, sortAsc]);

  const toggleSort = (key: string) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  const th = (label: string, key: string) => (
    <th key={key} className="p-2 text-left cursor-pointer hover:bg-gray-100 whitespace-nowrap select-none" onClick={() => toggleSort(key)}>
      {label} {sortKey === key ? (sortAsc ? "▲" : "▼") : ""}
    </th>
  );

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      <h3 className="text-sm font-semibold mb-4">📋 Tabel Harian</h3>
      <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-gray-50 z-10">
            <tr className="border-b">
              {th("Tanggal", "date")}
              {th("Tayangan", "tayangan")}
              {th("Klik", "klik")}
              {th("Klik Unik", "klik_unik")}
              {th("Penonton", "penonton")}
              {th("Pembeli", "pembeli")}
              {th("SKU", "pesanan_sku")}
              {th("+Keranjang", "add_to_cart")}
              {th("GMV", "gmv")}
              {th("GMV Konten", "gmv_from_content")}
              {th("CTR", "rate_tayangan_to_klik")}
              {th("CVR", "rate_klik_to_pembayaran")}
              {th("Klik→Krj", "rate_klik_to_cart")}
              {th("Krj→Bayar", "rate_cart_to_pembayaran")}
              {th("Impr→Bayar", "rate_tayangan_to_pembayaran")}
              {showShopCols && th("AOV", "gmv_avg_per_buyer")}
              {showShopCols && th("Refund", "refund_amount")}
              {showShopCols && th("Pesanan Refund", "pesanan_refund")}
              {showShopCols && th("Pesanan/Klik", "rate_pesanan_per_klik")}
            </tr>
          </thead>
          <tbody>
            {sorted.map((d, i) => (
              <tr key={i} className={`border-b hover:bg-gray-50 ${showShopCols && d.pesanan_refund > 0 ? "bg-red-50" : ""}`}>
                <td className="p-2 font-medium whitespace-nowrap">{d.date}</td>
                <td className="p-2 text-right">{fN(d.tayangan || 0)}</td>
                <td className="p-2 text-right">{fN(d.klik || 0)}</td>
                <td className="p-2 text-right">{fN(d.klik_unik || 0)}</td>
                <td className="p-2 text-right">{fN(d.penonton || 0)}</td>
                <td className="p-2 text-right">{fN(d.pembeli || 0)}</td>
                <td className="p-2 text-right">{fN(d.pesanan_sku || 0)}</td>
                <td className="p-2 text-right">{fN(d.add_to_cart || 0)}</td>
                <td className="p-2 text-right font-bold text-green-700">{fR(d.gmv || 0)}</td>
                <td className="p-2 text-right">{fR(d.gmv_from_content || 0)}</td>
                <td className="p-2 text-right">{fP(d.rate_tayangan_to_klik || 0)}</td>
                <td className="p-2 text-right">{fP(d.rate_klik_to_pembayaran || 0)}</td>
                <td className="p-2 text-right">{fP(d.rate_klik_to_cart || 0)}</td>
                <td className="p-2 text-right">{fP(d.rate_cart_to_pembayaran || 0)}</td>
                <td className="p-2 text-right">{fP(d.rate_tayangan_to_pembayaran || 0)}</td>
                {showShopCols && <td className="p-2 text-right">{fR(d.gmv_avg_per_buyer || 0)}</td>}
                {showShopCols && <td className="p-2 text-right">{fR(d.refund_amount || 0)}</td>}
                {showShopCols && <td className="p-2 text-right">{fN(d.pesanan_refund || 0)}</td>}
                {showShopCols && <td className="p-2 text-right">{fP(d.rate_pesanan_per_klik || 0)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
        {sorted.length === 0 && <p className="text-center text-gray-400 py-8 text-sm">Belum ada data</p>}
      </div>
    </div>
  );
}
