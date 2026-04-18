import type { BusinessOverviewData, VideoPerformanceData } from '@/lib/types'
import type { TikTokRow } from '@/utils/gmvAnalyzer'

export function buildDashboardContext(rows: TikTokRow[]): string {
  if (!rows?.length) return ''
  const totalRev = rows.reduce((s, r) => s + r.grossRevenue, 0)
  const totalCost = rows.reduce((s, r) => s + r.cost, 0)
  const totalOrders = rows.reduce((s, r) => s + r.skuOrders, 0)
  const totalImpressions = rows.reduce((s, r) => s + r.impressions, 0)
  const totalClicks = rows.reduce((s, r) => s + r.clicks, 0)
  const roi = totalCost > 0 ? totalRev / totalCost : 0
  const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0
  const cvr = totalClicks > 0 ? (totalOrders / totalClicks) * 100 : 0
  const cpo = totalOrders > 0 ? totalCost / totalOrders : 0
  const videoRows = rows.filter(r => r.creativeType.toLowerCase().includes('video'))
  const videoRev = videoRows.reduce((s, r) => s + r.grossRevenue, 0)
  const videoPct = totalRev > 0 ? (videoRev / totalRev * 100).toFixed(1) : '0'
  const cardPct = totalRev > 0 ? ((totalRev - videoRev) / totalRev * 100).toFixed(1) : '0'
  const winners = rows.filter(r => r.grossRevenue > 0 && r.cost > 0 && r.grossRevenue / r.cost >= 8).length
  const boros = rows.filter(r => r.cost > 0 && (r.grossRevenue <= 0 || r.grossRevenue / r.cost < 2)).length
  return `
HALAMAN: Dashboard Utama
Total Gross Revenue: Rp ${totalRev.toLocaleString('id-ID')}
Total Cost Iklan: Rp ${totalCost.toLocaleString('id-ID')}
Overall ROI: ${roi.toFixed(2)}x
Total Orders: ${totalOrders}
Avg Cost/Order: Rp ${cpo.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
CTR: ${ctr.toFixed(2)}% | CVR: ${cvr.toFixed(2)}%
Revenue Video: ${videoPct}% | Revenue Product Card: ${cardPct}%
Creative WINNER (ROI≥8x): ${winners} | Creative BOROS (ROI<2x): ${boros}
Total Creative Aktif: ${rows.length}
`.trim()
}

export function buildSKUContext(rows: TikTokRow[]): string {
  if (!rows?.length) return ''
  const skuMap = new Map<string, { name: string; rev: number; cost: number; orders: number }>()
  rows.forEach(r => {
    const key = r.campaignName
    const ex = skuMap.get(key) || { name: key, rev: 0, cost: 0, orders: 0 }
    ex.rev += r.grossRevenue
    ex.cost += r.cost
    ex.orders += r.skuOrders
    skuMap.set(key, ex)
  })
  const skus = Array.from(skuMap.values())
  const top5 = skus.filter(s => s.rev > 0).sort((a, b) => b.rev - a.rev).slice(0, 5)
    .map(s => `- ${s.name} | Revenue: Rp ${s.rev.toLocaleString('id-ID')} | ROI: ${s.cost > 0 ? (s.rev / s.cost).toFixed(2) : '∞'}x | Orders: ${s.orders}`)
    .join('\n')
  const borosList = skus.filter(s => s.cost > 0 && (s.rev <= 0 || s.rev / s.cost < 2))
    .sort((a, b) => b.cost - a.cost).slice(0, 5)
    .map(s => `- ${s.name} | Cost: Rp ${s.cost.toLocaleString('id-ID')} | ROI: ${s.cost > 0 ? (s.rev / s.cost).toFixed(2) : '0'}x`)
    .join('\n')
  return `
HALAMAN: SKU Analyzer
TOP 5 SKU (by revenue):
${top5 || 'Tidak ada'}
SKU BOROS (ROI<2x, top 5 by cost):
${borosList || 'Tidak ada'}
Total Campaign: ${skus.length} | Aktif (revenue>0): ${skus.filter(s => s.rev > 0).length}
`.trim()
}

export function buildCreativeContext(rows: TikTokRow[]): string {
  if (!rows?.length) return ''
  const scored = rows.map(r => {
    const roi = r.cost > 0 ? r.grossRevenue / r.cost : 0
    const ctr = r.clickRate * 100
    const cvr = r.conversionRate * 100
    const score = Math.round(roi * 20 + ctr * 10 + cvr * 10 + r.viewRate2s * 5 + r.viewRate6s * 5)
    return { ...r, score, roiCalc: roi }
  })
  const top5 = scored.sort((a, b) => b.score - a.score).slice(0, 5)
    .map(c => `- ${c.videoTitle || c.campaignName} | Score:${c.score} | ROI:${c.roiCalc.toFixed(1)}x | CTR:${(c.clickRate * 100).toFixed(1)}% | CVR:${(c.conversionRate * 100).toFixed(1)}% | 2sVR:${(c.viewRate2s * 100).toFixed(0)}%`)
    .join('\n')
  const winners = scored.filter(c => c.roiCalc >= 8).length
  const stop = scored.filter(c => c.roiCalc < 2 && c.cost > 0).length
  const avgCTR = (rows.reduce((a, c) => a + c.clickRate, 0) / rows.length * 100).toFixed(2)
  const avgCVR = (rows.reduce((a, c) => a + c.conversionRate, 0) / rows.length * 100).toFixed(2)
  return `
HALAMAN: Creative Optimizer
TOP 5 CREATIVE (by score):
${top5}
DISTRIBUSI: WINNER(ROI≥8x)=${winners} | STOP(ROI<2x)=${stop} | Total=${rows.length}
Avg CTR: ${avgCTR}% | Avg CVR: ${avgCVR}%
`.trim()
}

