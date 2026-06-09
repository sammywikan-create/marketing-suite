/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase, isSupabaseConfigured } from './supabase'
import type {
  AffiliateMonthSummary,
  AffiliateCreatorItem,
  AffiliateCoreSummary,
} from '@/lib/types'

function requireSupabase() {
  if (!isSupabaseConfigured) {
    throw new Error('__SUPABASE_NOT_CONFIGURED__')
  }
}

// ─── STORES ──────────────────────────────────────────────
export interface DbStore {
  id: string
  name: string
  color: string
  avatar: string
  created_at: string
}

export async function getStores(): Promise<DbStore[]> {
  requireSupabase()
  const { data, error } = await supabase
    .from('stores')
    .select('*')
    .order('created_at')
  if (error) throw error
  return (data || []).map((s: any) => ({
    id: s.id,
    name: s.name,
    color: s.color || '#3B82F6',
    avatar: s.avatar || s.name?.[0]?.toUpperCase() || 'S',
    created_at: s.created_at,
  }))
}

export async function createStore(
  name: string,
  color: string,
  avatar: string,
): Promise<DbStore> {
  requireSupabase()
  const { data, error } = await supabase
    .from('stores')
    .insert({ name, color, avatar })
    .select()
    .single()
  if (error) throw error
  return {
    id: data.id,
    name: data.name,
    color: data.color || color,
    avatar: data.avatar || avatar,
    created_at: data.created_at,
  }
}

export async function updateStoreDb(
  id: string,
  updates: { name?: string; color?: string; avatar?: string },
) {
  requireSupabase()
  const { error } = await supabase.from('stores').update(updates).eq('id', id)
  if (error) throw error
}

export async function deleteStoreDb(id: string) {
  requireSupabase()
  const { error } = await supabase.from('stores').delete().eq('id', id)
  if (error) throw error
}

// ─── AFFILIATE SUMMARIES ─────────────────────────────────
function summaryToRow(
  storeId: string,
  period: string,
  platform: string,
  summary: AffiliateMonthSummary,
  coreSummary?: AffiliateCoreSummary,
) {
  return {
    store_id: storeId,
    period,
    platform,
    total_gmv: Math.round(summary.totalGMV),
    live_gmv: Math.round(summary.liveGMV),
    video_gmv: Math.round(summary.videoGMV),
    product_card_gmv: Math.round(summary.productCardGMV),
    total_refund: Math.round(summary.totalRefundedGMV),
    refund_rate: summary.refundRate,
    total_creators: summary.totalCreators,
    active_creators: summary.activeCreators,
    active_rate: summary.activeRate,
    total_videos: summary.totalVideos,
    total_live: summary.totalLive,
    total_orders: summary.totalOrders,
    avg_aov: Math.round(summary.avgAOV),
    total_commission: Math.round(summary.totalCommission),
    commission_rate:
      summary.totalGMV > 0
        ? (summary.totalCommission / summary.totalGMV) * 100
        : 0,
    total_sample_sent: coreSummary?.samplesSent || 0,
    avg_daily_buyers: coreSummary?.avgDailyBuyers ?? null,
    avg_daily_selling_creators: coreSummary?.avgDailyCreatorsWithSales ?? null,
    avg_daily_posting_creators: coreSummary?.avgDailyCreatorsPosting ?? null,
    avg_daily_products_sold: coreSummary?.avgDailyProductsSold ?? null,
    avg_daily_video_with_sales: coreSummary?.avgDailyVideoWithSales ?? null,
    avg_daily_live_with_sales: coreSummary?.avgDailyLiveWithSales ?? null,
  }
}

function rowToSummary(r: any): AffiliateMonthSummary {
  return {
    totalCreators: r.total_creators || 0,
    activeCreators: r.active_creators || 0,
    inactiveCreators: (r.total_creators || 0) - (r.active_creators || 0),
    activeRate: r.active_rate || 0,
    totalGMV: r.total_gmv || 0,
    totalOrders: r.total_orders || 0,
    totalVideos: r.total_videos || 0,
    totalLive: r.total_live || 0,
    totalCommission: r.total_commission || 0,
    totalRefundedGMV: r.total_refund || 0,
    refundRate: r.refund_rate || 0,
    avgAOV: r.avg_aov || 0,
    avgGMVPerCreator:
      r.active_creators > 0 ? (r.total_gmv || 0) / r.active_creators : 0,
    topCreator: '',
    topCreatorGMV: 0,
    nanoCount: 0,
    microCount: 0,
    midCount: 0,
    macroCount: 0,
    megaCount: 0,
    videoGMV: r.video_gmv || 0,
    liveGMV: r.live_gmv || 0,
    productCardGMV: r.product_card_gmv || 0,
  }
}

