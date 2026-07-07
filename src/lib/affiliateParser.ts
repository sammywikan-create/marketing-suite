/* eslint-disable @typescript-eslint/no-explicit-any */
import * as XLSX from 'xlsx'
import type {
  AffiliateMonthData,
  AffiliateMonthSummary,
  AffiliateCreatorItem,
  AffiliateCoreSummary,
  AffiliateCoreStats,
} from '@/lib/types'

// ─── HELPERS ──────────────────────────────────────────────
function parseRp(v: any): number {
  if (!v || v === '--' || v === '-') return 0
  if (typeof v === 'number') return isNaN(v) ? 0 : v
  return parseFloat(String(v).replace(/[Rp\s.]/g, '').replace(',', '.')) || 0
}

function parseRpStr(v: any): number {
  if (!v) return 0
  return parseFloat(
    String(v).replace('Rp', '').replace(/\./g, '').replace(',', '.').trim()
  ) || 0
}

function parsePct(v: any): number {
  if (!v || v === '--' || v === '-') return 0
  if (typeof v === 'number') return v
  return parseFloat(String(v).replace('%', '').replace(',', '.').trim()) || 0
}

function getFollowerTier(f: number): AffiliateCreatorItem['creatorTier'] {
  if (f === 0) return 'Unknown'
  if (f >= 1000000) return 'Mega'
  if (f >= 100000) return 'Macro'
  if (f >= 10000) return 'Mid'
  if (f >= 1000) return 'Micro'
  return 'Nano'
}

function getCreatorStatus(gmv: number, refundRate: number): AffiliateCreatorItem['creatorStatus'] {
  if (gmv >= 5000000) return '\u{1F3C6} TOP'
  if (gmv >= 500000) return '\u2705 AKTIF'
  if (gmv > 0) return '\u26A0\uFE0F PERLU DORONG'
  return '\u{1F634} TIDAK AKTIF'
}

function getCreatorScore(gmv: number, videos: number, orders: number, refundRate: number): number {
  const gmvScore = Math.min((gmv / 10000000) * 40, 40)
  const videoScore = Math.min((videos / 30) * 20, 20)
  const orderScore = Math.min((orders / 50) * 20, 20)
  const refundPenalty = Math.min(refundRate * 2, 20)
  return Math.max(0, Math.round(gmvScore + videoScore + orderScore - refundPenalty))
}

async function readXLSX(file: File): Promise<any[][]> {
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  return XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as any[][]
}

// ─── FILE TYPE DETECTION (by header content) ──────────────
export type AffFileType = 'tiktok-core' | 'tiktok-creator' | 'tokopedia-core' | 'tokopedia-creator' | 'unknown'

export function detectFileTypeByHeaders(headers: string[]): AffFileType {
  const h = headers.map((s) => String(s || '').toLowerCase())
  // TikTok Core: "GMV dari kreator" + few columns (summary row)
  if (h.some((x) => x.includes('gmv dari kreator')) && h.length < 25 && !h.some((x) => x.includes('nama kreator')))
    return 'tiktok-core'
  // TikTok Creator: has "Nama Kreator" or "GMV dari kreator" with many rows
  if (h.some((x) => x.includes('nama kreator')) || (h.some((x) => x.includes('gmv dari kreator')) && h.length >= 5 && h.some((x) => x.includes('pesanan') || x.includes('video'))))
    return 'tiktok-creator'
  // Tokopedia Core: "Affiliate GMV" without "Creator Username"
  if (h.some((x) => x.includes('affiliate gmv')) && !h.some((x) => x.includes('creator username')))
    return 'tokopedia-core'
  // Tokopedia Creator: "Creator Username" or "Affiliate GMV" with many columns
  if (h.some((x) => x.includes('creator username')))
    return 'tokopedia-creator'
  return 'unknown'
}

// Also detect by filename for fallback
export function detectFileTypeByName(filename: string): AffFileType {
  const n = filename.toLowerCase()
  if (n.includes('core_metrics') || (n.includes('transaction_analysis') && n.includes('core') && !n.includes('creator')))
    return 'tiktok-core'
  if (n.includes('transaction_analysis') && n.includes('creator'))
    return 'tiktok-creator'
  if (n.includes('core_stats'))
    return 'tokopedia-core'
  if (n.includes('creator_list') && !n.includes('transaction'))
    return 'tokopedia-creator'
  return 'unknown'
}

