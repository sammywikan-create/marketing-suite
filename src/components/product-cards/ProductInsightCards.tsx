"use client";

interface InsightItem {
  emoji: string;
  text: string;
  type: "success" | "warning" | "danger" | "info";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function generateProductInsights(product: any, storeAvgCTR?: number): InsightItem[] {
  const insights: InsightItem[] = [];
  const ctr = product.rate_tayangan_to_klik || 0;
  const cvr = product.rate_klik_to_pembayaran || 0;
  const cartToPay = product.rate_cart_to_pembayaran || 0;
  const gmv = product.gmv || 0;
  const gmvContent = product.gmv_from_content || 0;
  const tayangan = product.tayangan || 0;
  const pembeli = product.pembeli || 0;

  if (storeAvgCTR && ctr > storeAvgCTR) {
    insights.push({ emoji: "✅", text: `CTR produk ini di atas rata-rata toko (${(ctr * 100).toFixed(2)}% vs ${(storeAvgCTR * 100).toFixed(2)}%)`, type: "success" });
  }
  if (cvr < 0.08) {
    insights.push({ emoji: "⚠️", text: "CVR masih di bawah benchmark (<8%), pertimbangkan cek harga, deskripsi, atau foto produk", type: "warning" });
  }
  if (gmv > 0 && gmvContent / gmv > 0.30) {
    insights.push({ emoji: "🎬", text: `${((gmvContent / gmv) * 100).toFixed(0)}% GMV berasal dari konten kreator — produk ini cocok untuk strategi affiliate`, type: "info" });
  }
  if (cartToPay > 1.0) {
    insights.push({ emoji: "🛒", text: "Rate keranjang→pembayaran >100%, indikasi re-order tinggi — pembeli loyal", type: "success" });
  }
  if (tayangan > 5000 && pembeli === 0) {
    insights.push({ emoji: "❌", text: "Traffic tinggi tapi nol konversi — review listing, harga, dan ketersediaan stok", type: "danger" });
  }
  if (ctr < 0.02 && tayangan > 1000) {
    insights.push({ emoji: "📉", text: "CTR sangat rendah (<2%), coba ganti thumbnail/judul produk", type: "danger" });
  }
  if (ctr >= 0.05 && cvr >= 0.15) {
    insights.push({ emoji: "🏆", text: "Produk ini memiliki CTR dan CVR yang sangat baik — pertimbangkan boost iklan", type: "success" });
  }
  if (insights.length === 0) {
    insights.push({ emoji: "📊", text: "Performa produk dalam rentang normal", type: "info" });
  }

  return insights;
}

export default function ProductInsightCards({ insights }: { insights: InsightItem[] }) {
  const bgMap = {
    success: "bg-green-50 border-green-200",
    warning: "bg-yellow-50 border-yellow-200",
    danger: "bg-red-50 border-red-200",
    info: "bg-blue-50 border-blue-200",
  };

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold">💡 Insight Otomatis</h3>
      {insights.map((ins, i) => (
        <div key={i} className={`rounded-xl border p-3 text-sm flex items-start gap-2 ${bgMap[ins.type]}`}>
          <span>{ins.emoji}</span>
          <span>{ins.text}</span>
        </div>
      ))}
    </div>
  );
}