export async function saveAffiliateSummary(
  storeId: string,
  summary: AffiliateMonthSummary,
  period: string,
  platform: string,
  coreSummary?: AffiliateCoreSummary,
) {
  requireSupabase()
  const row = summaryToRow(storeId, period, platform, summary, coreSummary)
  const { error } = await supabase
    .from('affiliate_summaries')
    .upsert(row, { onConflict: 'store_id,period,platform' })
  if (error) throw error
}

export async function loadAffiliateSummaries(
  storeId: string,
): Promise<
  {
    period: string
    platform: string
    summary: AffiliateMonthSummary
    coreSummary: Partial<AffiliateCoreSummary> | null
  }[]
> {
  requireSupabase()
  const { data, error } = await supabase
    .from('affiliate_summaries')
    .select('*')
    .eq('store_id', storeId)
    .order('period')
  if (error) throw error
  return (data || []).map((r: any) => ({
    period: r.period,
    platform: r.platform,
    summary: rowToSummary(r),
    coreSummary:
      r.avg_daily_buyers != null
        ? {
            gmvFromCreator: r.total_gmv || 0,
            productsSoldViaAffiliate: 0,
            refundAmount: r.total_refund || 0,
            productsRefunded: 0,
            avgDailyBuyers: r.avg_daily_buyers || 0,
            aov: r.avg_aov || 0,
            videoCount: r.total_videos || 0,
            liveStreamCount: r.total_live || 0,
            avgDailyCreatorsWithSales: r.avg_daily_selling_creators || 0,
            avgDailyCreatorsPosting: r.avg_daily_posting_creators || 0,
            avgDailyProductsSold: r.avg_daily_products_sold || 0,
            avgDailyProductsInCollab: 0,
            samplesSent: r.total_sample_sent || 0,
            avgDailyLiveWithSales: r.avg_daily_live_with_sales || 0,
            avgDailyVideoWithSales: r.avg_daily_video_with_sales || 0,
            estimatedCommission: r.total_commission || 0,
          }
        : null,
  }))
}

export async function deleteAffiliateSummary(
  storeId: string,
  period: string,
  platform: string,
) {
  requireSupabase()
  const { error } = await supabase
    .from('affiliate_summaries')
    .delete()
    .eq('store_id', storeId)
    .eq('period', period)
    .eq('platform', platform)
  if (error) throw error
}

// ─── AFFILIATE CREATORS ──────────────────────────────────
function creatorToRow(
  storeId: string,
  period: string,
  platform: string,
  c: AffiliateCreatorItem,
) {
  return {
    store_id: storeId,
    period,
    platform,
    username: c.creatorUsername,
    gmv: Math.round(c.affiliateGMV),
    live_gmv: Math.round(c.affiliateLiveGMV),
    video_gmv: Math.round(c.affiliateShoppableVideoGMV),
    product_card_gmv: Math.round(c.affiliateProductCardGMV),
    refund: Math.round(c.affiliateRefundedGMV),
    refund_rate: c.refundRate,
    refund_items: c.affiliateItemsRefunded,
    orders: c.affiliateOrders,
    items_sold: c.itemsSold,
    aov: Math.round(c.avgOrderValue),
    videos: c.affiliateShoppableVideos,
    live_streams: c.affiliateLiveStreams,
    followers: c.affiliateFollowers || 0,
    tier: c.creatorTier || 'Nano',
    commission: Math.round(c.estCommission),
    ctr: c.ctr || 0,
    product_impressions: c.productImpressions || 0,
    avg_customers: c.avgAffiliateCustomers || 0,
    target_collab_gmv: Math.round(c.targetCollabGMV || 0),
    open_collab_gmv: Math.round(c.openCollabGMV || 0),
    sample_sent: c.sampelTerkirim || 0,
    status:
      c.refundRate > 30 && c.affiliateGMV > 0
        ? 'high-refund'
        : c.affiliateGMV >= 5000000
          ? 'top'
          : c.affiliateGMV >= 500000
            ? 'active'
            : c.affiliateGMV > 0
              ? 'needs-push'
              : 'inactive',
  }
}

