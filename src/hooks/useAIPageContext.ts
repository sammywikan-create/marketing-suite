'use client'
import { useMemo } from 'react'
import { useGMVStore } from '@/lib/gmvStore'
import { useStoreManager } from '@/store/useStoreManager'
import { useOKRStore } from '@/store/useOKRStore'
import { DEPARTMENT_CONFIG } from '@/lib/okrTemplates'
import type { OKRDepartment } from '@/lib/types'
import {
  buildDashboardContext,
  buildSKUContext,
  buildCreativeContext,
  buildOverviewContext,
  buildVideoContext,
} from '@/lib/ai/aiContext'

function fmtOKRVal(v: number | null, satuan: string): string {
  if (v === null) return '-'
  if (satuan === 'Rp') {
    if (v >= 1e9) return `Rp ${(v / 1e9).toFixed(1)}M`
    if (v >= 1e6) return `Rp ${(v / 1e6).toFixed(1)}Jt`
    return `Rp ${v.toLocaleString('id-ID')}`
  }
  return v.toLocaleString('id-ID')
}

export function useAIPageContext(aiPage: string): string {
  const { data } = useGMVStore()
  const { getActiveStore, stores, activeStoreId } = useStoreManager()
  const { getLatestReport, monthlyReports } = useOKRStore()
  const activeStore = getActiveStore()
  const storeName = activeStore?.name || 'Unknown'

  return useMemo(() => {
    const prefix = `TOKO AKTIF: ${storeName}\n`
    let ctx = ''
    switch (aiPage) {
      case 'dashboard':
        ctx = buildDashboardContext(data)
        break
      case 'sku':
        ctx = buildSKUContext(data)
        break
      case 'creative':
        ctx = buildCreativeContext(data)
        break
      case 'overview': {
        const allMonths = activeStore?.overviewData || []
        if (allMonths.length === 0) return ''
        const latest = allMonths[allMonths.length - 1]
        ctx = buildOverviewContext(latest, allMonths)
        break
      }
      case 'video-performance': {
        const vidData = activeStore?.videoData || []
        if (vidData.length === 0) return ''
        ctx = buildVideoContext(vidData[vidData.length - 1])
        break
      }
      case 'affiliate': {
        const affData = activeStore?.affiliateData || []
        if (affData.length === 0) return ''
        const latest = affData[affData.length - 1]
        const s = latest.summary
        const top5 = [...latest.creators]
          .sort((a, b) => b.affiliateGMV - a.affiliateGMV)
          .slice(0, 5)
          .map((c) => `@${c.creatorUsername} (${c.creatorTier}): GMV Rp ${c.affiliateGMV.toLocaleString('id-ID')} | Orders ${c.affiliateOrders} | Videos ${c.affiliateShoppableVideos} | Refund ${c.refundRate.toFixed(1)}%`)
          .join('\n')
        const trendStr = affData.length > 1
          ? '\nTREN:\n' + affData.map((m) =>
              `${m.period}: GMV Rp ${m.summary.totalGMV.toLocaleString('id-ID')} | Aktif ${m.summary.activeCreators} kreator | Refund ${m.summary.refundRate.toFixed(1)}%`
            ).join('\n')
          : ''
        ctx = `HALAMAN: Affiliate Manager | PERIODE: ${latest.period}
TOTAL: ${s.totalCreators} kreator | Aktif: ${s.activeCreators} (${s.activeRate.toFixed(1)}%)
GMV: Rp ${s.totalGMV.toLocaleString('id-ID')} | Pesanan: ${s.totalOrders}
Komisi: Rp ${s.totalCommission.toLocaleString('id-ID')} (rate ${s.totalGMV > 0 ? (s.totalCommission / s.totalGMV * 100).toFixed(1) : 0}%)
REFUND: Rp ${s.totalRefundedGMV.toLocaleString('id-ID')} (${s.refundRate.toFixed(1)}%) ${s.refundRate > 15 ? '⚠️ TINGGI' : '✅ NORMAL'}
CHANNEL: Video Rp ${s.videoGMV.toLocaleString('id-ID')} | LIVE Rp ${s.liveGMV.toLocaleString('id-ID')} | Card Rp ${s.productCardGMV.toLocaleString('id-ID')}
SEGMEN: Nano=${s.nanoCount} Micro=${s.microCount} Mid=${s.midCount} Macro=${s.macroCount} Mega=${s.megaCount}
TOP 5:\n${top5}${trendStr}`
        break
      }
      case 'okr': {
        if (!activeStore) return ''
        const report = getLatestReport(activeStore.id)
        if (!report) return ''
        const lines: string[] = [`LAPORAN OKR BULANAN | TOKO: ${storeName} | PERIODE: ${report.bulanIni}`]
        const depts: OKRDepartment[] = ['konseptor', 'smo', 'advertiser', 'affiliate']
        let totalMetrics = 0, totalAchieved = 0
        depts.forEach((dept) => {
          const cfg = DEPARTMENT_CONFIG[dept]
          const rows = report.rows.filter((r) => r.parameter === dept)
          const achieved = rows.filter((r) => r.achieveBulanIni !== null && r.targetBulanIni > 0 && (r.achieveBulanIni / r.targetBulanIni) >= 1).length
          totalMetrics += rows.length
          totalAchieved += achieved
          lines.push(`\n${cfg.icon} ${cfg.label.toUpperCase()} (${achieved}/${rows.length} tercapai):`)
          rows.forEach((r) => {
            const pct = r.achieveBulanIni !== null && r.targetBulanIni > 0 ? ((r.achieveBulanIni / r.targetBulanIni) * 100).toFixed(0) + '%' : '-'
            const status = r.achieveBulanIni === null ? '⬜' : (r.targetBulanIni > 0 && r.achieveBulanIni >= r.targetBulanIni) ? '✅' : (r.targetBulanIni > 0 && r.achieveBulanIni >= r.targetBulanIni * 0.7) ? '🟡' : '🔴'
            lines.push(`- ${r.metric}: Target ${fmtOKRVal(r.targetBulanIni, r.satuan)} → Achieve ${fmtOKRVal(r.achieveBulanIni, r.satuan)} (${pct}) ${status}`)
          })
        })
        lines.push(`\nOVERALL: ${totalAchieved}/${totalMetrics} metrik tercapai (${totalMetrics > 0 ? ((totalAchieved / totalMetrics) * 100).toFixed(0) : 0}%)`)
        ctx = lines.join('\n')
        break
      }
      case 'compare-gabungan':
      case 'store-compare': {
        if (stores.length < 2) return ''
        const sA = stores[0], sB = stores[1]
        const latestA = sA.overviewData[sA.overviewData.length - 1]
        const latestB = sB.overviewData[sB.overviewData.length - 1]
        const lines: string[] = [`PERBANDINGAN 2 TOKO`]
        if (latestA) {
          const sa = latestA.summary
          lines.push(`TOKO A: ${sA.name} | GMV: Rp ${sa.gmv} | Pesanan: ${sa.orders} | Konversi: ${sa.conversionRate}%`)
        }
        if (latestB) {
          const sb = latestB.summary
          lines.push(`TOKO B: ${sB.name} | GMV: Rp ${sb.gmv} | Pesanan: ${sb.orders} | Konversi: ${sb.conversionRate}%`)
        }
        const vidSA = sA.videoData[sA.videoData.length - 1]
        const vidSB = sB.videoData[sB.videoData.length - 1]
        if (vidSA) lines.push(`VIDEO TOKO A: GPM Rp ${Math.round(vidSA.summary.avgGPM)} | CTR ${vidSA.summary.avgCTR}% | CTOR ${vidSA.summary.avgCTOR}% | Watch ${vidSA.summary.avgWatchRate}%`)
        if (vidSB) lines.push(`VIDEO TOKO B: GPM Rp ${Math.round(vidSB.summary.avgGPM)} | CTR ${vidSB.summary.avgCTR}% | CTOR ${vidSB.summary.avgCTOR}% | Watch ${vidSB.summary.avgWatchRate}%`)
        ctx = lines.join('\n')
        break
      }
      default:
        return ''
    }
    return ctx ? prefix + ctx : ''
  }, [aiPage, data, storeName, activeStore, stores, activeStoreId, monthlyReports, getLatestReport])
}
