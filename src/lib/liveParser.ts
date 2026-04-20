/* eslint-disable @typescript-eslint/no-explicit-any */
import * as XLSX from "xlsx";
import type { LiveCoreStat, LiveSession } from "@/hooks/useLiveAnalytics";

// ─── SAFE TYPE HELPERS ───────────────────────────────────
function safeInt(val: any): number {
  if (val === null || val === undefined || val === "" || val === "--" || val === "-") return 0;
  const n = parseFloat(String(val).replace(/[^0-9.\-]/g, ""));
  return isNaN(n) ? 0 : Math.round(n);
}

function safeDecimal(val: any, decimals = 2): number {
  if (val === null || val === undefined || val === "" || val === "--" || val === "-") return 0;
  const n = parseFloat(String(val).replace(/[^0-9.\-]/g, ""));
  return isNaN(n) ? 0 : parseFloat(n.toFixed(decimals));
}

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
    if (v < 1) return safeDecimal(v * 24 * 60); // Excel serial → minutes
    if (v > 500) return safeDecimal(v / 60);     // seconds → minutes
    return safeDecimal(v);
  }
  const s = String(v).trim();
  const hm = s.match(/(\d+)\s*[hj]\s*(\d+)\s*m/i);
  if (hm) return parseInt(hm[1]) * 60 + parseInt(hm[2]);
  const hms = s.match(/(\d+):(\d+):(\d+)/);
  if (hms) return parseInt(hms[1]) * 60 + parseInt(hms[2]) + parseInt(hms[3]) / 60;
  const hmOnly = s.match(/(\d+):(\d+)/);
  if (hmOnly) return parseInt(hmOnly[1]) * 60 + parseInt(hmOnly[2]);
  const mOnly = s.match(/(\d+)\s*m/i);
  if (mOnly) return parseInt(mOnly[1]);
  return safeDecimal(s);
}

function parseWatchTime(v: any): number {
  if (!v) return 0;
  if (typeof v === "number") return safeDecimal(v);
  const s = String(v).trim();
  const ms = s.match(/(\d+)\s*m[a-z]*\s*(\d+)\s*[sd]/i);
  if (ms) return parseInt(ms[1]) * 60 + parseInt(ms[2]);
  const mmss = s.match(/(\d+):(\d+)/);
  if (mmss) return parseInt(mmss[1]) * 60 + parseInt(mmss[2]);
  const sOnly = s.match(/(\d+)\s*[sd]/i);
  if (sOnly) return parseInt(sOnly[1]);
  return safeDecimal(s);
}

// ─── ROBUST DATE/TIME PARSER ─────────────────────────────
// Handles: "2026/02/28/ 13:00", "2026/02/28 13:00", "2026-02-28 13:00",
//          Excel date serial, Date objects, ISO strings
function parseWaktuLive(v: any): string {
  if (!v) return new Date().toISOString();

  // Date object (from cellDates: true)
  if (v instanceof Date && !isNaN(v.getTime())) return v.toISOString();

  if (typeof v === "number") {
    const d = XLSX.SSF.parse_date_code(v);
    return new Date(d.y, d.m - 1, d.d, d.H || 0, d.M || 0, d.S || 0).toISOString();
  }

  const raw = String(v).trim();

  // Clean TikTok's weird format: "2026/02/28/ 13:00" (trailing slash)
  const cleaned = raw
    .replace(/\/+\s*/g, "/")  // multiple slashes → single
    .replace(/\/+$/, "")      // trailing slash
    .trim();

  // Pattern: YYYY/MM/DD HH:mm or YYYY-MM-DD HH:mm
  const patterns = [
    /(\d{4})[/\-](\d{2})[/\-](\d{2})[/\s]+(\d{2}):(\d{2})/,
    /(\d{4})[/\-](\d{2})[/\-](\d{2})/,
  ];
  for (const p of patterns) {
    const m = cleaned.match(p);
    if (m) {
      return new Date(
        parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3]),
        parseInt(m[4] || "0"), parseInt(m[5] || "0"), 0
      ).toISOString();
    }
  }

  // DD/MM/YYYY HH:mm
  const dmyHm = cleaned.match(/(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})\s+(\d{1,2}):(\d{2})/);
  if (dmyHm) {
    return new Date(
      parseInt(dmyHm[3]), parseInt(dmyHm[2]) - 1, parseInt(dmyHm[1]),
      parseInt(dmyHm[4]), parseInt(dmyHm[5])
    ).toISOString();
  }

  // Fallback: direct parse
  const d = new Date(cleaned);
  if (!isNaN(d.getTime())) return d.toISOString();

  console.warn("[parseWaktuLive] Cannot parse:", raw);
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