export function buildOverviewContext(data: BusinessOverviewData | null, allMonths?: BusinessOverviewData[]): string {
  if (!data) return ''
  const s = data.summary
  const weekly = data.daily.reduce((acc: any[], day, i) => {
    const week = Math.floor(i / 7)
    if (!acc[week]) acc[week] = { gmv: 0, orders: 0, days: 0 }
    acc[week].gmv += day.gmv
    acc[week].orders += day.orders
    acc[week].days++
    return acc
  }, [])
  const weeklyStr = weekly.map((w, i) =>
    `Minggu ${i + 1}: GMV Rp ${w.gmv.toLocaleString('id-ID')} | Orders ${w.orders}`
  ).join('\n')

  const dailyDetails = data.daily.map(d =>
    `${d.date}: GMV Rp ${d.gmv.toLocaleString('id-ID')} | Orders ${d.orders} | Visitors ${d.uniqueBuyers} | PageViews ${d.pageViews}`
  ).join('\n')

  const multiMonth = allMonths && allMonths.length > 1
    ? '\nMULTI-BULAN:\n' + allMonths.map(m =>
      `- ${m.period.month}: GMV Rp ${m.summary.gmv.toLocaleString('id-ID')} | Orders ${m.summary.orders} | Visitors ${m.summary.uniqueBuyers} | Konversi ${m.summary.conversionRate}%`
    ).join('\n')
    : ''
  return `
HALAMAN: Overview Bisnis | PERIODE: ${data.period.month}
GMV: Rp ${s.gmv.toLocaleString('id-ID')}
Pesanan: ${s.orders} | Pembeli Unik: ${s.uniqueBuyers}
Tayangan: ${s.pageViews.toLocaleString('id-ID')} | Kunjungan: ${s.shopVisits.toLocaleString('id-ID')}
Konversi: ${s.conversionRate}% | Refund: Rp ${s.refund.toLocaleString('id-ID')}

WEEKLY BREAKDOWN:
${weeklyStr}

DAILY DATA:
${dailyDetails}${multiMonth}
`.trim()
}

export function buildVideoContext(data: VideoPerformanceData | null): string {
  if (!data) return ''
  const s = data.summary
  const top3 = [...data.videos]
    .sort((a, b) => b.gmv - a.gmv).slice(0, 3)
    .map(v => `- "${v.videoInfo.substring(0, 50)}" | GMV: Rp ${v.gmv.toLocaleString('id-ID')} | GPM: Rp ${v.gpm.toLocaleString('id-ID')} | CTR: ${v.ctr}% | Watch: ${v.watchRate}%`)
    .join('\n')
  const boostCount = data.videos.filter(v => v.boostCandidate).length
  const creatorStats = Object.entries(
    data.videos.reduce((acc, v) => {
      if (!acc[v.creatorName]) acc[v.creatorName] = { gmv: 0, videos: 0 }
      acc[v.creatorName].gmv += v.gmv
      acc[v.creatorName].videos++
      return acc
    }, {} as Record<string, { gmv: number; videos: number }>)
  ).map(([name, st]) => `${name}: ${st.videos} video, GMV Rp ${st.gmv.toLocaleString('id-ID')}`).join(' | ')
  const funnelVV = s.totalVV || 1
  const funnelPV = s.totalProductViews || 0
  const funnelClk = s.totalProductClicks || 0
  return `HALAMAN: Video Performance | PERIODE: ${data.period}
TOTAL: ${s.totalVideos} video | ${s.totalCreators} kreator
GMV VIDEO: Rp ${s.totalGMV.toLocaleString('id-ID')} | PESANAN: ${s.totalOrders}
AVG GPM: Rp ${Math.round(s.avgGPM).toLocaleString('id-ID')} | AVG CTR: ${s.avgCTR.toFixed(2)}% | AVG CTOR: ${s.avgCTOR.toFixed(2)}% | AVG WATCH RATE: ${s.avgWatchRate.toFixed(2)}%
KANDIDAT BOOST: ${boostCount} video
TOP 3 VIDEO (by GMV):
${top3}
KREATOR: ${creatorStats}
FUNNEL: VV ${s.totalVV.toLocaleString('id-ID')} → Produk Dilihat ${funnelPV.toLocaleString('id-ID')} (${(funnelPV / funnelVV * 100).toFixed(1)}%) → Klik ${funnelClk.toLocaleString('id-ID')} (${funnelPV > 0 ? (funnelClk / funnelPV * 100).toFixed(1) : '0'}%) → Pesanan ${s.totalOrders}`
}