// ─── PARSE TIKTOK CORE METRICS ────────────────────────────
function parseTikTokCore(rows: any[][]): AffiliateCoreSummary {
  const headers = (rows[0] || []).map((h: any) => String(h || '').toLowerCase())
  const r = rows[1] || []
  const g = (kw: string) => {
    const i = headers.findIndex((h) => h.includes(kw))
    return i >= 0 ? r[i] : null
  }
  return {
    gmvFromCreator: parseRp(g('gmv dari kreator') ?? g('gmv from creator')),
    productsSoldViaAffiliate: Number(g('produk yang terjual melalui afiliasi') ?? g('products sold')) || 0,
    refundAmount: parseRp(g('pengembalian dana') ?? g('refund')),
    productsRefunded: Number(g('produk yang dikembalikan') ?? g('products refunded')) || 0,
    avgDailyBuyers: Number(g('rata-rata pembeli harian') ?? g('avg. daily buyers') ?? g('avg daily buyers')) || 0,
    aov: parseRp(g('aov')),
    videoCount: Number(g('video')) || 0,
    liveStreamCount: Number(g('siaran live') ?? g('live stream')) || 0,
    avgDailyCreatorsWithSales: Number(g('kreator dengan penjualan harian') ?? g('rata-rata kreator dengan penjualan') ?? g('creators with daily sales')) || 0,
    avgDailyCreatorsPosting: Number(g('kreator yang memosting') ?? g('rata-rata kreator yang memosting') ?? g('creators posting')) || 0,
    avgDailyProductsSold: Number(g('produk terjual harian') ?? g('rata-rata produk terjual harian') ?? g('products sold daily')) || 0,
    avgDailyProductsInCollab: Number(g('produk dalam kolaborasi') ?? g('products in collab')) || 0,
    samplesSent: Number(g('sampel terkirim') ?? g('samples sent')) || 0,
    avgDailyLiveWithSales: Number(g('siaran live dengan penjualan') ?? g('rata-rata siaran live dengan penjualan') ?? g('live with sales')) || 0,
    avgDailyVideoWithSales: Number(g('video dengan penjualan harian') ?? g('rata-rata video dengan penjualan') ?? g('video with daily sales')) || 0,
    estimatedCommission: parseRp(g('perkiraan komisi') ?? g('est. commission') ?? g('commission')),
  }
}