// ─── HEADER ROW DETECTION ────────────────────────────────
function findHeaderRow(rows: any[][]): number {
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const rowStr = (rows[i] || []).map((h: any) => String(h || "").toLowerCase());
    const joined = rowStr.join("§");

    // Live Sessions file: must have kreator + waktu/durasi
    if (
      (joined.includes("id kreator") || joined.includes("creator id")) &&
      (joined.includes("waktu live") || joined.includes("waktu") || joined.includes("started"))
    ) return i;

    // Also detect by durasi + suka/komentar (secondary check)
    if (
      rowStr.some((h) => h === "durasi" || h === "duration") &&
      (joined.includes("suka pada live") || joined.includes("komentar") || joined.includes("penonton"))
    ) return i;
  }
  return -1;
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

  console.log("[LiveParser] Total rows:", rows.length);
  console.log("[LiveParser] First 4 rows sample:", rows.slice(0, 4).map(r => (r || []).slice(0, 5)));

  const headerIdx = findHeaderRow(rows);

  if (headerIdx < 0) {
    const sampleHeaders = rows.slice(0, 4).flat().filter(Boolean).slice(0, 8).join(", ");
    throw new Error(
      `Format file tidak dikenali.\n\n` +
      `Header terdeteksi: "${sampleHeaders}"\n\n` +
      `File yang didukung: Export LIVE dari TikTok Seller Center ` +
      `(harus ada kolom: ID Kreator, Waktu Live, Durasi, dll).`
    );
  }

  const headers = (rows[headerIdx] || []).map((h: any) => String(h || ""));
  console.log("[LiveParser] Header row index:", headerIdx, "Headers:", headers.slice(0, 8));

  const sessions: Omit<LiveSession, "id">[] = [];

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.every((c: any) => !c && c !== 0)) continue;

    const startedAtRaw = getVal(r, headers, "waktu live", "live time", "started at", "waktu mulai", "waktu");
    const startedAt = parseWaktuLive(startedAtRaw);
    const sessionDate = startedAt.slice(0, 10);

    const gmv = parseRp(getVal(r, headers, "nilai bruto barang dagangan", "nilai bruto", "gmv dari live", "gmv live", "gross merchandise"));
    const gmvEarned = parseRp(getVal(r, headers, "gmv yang didapat", "gmv earned", "gmv yang diperoleh"));
    const durationMinutes = parseDuration(getVal(r, headers, "durasi", "duration"));

    const session: Omit<LiveSession, "id"> = {
      store_id: storeId,
      creator_id: String(getVal(r, headers, "id kreator", "creator id") || ""),
      creator_name: String(getVal(r, headers, "nama panggilan", "nickname", "nama kreator") || ""),
      creator_username: String(getVal(r, headers, "kreator", "creator username", "username") || ""),
      started_at: startedAt,
      session_date: sessionDate,
      duration_minutes: safeDecimal(durationMinutes),
      gmv: safeInt(gmv),
      gmv_earned: safeInt(gmvEarned || gmv),
      avg_order_value: safeInt(parseRp(getVal(r, headers, "harga rata-rata", "avg order", "aov", "rata-rata harga"))),
      products_added: safeInt(getVal(r, headers, "produk yang ditambahkan", "products added", "produk ditambahkan")),
      products_sold: safeInt(getVal(r, headers, "produk terjual", "products sold")),
      sku_orders_created: safeInt(getVal(r, headers, "pesanan sku yang dibuat", "sku orders created")),
      sku_orders_live: safeInt(getVal(r, headers, "pesanan sku dari live", "sku orders live", "pesanan sku live")),
      products_sold_live: safeInt(getVal(r, headers, "produk yang terjual dari live", "products sold live", "produk terjual live")),
      unique_buyers: safeInt(getVal(r, headers, "pembeli unik", "unique buyers", "pembeli")),
      order_per_click: safeDecimal(parsePct(getVal(r, headers, "rasio pesanan per klik", "order per click", "pesanan per klik")), 4),
      unique_viewers: safeInt(getVal(r, headers, "penonton", "unique viewers", "penonton unik")),
      total_views: safeInt(getVal(r, headers, "live stream dilihat", "total views", "stream views", "tayangan")),
      product_views: safeInt(getVal(r, headers, "produk dilihat", "product views", "tampilan produk")),
      product_clicks: safeInt(getVal(r, headers, "klik produk", "product clicks")),
      ctr: safeDecimal(parsePct(getVal(r, headers, "ctr")), 4),
      avg_watch_time: safeDecimal(parseWatchTime(getVal(r, headers, "durasi menonton rata-rata", "avg watch time", "rata-rata menonton"))),
      comments: safeInt(getVal(r, headers, "komentar", "comments")),
      shares: safeInt(getVal(r, headers, "live dibagikan", "shares", "dibagikan")),
      likes: safeInt(getVal(r, headers, "suka pada live", "likes", "suka")),
      new_followers: safeInt(getVal(r, headers, "pengikut baru", "new followers", "followers baru")),
      is_valid_session: durationMinutes >= 5,
      has_gmv: gmv > 0,
    };

    sessions.push(session);
  }

  console.log("[LiveParser] Parsed sessions:", sessions.length);

  // ─── Derive daily core stats from sessions ────────────
  const dailyMap: Record<string, Omit<LiveCoreStat, "id">> = {};

  sessions.forEach((s) => {
    const date = s.session_date;
    if (!dailyMap[date]) {
      dailyMap[date] = {
        store_id: storeId, date,
        gmv_live: 0, gmv_earned: 0, gpm: 0,
        sessions_total: 0, sessions_with_gmv: 0,
        products_sold: 0, sku_orders: 0, buyers: 0,
        impressions: 0, ctr_live: 0, order_per_click: 0, avg_watch_time: 0,
      };
    }
    const d = dailyMap[date];
    d.gmv_live += s.gmv || 0;
    d.gmv_earned += s.gmv_earned || 0;
    d.sessions_total += 1;
    if (s.has_gmv) d.sessions_with_gmv += 1;
    d.products_sold += s.products_sold || 0;
    d.sku_orders += s.sku_orders_created || 0;
    d.buyers += s.unique_buyers || 0;
    d.impressions += s.total_views || 0;
  });

  // Compute averages & ensure correct types for DB
  const coreStats = Object.values(dailyMap).map((d) => {
    const daySessions = sessions.filter((s) => s.session_date === d.date && s.is_valid_session);
    const n = daySessions.length || 1;
    // INT fields
    d.gmv_live = safeInt(d.gmv_live);
    d.gmv_earned = safeInt(d.gmv_earned);
    d.products_sold = safeInt(d.products_sold);
    d.sku_orders = safeInt(d.sku_orders);
    d.buyers = safeInt(d.buyers);
    d.impressions = safeInt(d.impressions);
    // DECIMAL fields
    d.gpm = safeDecimal(d.impressions > 0 ? (d.gmv_live / d.impressions) * 1000 : 0);
    d.ctr_live = safeDecimal(daySessions.reduce((a, s) => a + s.ctr, 0) / n, 4);
    d.order_per_click = safeDecimal(daySessions.reduce((a, s) => a + s.order_per_click, 0) / n, 4);
    d.avg_watch_time = safeDecimal(daySessions.reduce((a, s) => a + s.avg_watch_time, 0) / n);
    return d;
  });

  console.log("[LiveParser] Core stats days:", coreStats.length);
  return { sessions, coreStats };
}