function rowToCreator(r: any): AffiliateCreatorItem {
  const gmv = r.gmv || 0
  const refund = r.refund || 0
  const orders = r.orders || 0
  const videos = r.videos || 0
  const commission = r.commission || 0
  const followers = r.followers || 0
  const refundRate = gmv > 0 ? (refund / gmv) * 100 : 0
  const commissionRate = gmv > 0 ? (commission / gmv) * 100 : 0

  const getFollowerTier = (
    f: number,
  ): AffiliateCreatorItem['creatorTier'] => {
    if (f === 0) return 'Unknown'
    if (f >= 1000000) return 'Mega'
    if (f >= 100000) return 'Macro'
    if (f >= 10000) return 'Mid'
    if (f >= 1000) return 'Micro'
    return 'Nano'
  }

  const getStatus = (): AffiliateCreatorItem['creatorStatus'] => {
    if (gmv >= 5000000) return '\u{1F3C6} TOP'
    if (gmv >= 500000) return '\u2705 AKTIF'
    if (gmv > 0) return '\u26A0\uFE0F PERLU DORONG'
    return '\u{1F634} TIDAK AKTIF'
  }

  const gmvScore = Math.min((gmv / 10000000) * 40, 40)
  const videoScore = Math.min((videos / 30) * 20, 20)
  const orderScore = Math.min((orders / 50) * 20, 20)
  const refundPenalty = Math.min(refundRate * 2, 20)
  const creatorScore = Math.max(
    0,
    Math.round(gmvScore + videoScore + orderScore - refundPenalty),
  )

  return {
    creatorUsername: r.username || '',
    affiliateGMV: gmv,
    affiliateLiveGMV: r.live_gmv || 0,
    affiliateShoppableVideoGMV: r.video_gmv || 0,
    affiliateProductCardGMV: r.product_card_gmv || 0,
    affiliateProductsSold: r.items_sold || 0,
    itemsSold: r.items_sold || 0,
    estCommission: commission,
    estFlatFee: 0,
    avgOrderValue: r.aov || (orders > 0 ? gmv / orders : 0),
    affiliateProductShowcase: 0,
    affiliateOrders: orders,
    ctr: r.ctr || 0,
    productImpressions: r.product_impressions || 0,
    avgAffiliateCustomers: r.avg_customers || 0,
    affiliateLiveStreams: r.live_streams || 0,
    affiliateShoppableVideos: videos,
    targetCollabGMV: r.target_collab_gmv || 0,
    targetCollabEstCommission: 0,
    openCollabGMV: r.open_collab_gmv || 0,
    openCollabEstCommission: 0,
    affiliateRefundedGMV: refund,
    affiliateItemsRefunded: r.refund_items || 0,
    affiliateFollowers: followers,
    creatorTier: (r.tier as AffiliateCreatorItem['creatorTier']) || getFollowerTier(followers),
    refundRate,
    commissionRate,
    gmvPerVideo: videos > 0 ? gmv / videos : 0,
    creatorScore,
    creatorStatus: getStatus(),
    sampelTerkirim: r.sample_sent || 0,
  }
}

export async function saveAffiliateCreators(
  storeId: string,
  period: string,
  platform: string,
  creators: AffiliateCreatorItem[],
) {
  requireSupabase()
  // Delete existing data for this store/period/platform
  await supabase
    .from('affiliate_creators')
    .delete()
    .eq('store_id', storeId)
    .eq('period', period)
    .eq('platform', platform)

  // Insert in batches of 500
  const BATCH = 500
  for (let i = 0; i < creators.length; i += BATCH) {
    const batch = creators
      .slice(i, i + BATCH)
      .map((c) => creatorToRow(storeId, period, platform, c))
    const { error } = await supabase.from('affiliate_creators').insert(batch)
    if (error) throw error
  }
}

