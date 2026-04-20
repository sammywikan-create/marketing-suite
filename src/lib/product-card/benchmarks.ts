// Benchmark thresholds for Product Card & Shop Tab metrics

export interface BenchmarkLevel {
  green: number;   // >= this is good
  yellow: number;  // >= this is okay
  // < yellow is red
}

// Kartu Produk benchmarks
export const BENCH_PRODUCT_CARD = {
  ctr:              { green: 0.05,  yellow: 0.03  } as BenchmarkLevel, // CTR (Tayangan→Klik)
  cvr:              { green: 0.15,  yellow: 0.08  } as BenchmarkLevel, // CVR (Klik→Pembayaran)
  klikToCart:        { green: 0.10,  yellow: 0.05  } as BenchmarkLevel, // Klik→Keranjang
  cartToPayment:    { green: 0.80,  yellow: 0.40  } as BenchmarkLevel, // Keranjang→Pembayaran
  imprToPayment:    { green: 0.01,  yellow: 0.005 } as BenchmarkLevel, // Impresi→Pembayaran
};

// Shop Tab benchmarks (higher conversion expected)
export const BENCH_SHOP_TAB = {
  ctr:              { green: 0.08,  yellow: 0.05  } as BenchmarkLevel,
  cvr:              { green: 0.20,  yellow: 0.10  } as BenchmarkLevel,
  klikToCart:        { green: 0.12,  yellow: 0.06  } as BenchmarkLevel,
  cartToPayment:    { green: 0.80,  yellow: 0.40  } as BenchmarkLevel,
  pesananPerKlik:   { green: 0.20,  yellow: 0.10  } as BenchmarkLevel,
};

export function getBenchmarkColor(value: number, bench: BenchmarkLevel): string {
  if (value >= bench.green) return "green";
  if (value >= bench.yellow) return "yellow";
  return "red";
}

export function getBenchmarkEmoji(value: number, bench: BenchmarkLevel): string {
  if (value >= bench.green) return "🟢";
  if (value >= bench.yellow) return "🟡";
  return "🔴";
}

export function getBenchmarkLabel(value: number, bench: BenchmarkLevel): string {
  if (value >= bench.green) return "Baik";
  if (value >= bench.yellow) return "Cukup";
  return "Rendah";
}

export function getBenchmarkBgClass(value: number, bench: BenchmarkLevel): string {
  if (value >= bench.green) return "bg-green-50 text-green-700 border-green-200";
  if (value >= bench.yellow) return "bg-yellow-50 text-yellow-700 border-yellow-200";
  return "bg-red-50 text-red-700 border-red-200";
}
