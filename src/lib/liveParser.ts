/* eslint-disable @typescript-eslint/no-explicit-any */
import * as XLSX from "xlsx";
import type { LiveCoreStat, LiveSession } from "@/hooks/useLiveAnalytics";

// ─── HELPERS ──────────────────────────────────────────────
function parseRp(v: any): number {
  if (!v || v === "--" || v === "-") return 0;
  if (typeof v === "number") return isNaN(v) ? 0 : v;
  return (
    parseFloat(
      String(v)
        .replace(/[Rp\s.]/g, "")
        .replace(",", ".")
    ) || 0
  );
}

function parsePct(v: any): number {
  if (!v || v === "--" || v === "-") return 0;
  if (typeof v === "number") return v;
  return parseFloat(String(v).replace("%", "").replace(",", ".").trim()) || 0;
}

function parseDuration(v: any): number {
  if (!v) return 0;
  if (typeof v === "number") {
    // Could be minutes directly, or Excel time serial (fraction of a day)
    if (v < 1) return Math.round(v * 24 * 60); // Excel serial → minutes
    if (v > 500) return Math.round(v / 60); // seconds → minutes
    return v; // already minutes
  }
  const s = String(v).trim();
  // "1h 30m" or "1j 30m"
  const hm = s.match(/(\d+)\s*[hj]\s*(\d+)\s*m/i);
  if (hm) return parseInt(hm[1]) * 60 + parseInt(hm[2]);
  // "01:30:00" (HH:MM:SS)
  const hms = s.match(/(\d+):(\d+):(\d+)/);
  if (hms) return parseInt(hms[1]) * 60 + parseInt(hms[2]) + parseInt(hms[3]) / 60;
  // "01:30" (HH:MM)
  const hmOnly = s.match(/(\d+):(\d+)/);
  if (hmOnly) return parseInt(hmOnly[1]) * 60 + parseInt(hmOnly[2]);
  // "90 menit" or "90m"
  const mOnly = s.match(/(\d+)\s*m/i);
  if (mOnly) return parseInt(mOnly[1]);
  return parseFloat(s) || 0;
}

function parseWatchTime(v: any): number {
  if (!v) return 0;
  if (typeof v === "number") return v;
  const s = String(v).trim();
  // "1m 30s" or "1 menit 30 detik"
  const ms = s.match(/(\d+)\s*m[a-z]*\s*(\d+)\s*[sd]/i);
  if (ms) return parseInt(ms[1]) * 60 + parseInt(ms[2]);
  // "01:30" (MM:SS)
  const mmss = s.match(/(\d+):(\d+)/);
  if (mmss) return parseInt(mmss[1]) * 60 + parseInt(mmss[2]);
  // "90s" or "90 detik"
  const sOnly = s.match(/(\d+)\s*[sd]/i);
  if (sOnly) return parseInt(sOnly[1]);
  return parseFloat(s) || 0;
}

function parseDateTime(v: any): string {
  if (!v) return new Date().toISOString();
  if (typeof v === "number") {
    // Excel date serial number
    const d = XLSX.SSF.parse_date_code(v);
    return new Date(d.y, d.m - 1, d.d, d.H || 0, d.M || 0, d.S || 0).toISOString();
  }
  const s = String(v).trim();
  // Try direct parse
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString();
  // "20/04/2026 14:30" (DD/MM/YYYY HH:mm)
  const dmyHm = s.match(/(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})\s+(\d{1,2}):(\d{2})/);
  if (dmyHm) {
    return new Date(
      parseInt(dmyHm[3]),
      parseInt(dmyHm[2]) - 1,
      parseInt(dmyHm[1]),
      parseInt(dmyHm[4]),
      parseInt(dmyHm[5])
    ).toISOString();
  }
  return new Date().toISOString();
}

// ─── COLUMN MAPPING ──────────────────────────────────────
function findCol(headers: string[], ...keywords: string[]): number {
  const lower = headers.map((h) => String(h || "").toLowerCase());
  for (const kw of keywords) {
    const idx = lower.findIndex((h) => h.includes(kw.toLowerCase()));
    if (idx >= 0) return idx;
  }
  return -1;
}

function getVal(row: any[], headers: string[], ...keywords: string[]): any {
  const idx = findCol(headers, ...keywords);
  return idx >= 0 ? row[idx] : null;
}

