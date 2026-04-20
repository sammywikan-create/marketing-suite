// Product score calculation (0-100)

export interface ScoreBreakdown {
  ctr: number;
  cvr: number;
  klikToCart: number;
  volume: number;
  content: number;
  total: number;
  label: string;
  emoji: string;
}

function dimScore(value: number, thresholds: [number, number, number]): number {
  // thresholds: [high, mid, low] → score 100, 80, 60, else 30
  if (value >= thresholds[0]) return 100;
  if (value >= thresholds[1]) return 80;
  if (value >= thresholds[2]) return 60;
  return 30;
}

export function calculateProductScore(
  ctr: number,           // as decimal e.g. 0.0672
  cvr: number,           // as decimal e.g. 0.1576
  klikToCart: number,     // as decimal e.g. 0.1218
  gmv: number,           // product GMV
  avgGmvStore: number,   // average GMV across all products in store
  gmvFromContent: number // GMV from content
): ScoreBreakdown {
  const ctrScore = dimScore(ctr, [0.07, 0.05, 0.03]);
  const cvrScore = dimScore(cvr, [0.20, 0.15, 0.08]);
  const cartScore = dimScore(klikToCart, [0.15, 0.10, 0.05]);
  const volScore = Math.min(100, avgGmvStore > 0 ? (gmv / avgGmvStore) * 60 : 0);
  const contentScore = gmv > 0 ? Math.min(100, (gmvFromContent / gmv) * 200) : 0;

  const total = Math.round(
    ctrScore * 0.20 +
    cvrScore * 0.30 +
    cartScore * 0.20 +
    volScore * 0.20 +
    contentScore * 0.10
  );

  let label: string;
  let emoji: string;
  if (total >= 80) { label = "Top Performer"; emoji = "🏆"; }
  else if (total >= 60) { label = "Potensial"; emoji = "✅"; }
  else if (total >= 40) { label = "Perlu Optimasi"; emoji = "⚡"; }
  else if (total >= 20) { label = "Perlu Perhatian"; emoji = "⚠️"; }
  else { label = "Kritis"; emoji = "🔴"; }

  return {
    ctr: Math.round(ctrScore),
    cvr: Math.round(cvrScore),
    klikToCart: Math.round(cartScore),
    volume: Math.round(volScore),
    content: Math.round(contentScore),
    total,
    label,
    emoji,
  };
}