// ─── PARSE TIKTOK CREATOR LIST ────────────────────────────
function parseTikTokCreators(rows: any[][]): AffiliateCreatorItem[] {
  const headers = (rows[0] || []).map((h: any) => String(h || '').toLowerCase())

  // g() — cari kolom berdasarkan keyword.
  // excludeKw: opsional, jika diisi maka header yang mengandung excludeKw akan diabaikan.
  // Ini penting agar 'video' tidak match 'gmv dari video', dll.
  const g = (row: any[], kw: string, excludeKw?: string) => {
    const i = headers.findIndex((h) =>
      h.includes(kw) && (!excludeKw || !h.includes(excludeKw))
    )
    return i >= 0 ? row[i] : null
  }

  const dataRows = rows.slice(1).filter((r) => r[0] && String(r[0]).trim())
  return dataRows.map((r) => {
    const gmv        = parseRpStr(g(r, 'gmv dari kreator'))
    const refund     = parseRpStr(g(r, 'pengembalian dana'))
    const commission = parseRpStr(g(r, 'perkiraan komisi'))
    const aov        = parseRpStr(g(r, 'aov'))

    // Bug fix: pakai parseRp (bukan Number()) agar aman untuk cell text dengan
    // thousand separator Indonesia (titik). Number("1.234") = 1.234 (SALAH),
    // parseRp("1.234") = 1234 (BENAR).
    // Bug fix: filter 'gmv' agar 'video' tidak match 'gmv dari video',
    //          dan 'siaran live' tidak match 'gmv dari siaran live'.
    const orders      = Math.round(parseRp(g(r, 'pesanan teratribusi')))
    const videos      = Math.round(parseRp(g(r, 'video',       'gmv')))
    const live        = Math.round(parseRp(g(r, 'siaran live',  'gmv')))
    const itemsSold   = Math.round(parseRp(g(r, 'produk yang terjual melalui afiliasi', 'dikembalikan')))
    const refundItems = Math.round(parseRp(g(r, 'produk yang dikembalikan dananya')))
    const sampleSent  = Math.round(parseRp(g(r, 'sampel terkirim')))

    // Followers: cari kolom 'Pengikut' (TikTok Indonesian export)
    const followersRaw = g(r, 'pengikut') ?? g(r, 'followers') ?? g(r, 'jumlah pengikut')
    const followers = typeof followersRaw === 'number'
      ? Math.round(followersRaw)
      : parseInt(String(followersRaw ?? '0').replace(/[^0-9]/g, '')) || 0

    // Username: kolom 'Nama Kreator' atau fallback ke kolom pertama
    const usernameRaw = g(r, 'nama kreator') ?? String(r[0] ?? '')
    const username = String(usernameRaw).trim()

    // Channel GMV breakdown (kolom opsional, tidak selalu ada di semua export)
    const liveGMV        = parseRpStr(g(r, 'gmv dari siaran live'))
    const videoGMV       = parseRpStr(g(r, 'gmv dari video'))
    const productCardGMV = parseRpStr(g(r, 'gmv kartu produk') ?? g(r, 'product card gmv'))

    const refundRate     = gmv > 0 ? (refund / gmv) * 100 : 0
    const commissionRate = gmv > 0 ? (commission / gmv) * 100 : 0

    return {
      creatorUsername: username,
      affiliateGMV: gmv,
      affiliateLiveGMV: liveGMV,
      affiliateShoppableVideoGMV: videoGMV,
      affiliateProductCardGMV: productCardGMV,
      affiliateProductsSold: itemsSold,
      itemsSold,
      estCommission: commission,
      estFlatFee: 0,
      avgOrderValue: orders > 0 ? gmv / orders : aov,
      affiliateProductShowcase: 0,
      affiliateOrders: orders,
      ctr: 0,
      productImpressions: 0,
      avgAffiliateCustomers: 0,
      affiliateLiveStreams: live,
      affiliateShoppableVideos: videos,
      targetCollabGMV: 0,
      targetCollabEstCommission: 0,
      openCollabGMV: 0,
      openCollabEstCommission: 0,
      affiliateRefundedGMV: refund,
      affiliateItemsRefunded: refundItems,
      affiliateFollowers: followers,
      creatorTier: getFollowerTier(followers),
      refundRate,
      commissionRate,
      gmvPerVideo: videos > 0 ? gmv / videos : 0,
      creatorScore: getCreatorScore(gmv, videos, orders, refundRate),
      creatorStatus: getCreatorStatus(gmv, refundRate),
      sampelTerkirim: sampleSent,
    }
  })
}

// ─── PARSE TOKOPEDIA CORE STATS ───────────────────────────
function parseTokopediaCore(rows: any[][]): AffiliateCoreStats {
  const headers = (rows[0] || []).map((h: any) => String(h || '').trim().toLowerCase())
  const r = rows[1] || []
  const g = (kw: string) => {
    // Exact match first to avoid ambiguity (e.g. 'affiliate gmv' vs 'affiliate shoppable video gmv')
    const exact = headers.findIndex((h) => h === kw)
    if (exact >= 0) return r[exact]
    const i = headers.findIndex((h) => h.includes(kw))
    return i >= 0 ? r[i] : null
  }
  return {
    affiliateGMV: parseRp(g('affiliate gmv')),
    affiliateLiveGMV: parseRp(g('affiliate live gmv')),
    affiliateShoppableVideoGMV: parseRp(g('affiliate shoppable video gmv')),
    affiliateProductCardGMV: parseRp(g('affiliate product card gmv')),
    itemsSold: parseRp(g('items sold')),
    estCommission: parseRp(g('est. commission')),
    estFlatFee: parseRp(g('est. flat fee')),
    affiliateCollaborations: parseRp(g('affiliate collaborations')),
    affiliateLiveStreams: parseRp(g('affiliate live streams')),
    affiliateShoppableVideos: parseRp(g('affiliate shoppable videos')),
    affiliateRefundedGMV: parseRp(g('affiliate refunded gmv')),
    affiliateItemsRefunded: parseRp(g('affiliate items refunded')),
  }
}