// ─── MAIN PARSER ─────────────────────────────────────────
export async function parseLiveExcel(
  file: File,
  storeId: string
): Promise<{ sessions: Omit<LiveSession, "id">[]; coreStats: Omit<LiveCoreStat, "id">[] }> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array", cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" }) as any[][];

  if (rows.length < 2) {
    throw new Error("File kosong atau tidak memiliki data.");
  }

  const headers = (rows[0] || []).map((h: any) => String(h || ""));

  // Validate this is a live session file
  const hasLiveCol =
    findCol(headers, "waktu live", "live time", "started at") >= 0 ||
    findCol(headers, "nilai bruto", "gmv", "gross merchandise") >= 0 ||
    findCol(headers, "durasi", "duration") >= 0;

  if (!hasLiveCol) {
    throw new Error(
      "File tidak mengandung data LIVE yang valid. Pastikan file berasal dari export TikTok LIVE Analytics."
    );
  }

  const sessions: Omit<LiveSession, "id">[] = [];

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.every((c: any) => !c && c !== 0)) continue; // skip empty rows

    const startedAtRaw = getVal(r, headers, "waktu live", "live time", "started at", "waktu mulai");
    const startedAt = parseDateTime(startedAtRaw);
    const sessionDate = startedAt.slice(0, 10); // "YYYY-MM-DD"

    const gmv = parseRp(getVal(r, headers, "nilai bruto barang dagangan", "nilai bruto", "gmv dari live", "gmv live", "gross merchandise"));
    const gmvEarned = parseRp(getVal(r, headers, "gmv yang didapat", "gmv earned", "gmv yang diperoleh"));
    const durationRaw = getVal(r, headers, "durasi", "duration");
    const durationMinutes = parseDuration(durationRaw);

    const session: Omit<LiveSession, "id"> = {
      store_id: storeId,
      creator_id: String(getVal(r, headers, "id kreator", "creator id") || ""),
      creator_name: String(getVal(r, headers, "nama panggilan", "nickname", "nama kreator") || ""),
      creator_username: String(getVal(r, headers, "kreator", "creator username", "username") || ""),
      started_at: startedAt,
      session_date: sessionDate,
      duration_minutes: durationMinutes,
      gmv,
      gmv_earned: gmvEarned || gmv,
      avg_order_value: parseRp(getVal(r, headers, "harga rata-rata", "avg order", "aov", "rata-rata harga")),
      products_added: Number(getVal(r, headers, "produk yang ditambahkan", "products added", "produk ditambahkan")) || 0,
      products_sold: Number(getVal(r, headers, "produk terjual", "products sold")) || 0,
      sku_orders_created: Number(getVal(r, headers, "pesanan sku yang dibuat", "sku orders created")) || 0,
      sku_orders_live: Number(getVal(r, headers, "pesanan sku dari live", "sku orders live", "pesanan sku live")) || 0,
      products_sold_live: Number(getVal(r, headers, "produk yang terjual dari live", "products sold live", "produk terjual live")) || 0,
      unique_buyers: Number(getVal(r, headers, "pembeli unik", "unique buyers", "pembeli")) || 0,
      order_per_click: parsePct(getVal(r, headers, "rasio pesanan per klik", "order per click", "pesanan per klik")),
      unique_viewers: Number(getVal(r, headers, "penonton", "unique viewers", "penonton unik")) || 0,
      total_views: Number(getVal(r, headers, "live stream dilihat", "total views", "stream views", "tayangan")) || 0,
      product_views: Number(getVal(r, headers, "produk dilihat", "product views", "tampilan produk")) || 0,
      product_clicks: Number(getVal(r, headers, "klik produk", "product clicks")) || 0,
      ctr: parsePct(getVal(r, headers, "ctr")),
      avg_watch_time: parseWatchTime(getVal(r, headers, "durasi menonton rata-rata", "avg watch time", "rata-rata menonton")),
      comments: Number(getVal(r, headers, "komentar", "comments")) || 0,
      shares: Number(getVal(r, headers, "live dibagikan", "shares", "dibagikan")) || 0,
      likes: Number(getVal(r, headers, "suka pada live", "likes", "suka")) || 0,
      new_followers: Number(getVal(r, headers, "pengikut baru", "new followers", "followers baru")) || 0,
      is_valid_session: durationMinutes >= 5,
      has_gmv: gmv > 0,
    };

    sessions.push(session);
  }

  // ─── Derive daily core stats from sessions ────────────
  const dailyMap: Record<string, Omit<LiveCoreStat, "id">> = {};

  sessions.forEach((s) => {
    const date = s.session_date;
    if (!dailyMap[date]) {
      dailyMap[date] = {
        store_id: storeId,
        date,
        gmv_live: 0,
        gmv_earned: 0,
        gpm: 0,
        sessions_total: 0,
        sessions_with_gmv: 0,
        products_sold: 0,
        sku_orders: 0,
        buyers: 0,
        impressions: 0,
        ctr_live: 0,
        order_per_click: 0,
        avg_watch_time: 0,
      };
    }
    const d = dailyMap[date];
    d.gmv_live += s.gmv;
    d.gmv_earned += s.gmv_earned;
    d.sessions_total += 1;
    if (s.has_gmv) d.sessions_with_gmv += 1;
    d.products_sold += s.products_sold;
    d.sku_orders += s.sku_orders_created;
    d.buyers += s.unique_buyers;
    d.impressions += s.total_views;
  });

  // Compute averages
  const coreStats = Object.values(dailyMap).map((d) => {
    const daySessions = sessions.filter((s) => s.session_date === d.date && s.is_valid_session);
    const n = daySessions.length || 1;
    d.gpm = d.impressions > 0 ? (d.gmv_live / d.impressions) * 1000 : 0;
    d.ctr_live = daySessions.reduce((a, s) => a + s.ctr, 0) / n;
    d.order_per_click = daySessions.reduce((a, s) => a + s.order_per_click, 0) / n;
    d.avg_watch_time = daySessions.reduce((a, s) => a + s.avg_watch_time, 0) / n;
    return d;
  });

  return { sessions, coreStats };
}