export async function loadAffiliateCreators(
  storeId: string,
  period?: string,
  platform?: string,
): Promise<AffiliateCreatorItem[]> {
  requireSupabase()
  let query = supabase
    .from('affiliate_creators')
    .select('*')
    .eq('store_id', storeId)
  if (period) query = query.eq('period', period)
  if (platform) query = query.eq('platform', platform)
  const { data, error } = await query.order('gmv', { ascending: false })
  if (error) throw error
  return (data || []).map(rowToCreator)
}

export async function deleteAffiliateCreatorsDb(
  storeId: string,
  period: string,
  platform: string,
) {
  requireSupabase()
  const { error } = await supabase
    .from('affiliate_creators')
    .delete()
    .eq('store_id', storeId)
    .eq('period', period)
    .eq('platform', platform)
  if (error) throw error
}

// ─── GMV MAX CREATIVES ───────────────────────────────────
export async function saveGMVMaxData(
  storeId: string,
  period: string,
  creatives: any[],
) {
  requireSupabase()
  await supabase
    .from('gmv_max_creatives')
    .delete()
    .eq('store_id', storeId)
    .eq('period', period)
  const BATCH = 500
  for (let i = 0; i < creatives.length; i += BATCH) {
    const batch = creatives.slice(i, i + BATCH).map((c) => ({
      store_id: storeId,
      period,
      campaign_name: c.campaign,
      creative_type: c.type,
      tiktok_account: c.account,
      status: c.status,
      cost: c.cost,
      orders: c.orders,
      cpo: c.cpo,
      revenue: c.revenue,
      roi: c.roi,
      impressions: c.impressions,
      clicks: c.clicks,
      ctr: c.ctr,
      cvr: c.cvr,
      view_2s: c.view2s,
      view_6s: c.view6s,
    }))
    await supabase.from('gmv_max_creatives').insert(batch)
  }
}

export async function loadGMVMaxData(storeId: string, period?: string) {
  requireSupabase()
  let query = supabase
    .from('gmv_max_creatives')
    .select('*')
    .eq('store_id', storeId)
  if (period) query = query.eq('period', period)
  const { data, error } = await query
  if (error) throw error
  return data || []
}

// ─── OVERVIEW DATA ───────────────────────────────────────
export async function saveOverviewDataDb(
  storeId: string,
  period: string,
  row: {
    gmv: number
    refund: number
    sold: number
    buyers: number
    views: number
    visits: number
    orders: number
    cvr: number
  },
) {
  requireSupabase()
  const { error } = await supabase.from('overview_data').upsert(
    { store_id: storeId, period, ...row },
    { onConflict: 'store_id,period' },
  )
  if (error) throw error
}

export async function loadOverviewDataDb(storeId: string) {
  requireSupabase()
  const { data, error } = await supabase
    .from('overview_data')
    .select('*')
    .eq('store_id', storeId)
    .order('period')
  if (error) throw error
  return data || []
}

// ─── VIDEO PERFORMANCE ───────────────────────────────────
export async function saveVideoPerformanceDb(
  storeId: string,
  period: string,
  videos: any[],
) {
  requireSupabase()
  await supabase
    .from('video_performance')
    .delete()
    .eq('store_id', storeId)
    .eq('period', period)
  const BATCH = 500
  for (let i = 0; i < videos.length; i += BATCH) {
    const batch = videos.slice(i, i + BATCH).map((v) => ({
      store_id: storeId,
      period,
      creator_name: v.creatorName,
      video_id: v.videoId,
      vv: v.vv,
      likes: v.likes,
      comments: v.comments,
      shares: v.shares,
      new_followers: v.newFollowers,
      gmv: v.gmv,
      gpm: v.gpm,
      ctr: v.ctr,
      ctor: v.ctor,
      watch_rate: v.watchRate,
      orders: v.orders || v.videoOrders,
    }))
    await supabase.from('video_performance').insert(batch)
  }
}

export async function loadVideoPerformanceDb(
  storeId: string,
  period?: string,
) {
  requireSupabase()
  let query = supabase
    .from('video_performance')
    .select('*')
    .eq('store_id', storeId)
  if (period) query = query.eq('period', period)
  const { data, error } = await query
  if (error) throw error
  return data || []
}

// ─── LAPORAN HARIAN DATA ─────────────────────────────────
// Uses localStorage as primary storage (works without migration).
// Falls back to Supabase if the table exists.
const LH_STORAGE_KEY = 'ms_laporan_harian_'