// ─── PARSE TOKOPEDIA CREATOR LIST ─────────────────────────
function parseTokopediaCreators(rows: any[][]): AffiliateCreatorItem[] {
  const headers = (rows[0] || []).map((h: any) => String(h || '').trim().toLowerCase())
  const g = (row: any[], kw: string) => {
    // Exact match first to avoid ambiguity
    const exact = headers.findIndex((h) => h === kw)
    if (exact >= 0) return row[exact]
    const i = headers.findIndex((h) => h.includes(kw))
    return i >= 0 ? row[i] : null
  }
  const dataRows = rows.slice(1).filter((r) => r[0] && String(r[0]).trim())
  return dataRows.map((r) => {
    const gmv = parseRp(g(r, 'affiliate gmv'))
    const liveGMV = parseRp(g(r, 'affiliate live gmv'))
    const videoGMV = parseRp(g(r, 'affiliate shoppable video gmv'))
    const productCardGMV = parseRp(g(r, 'affiliate product card gmv'))
    const refund = parseRp(g(r, 'affiliate refunded gmv'))
    const refundItems = parseRp(g(r, 'affiliate items refunded'))
    const commission = parseRp(g(r, 'est. commission'))
    const orders = parseRp(g(r, 'affiliate orders'))
    const videos = parseRp(g(r, 'affiliate shoppable videos'))
    const live = parseRp(g(r, 'affiliate live streams'))
    const itemsSold = parseRp(g(r, 'items sold'))
    const followersRaw = g(r, 'affiliate followers')
    const followers = typeof followersRaw === 'number'
      ? Math.round(followersRaw)
      : parseInt(String(followersRaw || '0').replace(/[^0-9]/g, '')) || 0
    const ctrRaw = g(r, 'ctr')
    const ctr = parseFloat(String(ctrRaw || '0').replace('%', '')) || 0
    const productImpressions = parseRp(g(r, 'product impressions'))
    const avgCustomers = parseRp(g(r, 'avg. affiliate customers'))
    const targetCollabGMV = parseRp(g(r, 'target collaboration gmv'))
    const openCollabGMV = parseRp(g(r, 'open collaboration gmv'))
    const refundRate = gmv > 0 ? (refund / gmv) * 100 : 0
    const commissionRate = gmv > 0 ? (commission / gmv) * 100 : 0
    return {
      creatorUsername: String(g(r, 'creator username') || r[0] || '').trim(),
      affiliateGMV: gmv,
      affiliateLiveGMV: liveGMV,
      affiliateShoppableVideoGMV: videoGMV,
      affiliateProductCardGMV: productCardGMV,
      affiliateProductsSold: itemsSold,
      itemsSold,
      estCommission: commission,
      estFlatFee: parseRp(g(r, 'est. flat fee')),
      avgOrderValue: orders > 0 ? gmv / orders : 0,
      affiliateProductShowcase: parseRp(g(r, 'affiliate product showcase')),
      affiliateOrders: orders,
      ctr,
      productImpressions,
      avgAffiliateCustomers: avgCustomers,
      affiliateLiveStreams: live,
      affiliateShoppableVideos: videos,
      targetCollabGMV,
      targetCollabEstCommission: parseRp(g(r, 'target collaboration est. commission')),
      openCollabGMV,
      openCollabEstCommission: parseRp(g(r, 'open collaboration est. commission')),
      affiliateRefundedGMV: refund,
      affiliateItemsRefunded: refundItems,
      affiliateFollowers: followers,
      creatorTier: getFollowerTier(followers),
      refundRate,
      commissionRate,
      gmvPerVideo: videos > 0 ? gmv / videos : 0,
      creatorScore: getCreatorScore(gmv, videos, orders, refundRate),
      creatorStatus: getCreatorStatus(gmv, refundRate),
      sampelTerkirim: 0,
    }
  })
}

