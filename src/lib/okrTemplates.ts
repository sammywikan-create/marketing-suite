import type { OKRTableRow, OKRDepartment } from '@/lib/types'

export const DEFAULT_OKR_ROWS: Omit<OKRTableRow, 'targetBulanLalu' | 'achieveBulanLalu' | 'targetBulanIni' | 'achieveBulanIni'>[] = [
  // KONSEPTOR
  { parameter: 'konseptor', metric: 'Konten Fresh/Original', metricKey: 'konseptor.kontenFresh', satuan: 'konten', notes: '' },
  { parameter: 'konseptor', metric: 'Konten Footage', metricKey: 'konseptor.kontenFootage', satuan: 'konten', notes: '' },
  { parameter: 'konseptor', metric: 'Konten AI', metricKey: 'konseptor.kontenAI', satuan: 'konten', notes: '' },
  { parameter: 'konseptor', metric: 'Bank Content', metricKey: 'konseptor.bankContent', satuan: 'konten', notes: '' },
  // SMO
  { parameter: 'smo', metric: 'Sesi Live', metricKey: 'smo.sesiLive', satuan: 'sesi', notes: '' },
  { parameter: 'smo', metric: 'Upload Harian', metricKey: 'smo.uploadHarian', satuan: 'upload', notes: '' },
  { parameter: 'smo', metric: 'Live Impression', metricKey: 'smo.liveImpression', satuan: 'impresi', notes: '' },
  // ADVERTISER
  { parameter: 'advertiser', metric: 'GMV Video', metricKey: 'advertiser.gmvVideo', satuan: 'Rp', notes: '' },
  { parameter: 'advertiser', metric: 'GMV Live', metricKey: 'advertiser.gmvLive', satuan: 'Rp', notes: '' },
  { parameter: 'advertiser', metric: 'GMV Kartu Produk', metricKey: 'advertiser.gmvKartuProduk', satuan: 'Rp', notes: '' },
  { parameter: 'advertiser', metric: 'TOTAL GMV', metricKey: 'advertiser.totalGMV', satuan: 'Rp', notes: '' },
  // KOL/AFFILIATE
  { parameter: 'affiliate', metric: 'GMV Affiliate', metricKey: 'affiliate.gmvAffiliate', satuan: 'Rp', notes: '' },
  { parameter: 'affiliate', metric: 'Jumlah Kreator Aktif', metricKey: 'affiliate.kreatorAktif', satuan: 'kreator', notes: '' },
  { parameter: 'affiliate', metric: 'Jumlah Video Jualan Kreator', metricKey: 'affiliate.videoJualanKreator', satuan: 'video', notes: '' },
  { parameter: 'affiliate', metric: 'Endorse Dokter', metricKey: 'affiliate.endorseDokter', satuan: 'endorsement', notes: '' },
  { parameter: 'affiliate', metric: 'Endorse Macro', metricKey: 'affiliate.endorseMacro', satuan: 'endorsement', notes: '' },
  { parameter: 'affiliate', metric: 'Endorse Micro', metricKey: 'affiliate.endorseMicro', satuan: 'endorsement', notes: '' },
  { parameter: 'affiliate', metric: 'Endorse Agency', metricKey: 'affiliate.endorseAgency', satuan: 'endorsement', notes: '' },
]

export const DEPARTMENT_CONFIG: Record<OKRDepartment, { label: string; color: string; bg: string; icon: string }> = {
  konseptor:  { label: 'Konseptor', color: '#1565C0', bg: '#E3F2FD', icon: '✏️' },
  smo:        { label: 'SMO', color: '#2E7D32', bg: '#E8F5E9', icon: '📡' },
  advertiser: { label: 'Advertiser', color: '#E65100', bg: '#FFF3E0', icon: '📣' },
  affiliate:  { label: 'KOL/Affiliate', color: '#6A1B9A', bg: '#F3E5F5', icon: '🤝' },
  custom:     { label: 'Custom', color: '#37474F', bg: '#ECEFF1', icon: '⚙️' },
}

// Auto-sync mapping: metricKey → how to extract from store data
export const AUTO_SYNC_KEYS: Record<string, string> = {
  'advertiser.gmvVideo': 'videoData.summary.totalGMV',
  'advertiser.totalGMV': 'overviewData.summary.gmv',
  'affiliate.kreatorAktif': 'videoData.uniqueCreators',
  'affiliate.videoJualanKreator': 'videoData.summary.totalVideos',
}

export function generateMonthOptions(): string[] {
  const months: string[] = []
  const now = new Date()
  for (let i = -6; i <= 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
    const label = d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
    months.push(label)
  }
  return months
}