function lhLocalSave(period: string, dataJson: any) {
  if (typeof window === 'undefined') return
  const index = JSON.parse(localStorage.getItem(LH_STORAGE_KEY + '_index') || '{}')
  index[period] = new Date().toISOString()
  localStorage.setItem(LH_STORAGE_KEY + '_index', JSON.stringify(index))
  localStorage.setItem(LH_STORAGE_KEY + period, JSON.stringify(dataJson))
}

function lhLocalLoad(period: string): any | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(LH_STORAGE_KEY + period)
  if (!raw) return null
  const index = JSON.parse(localStorage.getItem(LH_STORAGE_KEY + '_index') || '{}')
  const parsed = JSON.parse(raw)
  return { ...parsed, _saved_at: index[period] || null }
}

function lhLocalList(): { period: string; saved_at: string }[] {
  if (typeof window === 'undefined') return []
  const index = JSON.parse(localStorage.getItem(LH_STORAGE_KEY + '_index') || '{}')
  return Object.entries(index)
    .map(([period, saved_at]) => ({ period, saved_at: saved_at as string }))
    .sort((a, b) => b.period.localeCompare(a.period))
}

function lhLocalDelete(period: string) {
  if (typeof window === 'undefined') return
  const index = JSON.parse(localStorage.getItem(LH_STORAGE_KEY + '_index') || '{}')
  delete index[period]
  localStorage.setItem(LH_STORAGE_KEY + '_index', JSON.stringify(index))
  localStorage.removeItem(LH_STORAGE_KEY + period)
}

export async function saveLaporanHarianData(
  period: string,
  dataJson: any,
) {
  // Always save to localStorage (instant, no migration needed)
  lhLocalSave(period, dataJson)

  // Also try Supabase if configured
  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase
        .from('laporan_harian_data')
        .upsert(
          { period, data_json: dataJson, saved_at: new Date().toISOString() },
          { onConflict: 'period' },
        )
      if (error) console.warn('[laporan-harian] Supabase save skipped:', error.message)
    } catch (e) {
      console.warn('[laporan-harian] Supabase save skipped:', e)
    }
  }
}

export async function loadLaporanHarianData(
  period: string,
): Promise<any | null> {
  // Try Supabase first
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('laporan_harian_data')
        .select('data_json, saved_at')
        .eq('period', period)
        .single()
      if (!error && data) return { ...data.data_json, _saved_at: data.saved_at }
    } catch {}
  }
  // Fallback to localStorage
  return lhLocalLoad(period)
}

export async function listLaporanHarianPeriods(): Promise<
  { period: string; saved_at: string }[]
> {
  const localList = lhLocalList()

  // Try Supabase
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('laporan_harian_data')
        .select('period, saved_at')
        .order('period', { ascending: false })
      if (!error && data && data.length > 0) {
        // Merge: Supabase + local-only periods
        const supaSet = new Set(data.map((d: any) => d.period))
        const merged = [...data]
        for (const l of localList) {
          if (!supaSet.has(l.period)) merged.push(l)
        }
        return merged.sort((a, b) => b.period.localeCompare(a.period))
      }
    } catch {}
  }
  return localList
}

export async function deleteLaporanHarianData(period: string) {
  lhLocalDelete(period)

  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase
        .from('laporan_harian_data')
        .delete()
        .eq('period', period)
      if (error) console.warn('[laporan-harian] Supabase delete skipped:', error.message)
    } catch {}
  }
}

// ─── LIVE ANALYTICS ──────────────────────────────────────
export async function saveLiveCoreStats(
  rows: Omit<import('@/hooks/useLiveAnalytics').LiveCoreStat, 'id'>[],
) {
  requireSupabase()
  if (!rows.length) return
  const BATCH = 200
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH)
    const { error } = await supabase
      .from('live_core_stats')
      .upsert(batch, { onConflict: 'store_id,date' })
    if (error) throw error
  }
}

export async function deleteLiveData(
  storeId: string,
  month?: string, // "2026-01" or undefined for all
) {
  requireSupabase()
  // Delete core stats
  let qStats = supabase.from('live_core_stats').delete().eq('store_id', storeId)
  if (month) qStats = qStats.gte('date', `${month}-01`).lte('date', `${month}-31`)
  const { error: e1 } = await qStats
  if (e1) throw e1

  // Delete sessions
  let qSess = supabase.from('live_sessions').delete().eq('store_id', storeId)
  if (month) qSess = qSess.gte('session_date', `${month}-01`).lte('session_date', `${month}-31`)
  const { error: e2 } = await qSess
  if (e2) throw e2
}