// ─── BUILD SUMMARY FROM CREATORS ──────────────────────────
function buildSummary(
  creators: AffiliateCreatorItem[],
  coreSummary?: AffiliateCoreSummary,
  coreStats?: AffiliateCoreStats,
): AffiliateMonthSummary {
  const active = creators.filter((c) => c.affiliateGMV > 0)
  const creatorsGMV = creators.reduce((a, c) => a + c.affiliateGMV, 0)
  const creatorsRefund = creators.reduce((a, c) => a + c.affiliateRefundedGMV, 0)
  const creatorsCommission = creators.reduce((a, c) => a + c.estCommission, 0)

  // GMV: ketika kedua sumber ada (coreSummary dari Transaction Analysis DAN
  // coreStats dari Core Stats / analitik toko), ambil nilai terbesar.
  // Core Stats sering mencakup periode lebih panjang / data lebih lengkap,
  // sehingga nilainya bisa lebih besar dan lebih akurat.
  const coreGMV = coreSummary?.gmvFromCreator ?? 0
  const statsGMV = coreStats?.affiliateGMV ?? 0
  let rawTotalGMV: number
  if (coreGMV > 0 && statsGMV > 0) {
    rawTotalGMV = Math.max(coreGMV, statsGMV)
  } else if (coreGMV > 0) {
    rawTotalGMV = coreGMV
  } else if (statsGMV > 0) {
    rawTotalGMV = statsGMV
  } else {
    rawTotalGMV = creatorsGMV
  }

  // Refund: sama — ambil terbesar dari kedua sumber
  const coreRefund = coreSummary?.refundAmount ?? 0
  const statsRefund = coreStats?.affiliateRefundedGMV ?? 0
  const totalRefund = (coreRefund > 0 && statsRefund > 0) ? Math.max(coreRefund, statsRefund) : coreRefund > 0 ? coreRefund : statsRefund > 0 ? statsRefund : creatorsRefund

  const totalOrders = creators.reduce((a, c) => a + c.affiliateOrders, 0)

  // Commission: sama — ambil terbesar dari kedua sumber
  const coreComm = coreSummary?.estimatedCommission ?? 0
  const statsComm = coreStats?.estCommission ?? 0
  const totalCommission = (coreComm > 0 && statsComm > 0) ? Math.max(coreComm, statsComm) : coreComm > 0 ? coreComm : statsComm > 0 ? statsComm : creatorsCommission

  const topCreator = [...active].sort((a, b) => b.affiliateGMV - a.affiliateGMV)[0]

  const videoGMV = (coreStats?.affiliateShoppableVideoGMV ?? 0) > 0 ? coreStats!.affiliateShoppableVideoGMV : creators.reduce((a, c) => a + c.affiliateShoppableVideoGMV, 0)
  const liveGMV = (coreStats?.affiliateLiveGMV ?? 0) > 0 ? coreStats!.affiliateLiveGMV : creators.reduce((a, c) => a + c.affiliateLiveGMV, 0)
  const productCardGMV = (coreStats?.affiliateProductCardGMV ?? 0) > 0 ? coreStats!.affiliateProductCardGMV : creators.reduce((a, c) => a + c.affiliateProductCardGMV, 0)

  // totalGMV: jika ada channel GMV breakdown dan rawTotalGMV = 0 (tidak ada data dari
  // core file maupun kreator), gunakan channelSum sebagai fallback.
  // Jangan gunakan Math.max karena bisa mengelembungkan GMV jika ada inconsistency data.
  const channelSum = videoGMV + liveGMV + productCardGMV
  const totalGMV = rawTotalGMV > 0 ? rawTotalGMV : channelSum

  // ── CREATOR ACTIVITY BREAKDOWN ──
  // Kreator yang membuat konten (video atau live), terlepas dari GMV
  const videoCreators = creators.filter((c) => c.affiliateShoppableVideos > 0).length
  const liveCreators = creators.filter((c) => c.affiliateLiveStreams > 0).length
  const bothVideoAndLive = creators.filter((c) => c.affiliateShoppableVideos > 0 && c.affiliateLiveStreams > 0).length
  // activePromoters = kreator yang punya video ATAU live (inclusion-exclusion)
  const activePromoters = videoCreators + liveCreators - bothVideoAndLive

  return {
    totalCreators: creators.length,
    activeCreators: active.length,
    inactiveCreators: creators.length - active.length,
    activeRate: creators.length > 0 ? (active.length / creators.length) * 100 : 0,
    activePromoters,
    videoCreators,
    liveCreators,
    bothVideoAndLive,
    totalGMV,
    totalOrders,
    totalVideos: creators.length > 0 ? creators.reduce((a, c) => a + c.affiliateShoppableVideos, 0) : (coreSummary?.videoCount || 0),
    totalLive: creators.length > 0 ? creators.reduce((a, c) => a + c.affiliateLiveStreams, 0) : (coreSummary?.liveStreamCount || 0),
    totalCommission,
    totalRefundedGMV: totalRefund,
    refundRate: totalGMV > 0 ? (totalRefund / totalGMV) * 100 : 0,
    avgAOV: totalOrders > 0 ? totalGMV / totalOrders : 0,
    avgGMVPerCreator: active.length > 0 ? totalGMV / active.length : 0,
    topCreator: topCreator?.creatorUsername || '',
    topCreatorGMV: topCreator?.affiliateGMV || 0,
    nanoCount: active.filter((c) => c.creatorTier === 'Nano').length,
    microCount: active.filter((c) => c.creatorTier === 'Micro').length,
    midCount: active.filter((c) => c.creatorTier === 'Mid').length,
    macroCount: active.filter((c) => c.creatorTier === 'Macro').length,
    megaCount: active.filter((c) => c.creatorTier === 'Mega').length,
    videoGMV,
    liveGMV,
    productCardGMV,
  }
}
// ─── MERGE TWO CREATOR LISTS ──────────────────────────────
// Ketika user upload file TikTok Creator List DAN Tokopedia Creator List,
// keduanya berisi data kreator yang sama dari sudut pandang berbeda.
// Tokopedia biasanya punya roster lengkap (semua join), TikTok punya detail video.
// Fungsi ini merge by username, ambil Math.max untuk tiap field numerik.
function mergeCreatorLists(
  listA: AffiliateCreatorItem[],
  listB: AffiliateCreatorItem[],
): AffiliateCreatorItem[] {
  if (!listA.length && !listB.length) return []
  if (!listA.length) return listB
  if (!listB.length) return listA

  // Base = list terbesar (biasanya Tokopedia, punya semua kreator termasuk inaktif)
  const base = listA.length >= listB.length ? listA : listB
  const supplement = listA.length >= listB.length ? listB : listA

  const merged = new Map<string, AffiliateCreatorItem>()
  for (const c of base) {
    merged.set(c.creatorUsername.toLowerCase().trim(), { ...c })
  }

  for (const c of supplement) {
    const key = c.creatorUsername.toLowerCase().trim()
    const existing = merged.get(key)
    if (existing) {
      // Merge: ambil nilai terbesar dari kedua sumber
      existing.affiliateGMV = Math.max(existing.affiliateGMV, c.affiliateGMV)
      existing.affiliateShoppableVideos = Math.max(existing.affiliateShoppableVideos, c.affiliateShoppableVideos)
      existing.affiliateLiveStreams = Math.max(existing.affiliateLiveStreams, c.affiliateLiveStreams)
      existing.affiliateOrders = Math.max(existing.affiliateOrders, c.affiliateOrders)
      existing.affiliateShoppableVideoGMV = Math.max(existing.affiliateShoppableVideoGMV, c.affiliateShoppableVideoGMV)
      existing.affiliateLiveGMV = Math.max(existing.affiliateLiveGMV, c.affiliateLiveGMV)
      existing.affiliateProductCardGMV = Math.max(existing.affiliateProductCardGMV, c.affiliateProductCardGMV)
      existing.affiliateRefundedGMV = Math.max(existing.affiliateRefundedGMV, c.affiliateRefundedGMV)
      existing.affiliateItemsRefunded = Math.max(existing.affiliateItemsRefunded, c.affiliateItemsRefunded)
      existing.estCommission = Math.max(existing.estCommission, c.estCommission)
      existing.itemsSold = Math.max(existing.itemsSold, c.itemsSold)
      existing.affiliateProductsSold = Math.max(existing.affiliateProductsSold, c.affiliateProductsSold)
      existing.affiliateFollowers = Math.max(existing.affiliateFollowers, c.affiliateFollowers)
      existing.sampelTerkirim = Math.max(existing.sampelTerkirim || 0, c.sampelTerkirim || 0)
      // Recalculate derived fields
      existing.refundRate = existing.affiliateGMV > 0 ? (existing.affiliateRefundedGMV / existing.affiliateGMV) * 100 : 0
      existing.commissionRate = existing.affiliateGMV > 0 ? (existing.estCommission / existing.affiliateGMV) * 100 : 0
      existing.gmvPerVideo = existing.affiliateShoppableVideos > 0 ? existing.affiliateGMV / existing.affiliateShoppableVideos : 0
      existing.avgOrderValue = existing.affiliateOrders > 0 ? existing.affiliateGMV / existing.affiliateOrders : 0
      existing.creatorTier = getFollowerTier(existing.affiliateFollowers)
      existing.creatorScore = getCreatorScore(existing.affiliateGMV, existing.affiliateShoppableVideos, existing.affiliateOrders, existing.refundRate)
      existing.creatorStatus = getCreatorStatus(existing.affiliateGMV, existing.refundRate)
    } else {
      // Kreator hanya ada di supplement — tambahkan
      merged.set(key, { ...c })
    }
  }

  return Array.from(merged.values())
}