export async function saveLiveSessions(
  rows: Omit<import('@/hooks/useLiveAnalytics').LiveSession, 'id'>[],
) {
  requireSupabase()
  if (!rows.length) return
  // Delete existing sessions for same store + dates to avoid duplicates
  const storeId = rows[0].store_id
  const dates = [...new Set(rows.map((r) => r.session_date))]
  for (const date of dates) {
    await supabase
      .from('live_sessions')
      .delete()
      .eq('store_id', storeId)
      .eq('session_date', date)
  }
  // Insert in batches
  const BATCH = 200
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH)
    const { error } = await supabase.from('live_sessions').insert(batch)
    if (error) throw error
  }
}

// ─── DAILY NOTES (LAPORAN HARIAN) ────────────────────────
// Dual-write: localStorage (instant) + Supabase (persistent).
// Same pattern as saveLaporanHarianData.
const DN_KEY = 'ms_daily_notes_'

export interface DailyNote {
  date: string      // e.g. "1 Apr"
  period: string    // e.g. "2026-04"
  text: string
  tag?: string      // e.g. "flash-sale", "campaign", "libur", "evaluasi", "catatan"
  mood?: string     // e.g. "great", "good", "neutral", "bad"
  created_at: string
}

function dnLocalSave(period: string, notes: Record<string, DailyNote>) {
  if (typeof window === 'undefined') return
  localStorage.setItem(DN_KEY + period, JSON.stringify(notes))
}

function dnLocalLoad(period: string): Record<string, DailyNote> {
  if (typeof window === 'undefined') return {}
  const raw = localStorage.getItem(DN_KEY + period)
  if (!raw) return {}
  try { return JSON.parse(raw) } catch { return {} }
}

export async function saveDailyNote(period: string, date: string, text: string, tag?: string, mood?: string) {
  if (typeof window === 'undefined') return
  // Always save to localStorage first (instant)
  const existing = dnLocalLoad(period)
  if (text.trim()) {
    existing[date] = { date, period, text: text.trim(), tag: tag || 'catatan', mood: mood || 'neutral', created_at: new Date().toISOString() }
  } else {
    delete existing[date]
  }
  dnLocalSave(period, existing)

  // Also try Supabase if configured
  if (isSupabaseConfigured) {
    try {
      if (text.trim()) {
        await supabase
          .from('daily_notes')
          .upsert(
            { period, date, text: text.trim(), tag: tag || 'catatan', mood: mood || 'neutral', created_at: new Date().toISOString() },
            { onConflict: 'period,date' },
          )
      } else {
        await supabase
          .from('daily_notes')
          .delete()
          .eq('period', period)
          .eq('date', date)
      }
    } catch (e) {
      console.warn('[daily-notes] Supabase save skipped:', e)
    }
  }
}

export async function loadDailyNotes(period: string): Promise<Record<string, DailyNote>> {
  // Try Supabase first
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('daily_notes')
        .select('*')
        .eq('period', period)
      if (!error && data && data.length > 0) {
        const result: Record<string, DailyNote> = {}
        for (const row of data) {
          result[row.date] = {
            date: row.date,
            period: row.period,
            text: row.text,
            tag: row.tag || 'catatan',
            mood: row.mood || 'neutral',
            created_at: row.created_at,
          }
        }
        // Also update localStorage as cache
        dnLocalSave(period, result)
        return result
      }
    } catch {
      // Supabase failed, fall through to localStorage
    }
  }
  // Fallback to localStorage
  return dnLocalLoad(period)
}

export async function deleteDailyNote(period: string, date: string) {
  if (typeof window === 'undefined') return
  // Always delete from localStorage
  const existing = dnLocalLoad(period)
  delete existing[date]
  dnLocalSave(period, existing)

  // Also try Supabase
  if (isSupabaseConfigured) {
    try {
      await supabase
        .from('daily_notes')
        .delete()
        .eq('period', period)
        .eq('date', date)
    } catch (e) {
      console.warn('[daily-notes] Supabase delete skipped:', e)
    }
  }
}