// ─── MAIN: PARSE FILES AND BUILD MONTH DATA ───────────────
export async function parseAffiliateFiles(
  files: File[],
  period: string,
  platform: 'tiktok' | 'tokopedia',
): Promise<AffiliateMonthData> {
  let coreSummary: AffiliateCoreSummary | undefined
  let coreStats: AffiliateCoreStats | undefined
  let tiktokCreators: AffiliateCreatorItem[] = []
  let tokopediaCreators: AffiliateCreatorItem[] = []

  for (const file of files) {
    const rows = await readXLSX(file)
    const headers = (rows[0] || []).map((h: any) => String(h || ''))
    let fileType = detectFileTypeByHeaders(headers)
    if (fileType === 'unknown') fileType = detectFileTypeByName(file.name)

    if (fileType === 'tiktok-core') coreSummary = parseTikTokCore(rows)
    else if (fileType === 'tiktok-creator') tiktokCreators = parseTikTokCreators(rows)
    else if (fileType === 'tokopedia-core') coreStats = parseTokopediaCore(rows)
    else if (fileType === 'tokopedia-creator') tokopediaCreators = parseTokopediaCreators(rows)
  }

  // Merge kreator dari kedua sumber (jika keduanya ada)
  const creators = mergeCreatorLists(tiktokCreators, tokopediaCreators)

  const periodLabel = (() => {
    try {
      const d = new Date(period + '-01')
      return d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
    } catch {
      return period
    }
  })()

  const periodRaw = (() => {
    try {
      const d = new Date(period + '-01')
      const y = d.getFullYear()
      const m = d.getMonth()
      const last = new Date(y, m + 1, 0).getDate()
      const mm = String(m + 1).padStart(2, '0')
      return `${y}-${mm}-01 ~ ${y}-${mm}-${String(last).padStart(2, '0')}`
    } catch {
      return period
    }
  })()

  const source: AffiliateMonthData['source'] =
    coreSummary && coreStats ? 'combined' : coreStats ? 'analitik' : 'transaction'

  return {
    period: periodLabel,
    periodRaw,
    storeId: '',
    source,
    platform,
    coreSummary,
    coreStats,
    creators,
    summary: buildSummary(creators, coreSummary, coreStats),
  }
}
