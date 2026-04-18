import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

/* eslint-disable @typescript-eslint/no-explicit-any */

// ────────────────────────────────────────────────────────
// WARNA & KONSTANTA
// ────────────────────────────────────────────────────────
const C = {
  navy:    [26,  35,  126] as [number,number,number],
  navyL:   [232, 234, 246] as [number,number,number],
  cyan:    [0,   188, 212] as [number,number,number],
  green:   [27,  94,  32]  as [number,number,number],
  greenL:  [232, 245, 233] as [number,number,number],
  red:     [183, 28,  28]  as [number,number,number],
  redL:    [255, 235, 238] as [number,number,number],
  yellow:  [230, 162, 0]   as [number,number,number],
  yellowL: [255, 248, 225] as [number,number,number],
  gray:    [100, 100, 100] as [number,number,number],
  grayL:   [245, 245, 245] as [number,number,number],
  dark:    [30,  30,  30]  as [number,number,number],
  white:   [255, 255, 255] as [number,number,number],
  purple:  [106, 27,  154] as [number,number,number],
  teal:    [0,   131, 143] as [number,number,number],
}
const PW=210, PH=297, ML=14, MR=14, CW=210-14-14
let _pn=1, _brand='', _rname='', _period=''

// ────────────────────────────────────────────────────────
// FORMAT HELPERS
// ────────────────────────────────────────────────────────
const fRp = (v:number) => {
  if (!v||isNaN(v)) return 'Rp 0'
  if (v>=1e9) return `Rp ${(v/1e9).toFixed(2)}M`
  if (v>=1e6) return `Rp ${(v/1e6).toFixed(1)}Jt`
  if (v>=1e3) return `Rp ${(v/1e3).toFixed(0)}K`
  return `Rp ${Math.round(v).toLocaleString('id-ID')}`
}
const fN  = (v:number) => (v||0).toLocaleString('id-ID')
const fP  = (v:number, d=1) => `${(v||0).toFixed(d)}%`
const fX  = (v:number) => `${(v||0).toFixed(2)}x`
const stC = (v:number, g:number, w:number): [number,number,number] =>
  v>=g ? C.green : v>=w ? C.yellow : C.red
const stT = (v:number, g:number, w:number) =>
  v>=g ? 'OK' : v>=w ? 'CEK' : '!!'

// ────────────────────────────────────────────────────────
// PARSE RAW FILE HELPERS
// ────────────────────────────────────────────────────────
async function readXLSX(file: File): Promise<any[][]> {
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, {type:'array'})
  const ws = wb.Sheets[wb.SheetNames[0]]
  return XLSX.utils.sheet_to_json(ws, {header:1, defval:''}) as any[][]
}

function parseRp(v: any): number {
  if (!v) return 0
  const s = String(v).replace(/[Rp\s]/g,'').replace(/\./g,'').replace(',','.')
  return parseFloat(s) || 0
}

function findHeaderRow(rows: any[][], keywords: string[]): number {
  return rows.findIndex(r =>
    keywords.some(kw =>
      r.some((c:any) => String(c||'').toLowerCase().includes(kw.toLowerCase()))
    )
  )
}

// ─── PARSE OVERVIEW ───────────────────────────────────────
async function parseOverview(file?: File) {
  if (!file) return null
  const rows = await readXLSX(file)
  const r = rows[1] || []
  const gmv    = Number(r[1]) || 0
  const refund = Number(r[2]) || 0
  const sold   = Number(r[4]) || 0
  const buyers = Number(r[5]) || 0
  const views  = Number(r[6]) || 0
  const visits = Number(r[7]) || 0
  const orders = Number(r[9]) || 0
  const cvr    = parseFloat(String(r[10]||'0').replace('%','')) || 0

  const daily: {date:string,gmv:number,orders:number}[] = []
  for (let i=3; i<rows.length; i++) {
    const dr = rows[i]
    if (!dr[0] || dr[0]==='Tanggal') continue
    const dGmv = Number(dr[1]) || 0
    if (dGmv > 0) {
      daily.push({date: String(dr[0]), gmv: dGmv, orders: Number(dr[9])||0})
    }
  }

  const bestDay  = daily.reduce((a,b) => b.gmv>a.gmv?b:a, daily[0]||{date:'-',gmv:0,orders:0})
  const worstDay = daily.reduce((a,b) => b.gmv<a.gmv?b:a, daily[0]||{date:'-',gmv:0,orders:0})

  return {
    gmv, refund, sold, buyers, views, visits, orders, cvr,
    refundRate: gmv>0 ? refund/gmv*100 : 0,
    avgPerHari: daily.length>0 ? daily.reduce((a,d)=>a+d.gmv,0)/daily.length : 0,
    bestDay, worstDay, dailyCount: daily.length,
    top5Days: [...daily].sort((a,b)=>b.gmv-a.gmv).slice(0,5),
  }
}

// ─── PARSE VIDEO ──────────────────────────────────────────
async function parseVideo(file?: File) {
  if (!file) return null
  const rows = await readXLSX(file)

  let hIdx = findHeaderRow(rows, ['Nama Kreator','Creator'])
  if (hIdx < 0) hIdx = 2
  const headers = rows[hIdx].map((h:any)=>String(h||'').toLowerCase())

  const g = (row:any[], kw:string) => {
    const i = headers.findIndex(h=>h.includes(kw))
    return i>=0 ? row[i] : null
  }

  const dataRows = rows.slice(hIdx+1).filter(r=>r[0]&&String(r[0]).trim()&&String(r[0])!=='undefined')

  const videos = dataRows.map(r => ({
    creator:   String(g(r,'nama kreator')||g(r,'creator')||r[0]||''),
    caption:   String(g(r,'informasi video')||g(r,'video info')||'').substring(0,100),
    date:      String(g(r,'waktu')||''),
    vv:        Number(g(r,'vv')) || 0,
    likes:     Number(g(r,'likes')) || 0,
    comments:  Number(g(r,'komentar')) || 0,
    shares:    Number(g(r,'dibagikan')) || 0,
    newFollowers: Number(g(r,'pengikut baru')) || 0,
    gmv:       Number(g(r,'nilai barang')||g(r,'gmv yang didapat')) || 0,
    gpm:       Number(g(r,'gpm')) || 0,
    ctr:       parseFloat(String(g(r,'rasio klik tayang')||'0').replace('%','')) || 0,
    ctor:      parseFloat(String(g(r,'rasio pesanan per klik')||'0').replace('%','')) || 0,
    watchRate: parseFloat(String(g(r,'ditonton hingga selesai')||g(r,'watch')||'0').replace('%','')) || 0,
    orders:    Number(g(r,'pesanan video')||g(r,'orders')) || 0,
  }))

  const wGMV = videos.filter(v=>v.gmv>0)
  const wVV  = videos.filter(v=>v.vv>0)

  const byCreator: Record<string,any> = {}
  videos.forEach(v => {
    if (!byCreator[v.creator]) byCreator[v.creator] = {gmv:0,orders:0,vv:0,videos:0,gpm:0}
    byCreator[v.creator].gmv += v.gmv
    byCreator[v.creator].orders += v.orders
    byCreator[v.creator].vv += v.vv
    byCreator[v.creator].videos++
  })
  const topCreators = Object.entries(byCreator)
    .map(([name,d])=>({name,...d}))
    .sort((a,b)=>b.gmv-a.gmv).slice(0,5)

  return {
    totalVideos:  videos.length,
    totalVV:      videos.reduce((a,v)=>a+v.vv, 0),
    totalGMV:     videos.reduce((a,v)=>a+v.gmv, 0),
    totalOrders:  videos.reduce((a,v)=>a+v.orders, 0),
    totalLikes:   videos.reduce((a,v)=>a+v.likes, 0),
    totalComments:videos.reduce((a,v)=>a+v.comments, 0),
    totalShares:  videos.reduce((a,v)=>a+v.shares, 0),
    totalFollowers:videos.reduce((a,v)=>a+v.newFollowers, 0),
    avgGPM:       wGMV.length ? wGMV.reduce((a,v)=>a+v.gpm,0)/wGMV.length : 0,
    avgCTR:       wGMV.length ? wGMV.reduce((a,v)=>a+v.ctr,0)/wGMV.length : 0,
    avgCTOR:      wGMV.length ? wGMV.reduce((a,v)=>a+v.ctor,0)/wGMV.length : 0,
    avgWatchRate: wVV.length  ? wVV.reduce((a,v)=>a+v.watchRate,0)/wVV.length : 0,
    top5: [...videos].sort((a,b)=>b.gmv-a.gmv).slice(0,5),
    topCreators,
  }
}

// ─── PARSE GMV MAX ────────────────────────────────────────
async function parseGMVMax(file?: File) {
  if (!file) return null
  const rows = await readXLSX(file)
  const headers = rows[0].map((h:any)=>String(h||'').toLowerCase())
  const g = (row:any[], kw:string) => {
    const i = headers.findIndex(h=>h.includes(kw))
    return i>=0 ? row[i] : null
  }
  const dataRows = rows.slice(1).filter(r=>r[0])

  const creatives = dataRows.map(r => ({
    campaign: String(g(r,'campaign name')||''),
    type:     String(g(r,'creative type')||''),
    account:  String(g(r,'tiktok account')||''),
    status:   String(g(r,'status')||''),
    cost:     Number(g(r,'cost')) || 0,
    orders:   Number(g(r,'sku orders')) || 0,
    cpo:      Number(g(r,'cost per order')) || 0,
    revenue:  Number(g(r,'gross revenue')) || 0,
    roi:      Number(g(r,'roi')) || 0,
    impressions: Number(g(r,'impressions')) || 0,
    clicks:   Number(g(r,'product ad clicks')) || 0,
    ctr:      (Number(g(r,'product ad click rate')) || 0)*100,
    cvr:      (Number(g(r,'ad conversion rate')) || 0)*100,
    view2s:   (Number(g(r,'2-second')) || 0)*100,
    view6s:   (Number(g(r,'6-second')) || 0)*100,
  }))

  const active = creatives.filter(c=>c.revenue>0||c.cost>0)
  const winners = active.filter(c=>c.roi>=8)
  const boros   = active.filter(c=>c.cost>300000&&c.roi<3&&c.cost>0).sort((a,b)=>b.cost-a.cost)

  const totalRevenue = active.reduce((a,c)=>a+c.revenue, 0)
  const totalCost    = active.reduce((a,c)=>a+c.cost, 0)
  const totalOrders  = active.reduce((a,c)=>a+c.orders, 0)

  const byCamp: Record<string,any> = {}
  active.forEach(c => {
    if (!byCamp[c.campaign]) byCamp[c.campaign] = {revenue:0,cost:0,orders:0,count:0}
    byCamp[c.campaign].revenue += c.revenue
    byCamp[c.campaign].cost += c.cost
    byCamp[c.campaign].orders += c.orders
    byCamp[c.campaign].count++
  })
  const byCampaign = Object.entries(byCamp)
    .map(([name,d])=>({name,...d,roi:d.cost>0?d.revenue/d.cost:0}))
    .sort((a,b)=>b.revenue-a.revenue)

  return {
    totalCreatives: active.length,
    winnerCount: winners.length,
    totalRevenue, totalCost, totalOrders,
    overallROI:   totalCost>0 ? totalRevenue/totalCost : 0,
    avgCPO:       totalOrders>0 ? totalCost/totalOrders : 0,
    avgCTR:       active.length ? active.reduce((a,c)=>a+c.ctr,0)/active.length : 0,
    avgCVR:       active.length ? active.reduce((a,c)=>a+c.cvr,0)/active.length : 0,
    byCampaign,
    top5Winners:  [...winners].sort((a,b)=>b.roi-a.roi).slice(0,5),
    borosCreatives: boros.slice(0,5),
    byType: {
      video: active.filter(c=>c.type.toLowerCase().includes('video')).length,
      productCard: active.filter(c=>c.type.toLowerCase().includes('product')).length,
    }
  }
}

// ─── PARSE AFFILIATE ──────────────────────────────────────
async function parseAffiliate(
  tokopediaCreatorFile?: File,
  tokopediaCoreFile?: File,
  tiktokCreatorFile?: File,
  tiktokCoreFile?: File,
) {
  let tok: any = null
  if (tokopediaCreatorFile) {
    const rows = await readXLSX(tokopediaCreatorFile)
    let hIdx = findHeaderRow(rows, ['Creator username','username'])
    if (hIdx<0) hIdx=0
    const headers = rows[hIdx].map((h:any)=>String(h||'').toLowerCase())
    const g = (row:any[],kw:string) => {
      const i=headers.findIndex(h=>h.includes(kw)); return i>=0?row[i]:null
    }
    const dataRows = rows.slice(hIdx+1).filter(r=>r[0]&&String(r[0]).trim())

    const creators = dataRows.map(r => {
      const gmv      = Number(g(r,'affiliate gmv')||0)
      const refund   = Number(g(r,'affiliate refunded gmv')||0)
      const orders   = Number(g(r,'affiliate orders')||0)
      const videos   = Number(g(r,'affiliate shoppable videos')||0)
      const followers= Number(g(r,'affiliate followers')||0)
      const comm     = Number(g(r,'est. commission')||0)
      const liveGMV  = Number(g(r,'affiliate live gmv')||0)
      const videoGMV = Number(g(r,'affiliate shoppable video gmv')||0)
      const pcGMV    = Number(g(r,'affiliate product card gmv')||0)
      const username = String(g(r,'creator username')||r[0]||'')
      const tier = followers>500000?'Mega':followers>100000?'Macro':followers>10000?'Mid':followers>1000?'Micro':'Nano'
      return {username,gmv,refund,refundRate:gmv>0?refund/gmv*100:0,orders,videos,followers,tier,comm,liveGMV,videoGMV,pcGMV}
    })

    const aktif = creators.filter(c=>c.gmv>0)
    const totalGMV = creators.reduce((a,c)=>a+c.gmv,0)

    let coreData: any = {}
    if (tokopediaCoreFile) {
      const crows = await readXLSX(tokopediaCoreFile)
      const cheaders = crows[0].map((h:any)=>String(h||'').toLowerCase())
      const cg = (kw:string) => {
        const i=cheaders.findIndex(h=>h.includes(kw)); return i>=0?crows[1]?.[i]:null
      }
      coreData = {
        liveGMV:      Number(cg('live gmv'))||0,
        videoGMV:     Number(cg('shoppable video gmv'))||0,
        productCardGMV: Number(cg('product card gmv'))||0,
        refund:       Number(cg('refunded gmv'))||0,
        liveCount:    Number(cg('live streams'))||0,
        videoCount:   Number(cg('shoppable videos'))||0,
        commission:   Number(cg('commission'))||0,
      }
    }

    tok = {
      totalCreators: creators.length,
      activeCreators: aktif.length,
      activeRate: creators.length>0 ? aktif.length/creators.length*100 : 0,
      totalGMV,
      liveGMV:        coreData.liveGMV||aktif.reduce((a,c)=>a+c.liveGMV,0),
      videoGMV:       coreData.videoGMV||aktif.reduce((a,c)=>a+c.videoGMV,0),
      productCardGMV: coreData.productCardGMV||aktif.reduce((a,c)=>a+c.pcGMV,0),
      totalRefund:    coreData.refund||creators.reduce((a,c)=>a+c.refund,0),
      refundRate:     totalGMV>0 ? (coreData.refund||creators.reduce((a,c)=>a+c.refund,0))/totalGMV*100 : 0,
      totalOrders:    creators.reduce((a,c)=>a+c.orders,0),
      totalVideos:    coreData.videoCount||creators.reduce((a,c)=>a+c.videos,0),
      totalLive:      coreData.liveCount||0,
      totalCommission: coreData.commission||creators.reduce((a,c)=>a+c.comm,0),
      commissionRate: totalGMV>0?(coreData.commission||0)/totalGMV*100:0,
      avgAOV:         creators.reduce((a,c)=>a+c.orders,0)>0?totalGMV/creators.reduce((a,c)=>a+c.orders,0):0,
      top5: aktif.sort((a,b)=>b.gmv-a.gmv).slice(0,5),
      highRefund: aktif.filter(c=>c.refundRate>20).sort((a,b)=>b.refundRate-a.refundRate),
      byTier: ['Macro','Mid','Micro','Nano'].map(tier=>({
        tier,
        count: aktif.filter(c=>c.tier===tier).length,
        gmv:   aktif.filter(c=>c.tier===tier).reduce((a,c)=>a+c.gmv,0),
      })).filter(t=>t.count>0),
    }
  }

  let ttk: any = null
  if (tiktokCreatorFile) {
    const rows = await readXLSX(tiktokCreatorFile)
    let hIdx = findHeaderRow(rows, ['Creator name','creator'])
    if (hIdx<0) hIdx=0
    const headers = rows[hIdx].map((h:any)=>String(h||'').toLowerCase())
    const g = (row:any[],kw:string) => {
      const i=headers.findIndex(h=>h.includes(kw)); return i>=0?row[i]:null
    }
    const dataRows = rows.slice(hIdx+1).filter(r=>r[0]&&String(r[0]).trim())
    const creators = dataRows.map(r => ({
      name:    String(g(r,'creator name')||r[0]||''),
      gmv:     parseRp(g(r,'gmv dari kreator')||g(r,'gmv')||0),
      refund:  parseRp(g(r,'pengembalian dana')||0),
      orders:  Number(g(r,'pesanan teratribusi')||0),
      videos:  Number(g(r,'video')||0),
      live:    Number(g(r,'siaran live')||0),
      aov:     parseRp(g(r,'aov')||0),
      commission: parseRp(g(r,'perkiraan komisi')||0),
    }))

    let coreMetrics: any = {}
    if (tiktokCoreFile) {
      const crows = await readXLSX(tiktokCoreFile)
      const ch = crows[0].map((h:any)=>String(h||'').toLowerCase())
      const cg = (kw:string) => {
        const i=ch.findIndex(h=>h.includes(kw)); return i>=0?parseRp(crows[1]?.[i]):0
      }
      coreMetrics = {
        gmv:     cg('gmv dari kreator'),
        refund:  cg('pengembalian dana'),
        videos:  Number(crows[1]?.[ch.findIndex((h:string)=>h.includes('video'))]),
        live:    Number(crows[1]?.[ch.findIndex((h:string)=>h.includes('siaran'))]),
        commission: cg('perkiraan komisi'),
        aov:     cg('aov'),
      }
    }

    const totalGMV = coreMetrics.gmv||creators.reduce((a,c)=>a+c.gmv,0)
    ttk = {
      totalGMV,
      totalRefund:  coreMetrics.refund||creators.reduce((a,c)=>a+c.refund,0),
      refundRate:   totalGMV>0?(coreMetrics.refund||0)/totalGMV*100:0,
      totalOrders:  creators.reduce((a,c)=>a+c.orders,0),
      totalVideos:  coreMetrics.videos||creators.reduce((a,c)=>a+c.videos,0),
      totalLive:    coreMetrics.live||creators.reduce((a,c)=>a+c.live,0),
      totalCommission: coreMetrics.commission||creators.reduce((a,c)=>a+c.commission,0),
      commissionRate: totalGMV>0?(coreMetrics.commission||0)/totalGMV*100:0,
      avgAOV:       coreMetrics.aov||0,
      top5: [...creators].sort((a,b)=>b.gmv-a.gmv).slice(0,5),
    }
  }

  return { tokopedia: tok, tiktok: ttk }
}

// ────────────────────────────────────────────────────────
// PDF HELPERS
// ────────────────────────────────────────────────────────
const addFrame = (doc: jsPDF) => {
  doc.setFillColor(...C.navy)
  doc.rect(0,0,PW,10,'F')
  doc.setTextColor(...C.white); doc.setFontSize(7.5); doc.setFont('helvetica','bold')
  doc.text(_brand, ML, 7)
  doc.setFont('helvetica','normal')
  doc.text(_rname, PW/2, 7, {align:'center'})
  doc.text(_period, PW-MR, 7, {align:'right'})
  doc.setFillColor(...C.navyL)
  doc.rect(0,PH-8,PW,8,'F')
  doc.setTextColor(...C.gray); doc.setFontSize(7)
  doc.text('KONFIDENSIAL — Hanya Untuk Internal', ML, PH-3)
  doc.text(`Halaman ${_pn}`, PW-MR, PH-3, {align:'right'})
  _pn++; doc.setTextColor(...C.dark)
}
const nPage = (doc:jsPDF) => { doc.addPage(); addFrame(doc); return 16 }
const secTitle = (doc:jsPDF, title:string, y:number) => {
  doc.setFillColor(...C.navy); doc.rect(ML,y,4,8,'F')
  doc.setFillColor(...C.cyan); doc.rect(ML,y+8,4,2,'F')
  doc.setTextColor(...C.navy); doc.setFontSize(12); doc.setFont('helvetica','bold')
  doc.text(title, ML+7, y+7.5)
  doc.setTextColor(...C.dark); doc.setFont('helvetica','normal')
  return y+15
}
const subTitle = (doc:jsPDF, title:string, y:number) => {
  doc.setTextColor(...C.navy); doc.setFontSize(9.5); doc.setFont('helvetica','bold')
  doc.text(title, ML, y); doc.setFont('helvetica','normal'); doc.setTextColor(...C.dark)
  return y+7
}
const kpiBox = (
  doc:jsPDF, x:number, y:number, w:number, h:number,
  label:string, value:string, sub:string,
  color:typeof C[keyof typeof C]=C.navy, badge?:string
) => {
  doc.setFillColor(...C.grayL); doc.roundedRect(x,y,w,h,2,2,'F')
  doc.setFillColor(...color as [number,number,number]); doc.rect(x,y,w,2,'F')
  doc.setTextColor(...C.gray); doc.setFontSize(7); doc.setFont('helvetica','normal')
  doc.text(label.toUpperCase(), x+3, y+8)
  doc.setTextColor(...color as [number,number,number]); doc.setFontSize(15); doc.setFont('helvetica','bold')
  doc.text(value, x+3, y+18)
  doc.setTextColor(...C.gray); doc.setFontSize(7); doc.setFont('helvetica','normal')
  const sub2 = doc.splitTextToSize(sub, w-6)
  doc.text(sub2[0]||'', x+3, y+24)
  if (badge) {
    const bc = badge.includes('!!')?C.red : badge.includes('CEK')?C.yellow : C.green
    const bw = doc.getTextWidth(badge)+4
    doc.setFillColor(...bc); doc.roundedRect(x+w-bw-2,y+3,bw,5,1,1,'F')
    doc.setTextColor(...C.white); doc.setFontSize(6.5); doc.setFont('helvetica','bold')
    doc.text(badge, x+w-bw,y+7)
    doc.setFont('helvetica','normal'); doc.setTextColor(...C.dark)
  }
}
const infoBox = (doc:jsPDF, text:string, y:number, type:'warn'|'ok'|'info'='info') => {
  const bg = type==='warn'?C.redL : type==='ok'?C.greenL : C.navyL
  const tc = type==='warn'?C.red  : type==='ok'?C.green  : C.navy
  doc.setFillColor(...bg); doc.rect(ML,y,CW,10,'F')
  doc.setFillColor(...tc); doc.rect(ML,y,3,10,'F')
  doc.setTextColor(...tc); doc.setFontSize(8); doc.setFont('helvetica','bold')
  doc.text(type==='warn'?'[!!]':type==='ok'?'[OK]':'[i]', ML+5, y+7)
  doc.setFont('helvetica','normal')
  const t2 = doc.splitTextToSize(text, CW-20)
  doc.text(t2[0]||'', ML+16, y+7)
  doc.setTextColor(...C.dark)
  return y+14
}

// TABLE DEFAULTS
const tHead = (color=C.navy) => ({
  fillColor: color, textColor: C.white as [number,number,number],
  fontStyle: 'bold' as const, fontSize: 9, cellPadding: 3.5
})
const tBody = () => ({fontSize:9, cellPadding:3})
const tAlt  = () => ({fillColor: C.grayL as [number,number,number]})

// ────────────────────────────────────────────────────────
// MAIN EXPORT — PDF GENERATION
// ────────────────────────────────────────────────────────
export async function generatePDFReport(config: any, allData: any): Promise<void> {
  _pn=1; _brand=allData.brandName||'FreshVision'
  _rname=config.name||'Laporan Performa Bisnis'
  _period=config.period||new Date().toLocaleDateString('id-ID',{month:'long',year:'numeric'})

  // PARSE SEMUA FILE MENTAH
  const rawFiles = allData.rawFiles || {}
  const [ov, vid, gm, aff] = await Promise.all([
    parseOverview(rawFiles.overview),
    parseVideo(rawFiles.video),
    parseGMVMax(rawFiles.gmvMax),
    parseAffiliate(
      rawFiles.affiliateTokopedia,
      rawFiles.affiliateTokopediaCore,
      rawFiles.affiliateTikTok,
      rawFiles.affiliateTikTokCore,
    ),
  ])

  const tok = aff?.tokopedia
  const ttk = aff?.tiktok

  const doc = new jsPDF({orientation:'portrait',unit:'mm',format:'a4'})

  // ═══════════════════════════════════════════════════════
  // HAL 1: COVER
  // ═══════════════════════════════════════════════════════
  doc.setFillColor(...C.navy); doc.rect(0,0,PW,PH,'F')
  doc.setFillColor(0,100,120); doc.rect(PW-40,0,40,PH,'F')
  doc.setFillColor(...C.cyan); doc.rect(0,PH-25,PW,25,'F')
  doc.setTextColor(...C.white); doc.setFontSize(9); doc.setFont('helvetica','bold')
  doc.text(_brand.toUpperCase(), ML, 22)
  doc.setTextColor(...C.cyan); doc.setFontSize(8); doc.setFont('helvetica','normal')
  doc.text('Performance Dashboard Report', ML, 28)
  doc.setDrawColor(...C.cyan); doc.setLineWidth(0.5); doc.line(ML,31,ML+60,31)
  doc.setTextColor(...C.white); doc.setFontSize(28); doc.setFont('helvetica','bold')
  const tLines = doc.splitTextToSize(config.name, 145)
  doc.text(tLines, ML, 72)
  doc.setFontSize(11); doc.setFont('helvetica','normal')
  doc.setTextColor(176,190,197)
  doc.text(config.description||'Laporan Performa Bisnis Lengkap', ML, 72+tLines.length*13+5)
  const infos = [
    {label:'PERIODE',  val: _period},
    {label:'TOKO',     val: allData.stores?.map((s:any)=>s.name).join(' + ')||_brand},
    {label:'BAGIAN',   val: `${config.sections?.length||0} seksi laporan`},
    {label:'TANGGAL',  val: new Date().toLocaleDateString('id-ID',{weekday:'long',year:'numeric',month:'long',day:'numeric'})},
  ]
  infos.forEach((inf,i) => {
    const iy = 155+i*18
    doc.setTextColor(120,144,156); doc.setFontSize(7); doc.setFont('helvetica','bold')
    doc.text(inf.label, ML, iy)
    doc.setTextColor(...C.white); doc.setFontSize(10); doc.setFont('helvetica','normal')
    doc.text(inf.val, ML, iy+7)
  })
  doc.setTextColor(...C.navy); doc.setFontSize(8)
  doc.text('KONFIDENSIAL', ML, PH-8)
  doc.text('Hal. 1', PW-MR, PH-8, {align:'right'})
  _pn=2

  // ═══════════════════════════════════════════════════════
  // HAL 2: DAFTAR ISI
  // ═══════════════════════════════════════════════════════
  let y = nPage(doc)
  y = secTitle(doc, 'Daftar Isi', y); y+=2

  const sections = config.sections||[]
  const tocList: string[] = ['01. Ringkasan Eksekutif']
  if (sections.includes('overview'))   tocList.push('02. Overview Bisnis — Performa Toko')
  if (sections.includes('gmvmax'))     tocList.push('03. GMV Max — Iklan & Creative Performance')
  if (sections.includes('video'))      tocList.push('04. Video Organik Performance')
  if (sections.includes('affiliate'))  tocList.push('05. Affiliate & KOL Performance')
  if (sections.includes('okr'))        tocList.push('06. OKR & Progress Target')
  if (config.includeAIInsight)         tocList.push('07. Analisis AI & Rekomendasi Strategis')

  tocList.forEach((item,i) => {
    const ty = y+i*11
    doc.setFillColor(...(i%2===0?C.grayL:C.white))
    doc.rect(ML,ty-3,CW,10,'F')
    doc.setFillColor(...C.navy); doc.rect(ML,ty-3,2,10,'F')
    doc.setTextColor(...C.dark); doc.setFontSize(10); doc.setFont('helvetica','normal')
    doc.text(item, ML+6, ty+4)
  })

  // ═══════════════════════════════════════════════════════
  // HAL 3: RINGKASAN EKSEKUTIF
  // ═══════════════════════════════════════════════════════
  y = nPage(doc)
  y = secTitle(doc, '01. Ringkasan Eksekutif', y); y+=2

  const ovGMV  = ov?.gmv||0
  const tokGMV = tok?.totalGMV||0
  const ttkGMV = ttk?.totalGMV||0
  const vidGMV = vid?.totalGMV||0
  const gmxRev = gm?.totalRevenue||0
  const totalBizGMV = ovGMV + tokGMV

  const kW = (CW-8)/3, kH = 30
  const kpis = [
    {l:'Total GMV Bisnis',   v:fRp(totalBizGMV), s:`Organik ${fRp(ovGMV)} + Affiliate ${fRp(tokGMV)}`, c:C.navy, b:''},
    {l:'GMV Max Revenue',    v:gm?fRp(gmxRev):'Upload File', s:gm?`ROI ${fX(gm.overallROI)} | ${gm.winnerCount} winner`:'File creative-data belum diupload', c:gm?stC(gm.overallROI,8,4):C.gray, b:gm?stT(gm.overallROI,8,4)+' ROI':''},
    {l:'Total Pesanan Semua',v:fN((ov?.orders||0)+(tok?.totalOrders||0)), s:`Organik: ${fN(ov?.orders||0)} | Affiliate: ${fN(tok?.totalOrders||0)}`, c:C.green, b:''},
    {l:'GMV Affiliate',      v:fRp(tokGMV||ttkGMV), s:`${tok?.activeCreators||0} kreator aktif | ${tok?.totalCreators||0} terdaftar`, c:C.purple, b:''},
    {l:'Refund Rate',        v:tok?fP(tok.refundRate):'N/A', s:tok?`${fRp(tok.totalRefund)} dikembalikan`:'Data belum ada', c:tok?stC(100-(tok.refundRate||0),85,70):C.gray, b:tok?((tok.refundRate||0)>15?'!! TINGGI':'OK NORMAL'):''},
    {l:'Video Organik GMV',  v:fRp(vidGMV), s:vid?`${vid.totalVideos} video | GPM ${fRp(vid.avgGPM)}`:'File video belum diupload', c:C.teal, b:''},
  ]
  kpis.forEach((k,i)=>{
    const col=i%3, row=Math.floor(i/3)
    kpiBox(doc, ML+col*(kW+4), y+row*(kH+4), kW, kH, k.l, k.v, k.s, k.c as any, k.b||undefined)
  })
  y += 2*(kH+4)+6

  doc.setFillColor(...C.navyL); doc.rect(ML,y,CW,30,'F')
  doc.setFillColor(...C.cyan);  doc.rect(ML,y,3,30,'F')
  doc.setTextColor(...C.dark); doc.setFontSize(9); doc.setFont('helvetica','bold')
  doc.text('Sorotan Bisnis Periode Ini', ML+6, y+7)
  doc.setFont('helvetica','normal'); doc.setFontSize(8.5)
  const highlights = [
    `GMV bisnis total ${fRp(totalBizGMV)} dari channel organik (${fRp(ovGMV)}) dan affiliate (${fRp(tokGMV||ttkGMV)}).`,
    gm ? `GMV Max menghasilkan revenue ${fRp(gm.totalRevenue)} | ROI ${fX(gm.overallROI)} | ${gm.winnerCount} creative dengan ROI lebih dari 8x dari ${gm.totalCreatives} total creative.` : 'Data GMV Max belum diupload.',
    tok ? `Affiliate: ${tok.activeCreators} dari ${tok.totalCreators} kreator aktif — refund rate ${fP(tok.refundRate)} ${tok.refundRate>15?'(PERLU INVESTIGASI)':'(normal)'}.` : '',
    vid ? `Video organik: ${vid.totalVideos} video menghasilkan ${fN(vid.totalOrders)} pesanan | Avg GPM ${fRp(vid.avgGPM)} | VV ${fN(vid.totalVV)}.` : '',
  ].filter(Boolean)
  highlights.forEach((h,i) => {
    const lines = doc.splitTextToSize(`- ${h}`, CW-12)
    doc.text(lines[0]||'', ML+6, y+14+i*5.5)
  })
  y += 36

  // ═══════════════════════════════════════════════════════
  // SECTION: OVERVIEW BISNIS
  // ═══════════════════════════════════════════════════════
  if (sections.includes('overview')) {
    if (y>220) y=nPage(doc)
    y = secTitle(doc, '02. Overview Bisnis — Performa Toko', y)

    if (!ov) {
      y = infoBox(doc,'File Overview belum diupload. Upload file Overview_My-Business-Performance_*.xlsx',y,'warn')
    } else {
      const okW=(CW-6)/4, okH=28
      const oKPIs=[
        {l:'Total GMV',      v:fRp(ov.gmv),    s:`${fN(ov.orders)} pesanan`, c:C.navy},
        {l:'Konversi',       v:fP(ov.cvr),      s:`Target > 8%`, c:stC(ov.cvr,8,4)},
        {l:'Pembeli Unik',   v:fN(ov.buyers),   s:`dari ${fN(ov.visits)} kunjungan`, c:C.teal},
        {l:'Avg GMV/Hari',   v:fRp(ov.avgPerHari), s:`Terbaik: ${fRp(ov.bestDay?.gmv||0)}`, c:C.purple},
      ]
      oKPIs.forEach((k,i)=>{kpiBox(doc,ML+i*(okW+2),y,okW,okH,k.l,k.v,k.s,k.c as any)})
      y += okH+6

      autoTable(doc,{
        startY:y,
        head:[['Metrik','Nilai','Benchmark','Status']],
        body:[
          ['Total GMV',         fRp(ov.gmv),       '— Tumbuh tiap bulan',    '—'],
          ['Total Pesanan',      fN(ov.orders),     '—',                      '—'],
          ['Pembeli Unik',       fN(ov.buyers),     '—',                      '—'],
          ['Tayangan Halaman',   fN(ov.views),      '—',                      '—'],
          ['Kunjungan Toko',     fN(ov.visits),     '—',                      '—'],
          ['Produk Terjual',     fN(ov.sold),       '—',                      '—'],
          ['Konversi',           fP(ov.cvr),        '> 8%',                   stT(ov.cvr,8,4)+' '+(ov.cvr>=8?'Sehat':'Rendah')],
          ['Total Refund',       fRp(ov.refund),    '< 5% GMV',               stT(100-(ov.refundRate||0),95,90)+' '+(ov.refundRate<5?'Normal':'Perlu Cek')],
          ['Avg GMV per Hari',   fRp(ov.avgPerHari),'—',                      '—'],
          ['Hari Terbaik GMV',   fRp(ov.bestDay?.gmv||0), ov.bestDay?.date||'-', '[TOP]'],
          ['Hari Terburuk GMV',  fRp(ov.worstDay?.gmv||0), ov.worstDay?.date||'-', '[CEK]'],
        ],
        headStyles:tHead(), bodyStyles:tBody(), alternateRowStyles:tAlt(),
        columnStyles:{0:{cellWidth:60,fontStyle:'bold'},1:{cellWidth:38,halign:'right'},2:{cellWidth:50},3:{cellWidth:30}},
        margin:{left:ML,right:MR}, theme:'plain',
        tableLineColor:[220,220,220] as any, tableLineWidth:0.1,
      })
      y=(doc as any).lastAutoTable.finalY+8
    }
  }

  // ═══════════════════════════════════════════════════════
  // SECTION: GMV MAX
  // ═══════════════════════════════════════════════════════
  if (sections.includes('gmvmax')) {
    if (y>200) y=nPage(doc)
    y = secTitle(doc, '03. GMV Max — Iklan & Creative Performance', y)

    if (!gm) {
      y = infoBox(doc,'File GMV Max belum diupload. Upload file creative-data-*.xlsx dan proses di menu GMV Max.',y,'warn')
    } else {
      const gW=(CW-6)/4, gH=28
      const gKPIs=[
        {l:'Total Revenue',    v:fRp(gm.totalRevenue),  s:`dari ${gm.totalCreatives} creative aktif`, c:C.navy},
        {l:'Overall ROI',      v:fX(gm.overallROI),     s:`Target >= 8x`,                             c:stC(gm.overallROI,8,4)},
        {l:'Creative Winner',  v:`${gm.winnerCount}`,   s:`ROI >= 8x dari ${gm.totalCreatives}`,      c:C.green},
        {l:'Avg CPO',          v:fRp(gm.avgCPO),        s:`Target < Rp 25.000`,                       c:stC(25000-(gm.avgCPO||0),1,0)},
      ]
      gKPIs.forEach((k,i)=>{kpiBox(doc,ML+i*(gW+2),y,gW,gH,k.l,k.v,k.s,k.c as any, i===1?stT(gm.overallROI,8,4)+' ROI':undefined)})
      y += gH+6

      y = subTitle(doc,'Metrik Utama GMV Max',y)
      autoTable(doc,{
        startY:y,
        head:[['Metrik','Nilai','Benchmark','Status']],
        body:[
          ['Total Revenue',     fRp(gm.totalRevenue),  '—',       '—'],
          ['Total Cost',        fRp(gm.totalCost),     '—',       '—'],
          ['Total Orders',      fN(gm.totalOrders),    '—',       '—'],
          ['Overall ROI',       fX(gm.overallROI),     '>= 8x',   stT(gm.overallROI,8,4)+' '+(gm.overallROI>=8?'Sehat':'Perlu Optimasi')],
          ['Avg CTR',           fP(gm.avgCTR,2),       '>= 4%',   stT(gm.avgCTR,4,2)+' '+(gm.avgCTR>=4?'Baik':'Rendah')],
          ['Avg CVR',           fP(gm.avgCVR,2),       '>= 10%',  stT(gm.avgCVR,10,5)+' '+(gm.avgCVR>=10?'Baik':'Rendah')],
          ['Avg CPO',           fRp(gm.avgCPO),        '< Rp 25K',stT(25000-(gm.avgCPO||0),1,0)+' '+(gm.avgCPO<25000?'Efisien':'Mahal')],
          ['Creative Winner',   `${gm.winnerCount} creative`, '—','[TOP]'],
          ['Video Creative',    `${gm.byType.video}`,  '—',       '—'],
          ['Product Card',      `${gm.byType.productCard}`, '—', '—'],
        ],
        headStyles:tHead(), bodyStyles:tBody(), alternateRowStyles:tAlt(),
        columnStyles:{0:{cellWidth:58,fontStyle:'bold'},1:{cellWidth:38,halign:'right'},2:{cellWidth:42},3:{cellWidth:40}},
        margin:{left:ML,right:MR}, theme:'plain',
        tableLineColor:[220,220,220] as any, tableLineWidth:0.1,
      })
      y=(doc as any).lastAutoTable.finalY+8

      if (gm.byCampaign?.length) {
        if (y>210) y=nPage(doc)
        y = subTitle(doc,'Breakdown per Kampanye / SKU',y)
        autoTable(doc,{
          startY:y,
          head:[['Kampanye / SKU','Revenue','Cost','Orders','ROI','Status']],
          body: gm.byCampaign.map((c:any)=>[
            c.name, fRp(c.revenue), fRp(c.cost), fN(c.orders),
            c.cost>0?fX(c.roi):'—',
            c.cost>0?(c.roi>=8?'[TOP] Sehat':c.roi>=4?'[CEK] Cukup':'[!!] Rendah'):'—',
          ]),
          headStyles:tHead([66,66,66]), bodyStyles:tBody(), alternateRowStyles:tAlt(),
          columnStyles:{0:{cellWidth:55},1:{cellWidth:28,halign:'right',fontStyle:'bold'},2:{cellWidth:25,halign:'right'},3:{cellWidth:20,halign:'center'},4:{cellWidth:18,halign:'center'},5:{cellWidth:32}},
          margin:{left:ML,right:MR}, theme:'plain',
          tableLineColor:[220,220,220] as any, tableLineWidth:0.1,
        })
        y=(doc as any).lastAutoTable.finalY+8
      }

      if (gm.borosCreatives?.length) {
        if (y>210) y=nPage(doc)
        y = infoBox(doc,`[!!] Ditemukan ${gm.borosCreatives.length} creative BOROS: Cost tinggi tapi ROI < 3x. Pertimbangkan untuk di-pause.`,y,'warn')
        autoTable(doc,{
          startY:y,
          head:[['Creative / Akun','Campaign','Cost','Revenue','ROI']],
          body: gm.borosCreatives.map((c:any)=>[
            c.account||'—', c.campaign, fRp(c.cost), fRp(c.revenue), c.cost>0?fX(c.roi):'—',
          ]),
          headStyles:tHead(C.red), bodyStyles:tBody(), alternateRowStyles:tAlt(),
          columnStyles:{0:{cellWidth:45},1:{cellWidth:45},2:{cellWidth:28,halign:'right'},3:{cellWidth:28,halign:'right'},4:{cellWidth:22,halign:'center'}},
          margin:{left:ML,right:MR}, theme:'plain',
          tableLineColor:[220,220,220] as any, tableLineWidth:0.1,
        })
        y=(doc as any).lastAutoTable.finalY+8
      }
    }
  }

  // ═══════════════════════════════════════════════════════
  // SECTION: VIDEO PERFORMANCE
  // ═══════════════════════════════════════════════════════
  if (sections.includes('video')) {
    if (y>190) y=nPage(doc)
    y = secTitle(doc, '04. Video Organik Performance', y)

    if (!vid) {
      y = infoBox(doc,'File Video belum diupload. Upload file Video-Performance-List_*.xlsx di menu Video.',y,'warn')
    } else {
      const vW=(CW-6)/4, vH=28
      const vKPIs=[
        {l:'Total Video',    v:fN(vid.totalVideos),  s:`Total VV: ${fN(vid.totalVV)}`,      c:C.navy},
        {l:'Total GMV Video',v:fRp(vid.totalGMV),    s:`${fN(vid.totalOrders)} pesanan`,    c:C.green},
        {l:'Avg GPM',        v:fRp(vid.avgGPM),      s:`Benchmark > Rp 100K`,               c:stC(vid.avgGPM,100000,50000)},
        {l:'Avg CTR',        v:fP(vid.avgCTR,2),     s:`Benchmark > 3%`,                    c:stC(vid.avgCTR,3,1)},
      ]
      vKPIs.forEach((k,i)=>{kpiBox(doc,ML+i*(vW+2),y,vW,vH,k.l,k.v,k.s,k.c as any)})
      y += vH+6

      y = subTitle(doc,'Metrik Lengkap Video',y)
      autoTable(doc,{
        startY:y,
        head:[['Metrik','Nilai','Benchmark','Status']],
        body:[
          ['Total Video',       fN(vid.totalVideos),   '—',        '—'],
          ['Total Views (VV)',   fN(vid.totalVV),       '—',        '—'],
          ['Total GMV Video',    fRp(vid.totalGMV),     '—',        '—'],
          ['Total Pesanan',      fN(vid.totalOrders),   '—',        '—'],
          ['Total Likes',        fN(vid.totalLikes),    '—',        '—'],
          ['Total Komentar',     fN(vid.totalComments), '—',        '—'],
          ['Total Share',        fN(vid.totalShares),   '—',        '—'],
          ['Follower Baru',      fN(vid.totalFollowers),'—',        '—'],
          ['Avg GPM',            fRp(vid.avgGPM),       '> Rp 100K',stT(vid.avgGPM,100000,50000)+' '+(vid.avgGPM>=100000?'Sangat Baik':'Rendah')],
          ['Avg CTR',            fP(vid.avgCTR,2),      '> 3%',     stT(vid.avgCTR,3,1)+' '+(vid.avgCTR>=3?'Baik':'Rendah')],
          ['Avg CTOR',           fP(vid.avgCTOR,2),     '> 3%',     stT(vid.avgCTOR,3,1)+' '+(vid.avgCTOR>=3?'Baik':'Rendah')],
          ['Avg Watch Rate',     fP(vid.avgWatchRate,2),'> 10%',    stT(vid.avgWatchRate,10,5)+' '+(vid.avgWatchRate>=10?'Baik':'Rendah')],
        ],
        headStyles:tHead(), bodyStyles:tBody(), alternateRowStyles:tAlt(),
        columnStyles:{0:{cellWidth:58,fontStyle:'bold'},1:{cellWidth:35,halign:'right'},2:{cellWidth:42},3:{cellWidth:43}},
        margin:{left:ML,right:MR}, theme:'plain',
        tableLineColor:[220,220,220] as any, tableLineWidth:0.1,
      })
      y=(doc as any).lastAutoTable.finalY+8

      if (vid.top5?.length) {
        if (y>210) y=nPage(doc)
        y = subTitle(doc,'[TOP] Top 5 Video by GMV',y)
        autoTable(doc,{
          startY:y,
          head:[['#','Caption Video','Creator','GMV','GPM','CTR%','Orders','VV']],
          body: vid.top5.map((v:any,i:number)=>[
            `#${i+1}`,
            String(v.caption||'').substring(0,50)+(String(v.caption||'').length>50?'...':''),
            String(v.creator||''),
            fRp(v.gmv||0), fRp(v.gpm||0), fP(v.ctr,2), fN(v.orders||0), fN(v.vv||0),
          ]),
          headStyles:tHead([66,66,66]), bodyStyles:tBody(), alternateRowStyles:tAlt(),
          columnStyles:{0:{cellWidth:9,halign:'center',fontStyle:'bold'},1:{cellWidth:58},2:{cellWidth:28},3:{cellWidth:22,halign:'right',fontStyle:'bold'},4:{cellWidth:20,halign:'right'},5:{cellWidth:13,halign:'center'},6:{cellWidth:12,halign:'center'},7:{cellWidth:16,halign:'right'}},
          margin:{left:ML,right:MR}, theme:'plain',
          tableLineColor:[220,220,220] as any, tableLineWidth:0.1,
        })
        y=(doc as any).lastAutoTable.finalY+8
      }

      if (vid.topCreators?.length) {
        if (y>220) y=nPage(doc)
        y = subTitle(doc,'Top Kreator by GMV Video',y)
        autoTable(doc,{
          startY:y,
          head:[['Kreator/Akun','GMV Video','Orders','Total VV','Videos']],
          body: vid.topCreators.map((c:any)=>[
            `@${c.name}`, fRp(c.gmv), fN(c.orders), fN(c.vv), fN(c.videos),
          ]),
          headStyles:tHead([66,66,66]), bodyStyles:tBody(), alternateRowStyles:tAlt(),
          columnStyles:{0:{cellWidth:55},1:{cellWidth:35,halign:'right',fontStyle:'bold'},2:{cellWidth:25,halign:'center'},3:{cellWidth:35,halign:'right'},4:{cellWidth:28,halign:'center'}},
          margin:{left:ML,right:MR}, theme:'plain',
          tableLineColor:[220,220,220] as any, tableLineWidth:0.1,
        })
        y=(doc as any).lastAutoTable.finalY+8
      }
    }
  }

  // ═══════════════════════════════════════════════════════
  // SECTION: AFFILIATE
  // ═══════════════════════════════════════════════════════
  if (sections.includes('affiliate')) {
    if (y>180) y=nPage(doc)
    y = secTitle(doc, '05. Affiliate & KOL Performance', y)

    const affData = tok||ttk
    if (!affData) {
      y = infoBox(doc,'File Affiliate belum diupload. Upload di menu Affiliate.',y,'warn')
    } else {
      const aW=(CW-6)/4, aH=28
      const aKPIs=[
        {l:'GMV Affiliate',    v:fRp(affData.totalGMV),    s:`${affData.activeCreators||0} kreator aktif`,               c:C.purple},
        {l:'Kreator Aktif',    v:`${affData.activeCreators||0}/${affData.totalCreators||0}`, s:`Active rate ${fP(affData.activeRate||0,1)}`, c:C.green},
        {l:'Total Komisi',     v:fRp(affData.totalCommission||0), s:`Rate ${fP(affData.commissionRate||0,1)}`,             c:C.teal},
        {l:'Refund Rate',      v:fP(affData.refundRate||0,1), s:`${fRp(affData.totalRefund||0)} di-refund`,               c:stC(100-(affData.refundRate||0),85,70)},
      ]
      aKPIs.forEach((k,i)=>{kpiBox(doc,ML+i*(aW+2),y,aW,aH,k.l,k.v,k.s,k.c as any, i===3?((affData.refundRate||0)>15?'!! TINGGI':'OK NORMAL'):undefined)})
      y += aH+6

      y = subTitle(doc,'Metrik Lengkap Affiliate',y)
      const affRows: any[] = [
        ['Total GMV Affiliate', fRp(affData.totalGMV), '—'],
        ['Total Pesanan',       fN(affData.totalOrders||0), '—'],
        ['Total Video Kreator', fN(affData.totalVideos||0), 'Shoppable videos'],
        ['Total Sesi LIVE',     fN(affData.totalLive||0), 'LIVE streams kreator'],
        ['Total Komisi',        fRp(affData.totalCommission||0), `Rate ${fP(affData.commissionRate||0,1)}`],
        ['Avg AOV',             fRp(affData.avgAOV||0), 'Rata-rata nilai per order'],
        ['Kreator Aktif',       `${affData.activeCreators||0} dari ${affData.totalCreators||0}`, `Active rate ${fP(affData.activeRate||0,1)}`],
        ['Refund GMV',          fRp(affData.totalRefund||0), (affData.refundRate||0)>15?'[!!] DI ATAS NORMAL':'[OK] Normal'],
        ['Refund Rate',         fP(affData.refundRate||0,1), (affData.refundRate||0)>15?'[!!] Investigasi Segera':'[OK] Normal'],
      ]
      if (tok?.liveGMV !== undefined) {
        affRows.push(
          ['GMV Channel Video',        fRp(tok.videoGMV||0),       `${fP(tok.totalGMV>0?(tok.videoGMV/tok.totalGMV*100):0,1)} dari total`],
          ['GMV Channel LIVE',         fRp(tok.liveGMV||0),        `${fP(tok.totalGMV>0?(tok.liveGMV/tok.totalGMV*100):0,1)} dari total`],
          ['GMV Channel Product Card', fRp(tok.productCardGMV||0), `${fP(tok.totalGMV>0?(tok.productCardGMV/tok.totalGMV*100):0,1)} dari total`],
        )
      }
      autoTable(doc,{
        startY:y,
        head:[['Metrik','Nilai','Keterangan']],
        body: affRows,
        headStyles:tHead(), bodyStyles:tBody(), alternateRowStyles:tAlt(),
        columnStyles:{0:{cellWidth:60,fontStyle:'bold'},1:{cellWidth:35,halign:'right'},2:{cellWidth:83}},
        margin:{left:ML,right:MR}, theme:'plain',
        tableLineColor:[220,220,220] as any, tableLineWidth:0.1,
      })
      y=(doc as any).lastAutoTable.finalY+8

      if (affData.top5?.length) {
        if (y>200) y=nPage(doc)
        y = subTitle(doc,'[TOP] Top 5 Kreator by GMV',y)
        autoTable(doc,{
          startY:y,
          head:[['#','Username','Tier','GMV','Orders','Videos','Refund%','Komisi']],
          body: affData.top5.map((c:any,i:number)=>[
            `#${i+1}`, `@${c.username||c.name||''}`, c.tier||'—',
            fRp(c.gmv||0), fN(c.orders||0), fN(c.videos||0),
            fP(c.refundRate||0,1), fRp(c.commission||c.comm||0),
          ]),
          headStyles:tHead([66,66,66]), bodyStyles:tBody(), alternateRowStyles:tAlt(),
          columnStyles:{0:{cellWidth:9,halign:'center',fontStyle:'bold'},1:{cellWidth:32},2:{cellWidth:15,halign:'center'},3:{cellWidth:28,halign:'right',fontStyle:'bold'},4:{cellWidth:16,halign:'center'},5:{cellWidth:16,halign:'center'},6:{cellWidth:18,halign:'center'},7:{cellWidth:24,halign:'right'}},
          margin:{left:ML,right:MR}, theme:'plain',
          tableLineColor:[220,220,220] as any, tableLineWidth:0.1,
        })
        y=(doc as any).lastAutoTable.finalY+8

        const highRef = affData.highRefund||affData.top5.filter((c:any)=>(c.refundRate||0)>20)
        if (highRef?.length) {
          y = infoBox(doc,`[!!] Kreator dengan refund TINGGI (>20%): ${highRef.map((c:any)=>'@'+(c.username||c.name)).join(', ')} — investigasi segera dan review konten.`,y,'warn')
        }
      }

      if (tok?.byTier?.length) {
        if (y>230) y=nPage(doc)
        y = subTitle(doc,'Breakdown Kreator per Tier',y)
        autoTable(doc,{
          startY:y,
          head:[['Tier','Jumlah Kreator Aktif','Total GMV','% dari Total','Avg GMV/Kreator']],
          body: tok.byTier.map((t:any)=>[
            t.tier, fN(t.count), fRp(t.gmv),
            fP(tok.totalGMV>0?t.gmv/tok.totalGMV*100:0,1),
            fRp(t.count>0?t.gmv/t.count:0),
          ]),
          headStyles:tHead([66,66,66]), bodyStyles:tBody(), alternateRowStyles:tAlt(),
          columnStyles:{0:{cellWidth:30},1:{cellWidth:40,halign:'center'},2:{cellWidth:35,halign:'right'},3:{cellWidth:30,halign:'center'},4:{cellWidth:43,halign:'right'}},
          margin:{left:ML,right:MR}, theme:'plain',
          tableLineColor:[220,220,220] as any, tableLineWidth:0.1,
        })
        y=(doc as any).lastAutoTable.finalY+8
      }
    }
  }

  // ═══════════════════════════════════════════════════════
  // SECTION: OKR
  // ═══════════════════════════════════════════════════════
  if (sections.includes('okr')) {
    if (y>200) y=nPage(doc)
    y = secTitle(doc, '06. OKR & Progress Target', y)

    const objectives = allData.okrData?.objectives||[]
    if (!objectives.length) {
      y = infoBox(doc,'Belum ada OKR. Buat OKR di menu OKR & Target untuk tampil di sini.',y,'warn')
    } else {
      const onTrack  = objectives.filter((o:any)=>o.status==='on-track').length
      const atRisk   = objectives.filter((o:any)=>o.status==='at-risk').length
      const offTrack = objectives.filter((o:any)=>o.status==='off-track').length
      const done     = objectives.filter((o:any)=>o.status==='completed').length

      doc.setFillColor(...C.grayL); doc.rect(ML,y,CW,14,'F')
      const statusSummary = [
        {label:`[OK] On Track: ${onTrack}`, c:C.green},
        {label:`[CEK] At Risk: ${atRisk}`,  c:C.yellow},
        {label:`[!!] Off Track: ${offTrack}`,c:C.red},
        {label:`[TOP] Selesai: ${done}`,    c:C.teal},
      ]
      statusSummary.forEach((s,i)=>{
        doc.setTextColor(...(s.c as [number,number,number])); doc.setFontSize(9); doc.setFont('helvetica','bold')
        doc.text(s.label, ML+6+i*47, y+9)
      })
      doc.setTextColor(...C.dark); y+=18

      autoTable(doc,{
        startY:y,
        head:[['Objective','Dept','Progress','Status','KR Tercapai']],
        body: objectives.slice(0,10).map((obj:any)=>{
          const prog = obj.overallProgress||0
          const krDone = (obj.keyResults||[]).filter((kr:any)=>(kr.progress||0)>=100).length
          return [
            String(obj.title||'').substring(0,45)+(String(obj.title||'').length>45?'...':''),
            obj.department||'Custom', `${prog}%`,
            obj.status==='on-track'?'[OK] On Track':
            obj.status==='at-risk'?'[CEK] At Risk':
            obj.status==='off-track'?'[!!] Off Track':
            obj.status==='completed'?'[TOP] Selesai':'Pending',
            `${krDone}/${(obj.keyResults||[]).length}`,
          ]
        }),
        headStyles:tHead(), bodyStyles:tBody(), alternateRowStyles:tAlt(),
        columnStyles:{0:{cellWidth:72},1:{cellWidth:25,halign:'center'},2:{cellWidth:20,halign:'center',fontStyle:'bold'},3:{cellWidth:32,halign:'center'},4:{cellWidth:19,halign:'center'}},
        margin:{left:ML,right:MR}, theme:'plain',
        tableLineColor:[220,220,220] as any, tableLineWidth:0.1,
      })
      y=(doc as any).lastAutoTable.finalY+8
    }
  }

  // ═══════════════════════════════════════════════════════
  // SECTION: AI INSIGHT
  // ═══════════════════════════════════════════════════════
  if (config.includeAIInsight) {
    y = nPage(doc)
    y = secTitle(doc, '07. Analisis AI & Rekomendasi Strategis', y); y+=2

    interface Insight { level:'KRITIS'|'PENTING'|'OPTIMASI'; title:string; detail:string; action:string }
    const insights: Insight[] = []

    const refRate = tok?.refundRate||ttk?.refundRate||0
    const refAmt  = tok?.totalRefund||ttk?.totalRefund||0
    if (refRate>15) insights.push({
      level:'KRITIS',
      title: `Refund Affiliate ${fP(refRate,1)} — Jauh Di Atas Batas Normal`,
      detail: `Total ${fRp(refAmt)} GMV dikembalikan dari total ${fRp(tok?.totalGMV||0)}.` +
        (tok?.highRefund?.length ? ` Penyumbang terbesar: ${tok.highRefund.slice(0,3).map((c:any)=>'@'+c.username+'('+fP(c.refundRate,0)+')').join(', ')}.` : ''),
      action:'Investigasi kreator dengan refund > 20%. Audit kualitas konten dan klaim produk. Terapkan SOP screening kreator. Pertimbangkan temporary hold pada kreator bermasalah.'
    })

    const actRate = tok?.activeRate||0
    if (actRate<10) insights.push({
      level:'PENTING',
      title: `Active Rate Kreator Sangat Rendah (${fP(actRate,1)})`,
      detail: `Hanya ${tok?.activeCreators||0} dari ${tok?.totalCreators||0} kreator terdaftar yang menghasilkan penjualan. Potensi GMV besar yang belum tergarap.`,
      action:'Jalankan program reaktivasi 30 hari: kirim brief konten terbaru + sample produk ke kreator Mid & Macro tidak aktif. Target: naikkan active rate ke 15% dalam 60 hari.'
    })

    if (vid && vid.avgCTR<3) insights.push({
      level:'PENTING',
      title: `CTR Video ${fP(vid.avgCTR,2)} Di Bawah Benchmark 3%`,
      detail: `Watch rate ${fP(vid.avgWatchRate,2)} juga rendah dari target 10%, menandakan hook video tidak cukup kuat di 3 detik pertama.`,
      action:'Replikasi formula hook video terbaik. A/B test opening dengan pertanyaan provokatif vs fakta mengejutkan. Target: naik ke CTR 3%+ dalam 30 hari.'
    })

    if (gm && gm.overallROI<8) insights.push({
      level:'PENTING',
      title: `ROI GMV Max ${fX(gm.overallROI)} — Masih Di Bawah Target 8x`,
      detail: `Sudah ada ${gm.winnerCount} creative dengan ROI >= 8x dari ${gm.totalCreatives} aktif.${gm.borosCreatives?.length?` Ditemukan ${gm.borosCreatives.length} creative boros (cost tinggi, ROI < 3x).`:''}`,
      action:`Scale budget 20-30% per 3 hari pada ${gm.winnerCount} winner creative. Pause creative dengan ROI < 3x dan cost > Rp 300K.`
    })

    if (vid && vid.avgGPM>=100000) insights.push({
      level:'OPTIMASI',
      title: `GPM Video Organik ${fRp(vid.avgGPM)} — Melampaui Benchmark`,
      detail: `Benchmark GPM > Rp 100K sudah tercapai. Video organik dominan dengan formula konten edukasi + testimonial yang terbukti convert.`,
      action:'Jadikan formula konten top video sebagai template brief untuk semua kreator affiliate. Buat dokumen Content Playbook dari analisis top 5 video.'
    })

    if (ov && ov.cvr<8) insights.push({
      level:'OPTIMASI',
      title: `Konversi Toko ${fP(ov.cvr,2)} — Ada Ruang Perbaikan`,
      detail: `Dari ${fN(ov.visits)} kunjungan toko menghasilkan ${fN(ov.orders)} pesanan. Ratio kunjungan ke order masih bisa ditingkatkan.`,
      action:'Optimasi halaman produk: foto lebih menarik, deskripsi yang menjawab keraguan pembeli, price bundling yang lebih visible. Target konversi > 8% dalam 2 bulan.'
    })

    if (insights.length === 0) insights.push({
      level:'OPTIMASI',
      title:'Semua Metrik Utama Dalam Kondisi Baik',
      detail:'Tidak ada metrik kritis yang memerlukan perhatian segera saat ini.',
      action:'Pertahankan konsistensi upload konten dan monitoring ROI harian. Fokus pada scaling yang sudah berjalan baik.'
    })

    insights.forEach((ins) => {
      if (y>258) y=nPage(doc)
      const iC = ins.level==='KRITIS'?C.red : ins.level==='PENTING'?C.yellow : C.green
      const iBg = ins.level==='KRITIS'?C.redL : ins.level==='PENTING'?C.yellowL : C.greenL
      const h = 40
      doc.setFillColor(...(iBg as [number,number,number])); doc.roundedRect(ML,y,CW,h,2,2,'F')
      doc.setFillColor(...(iC as [number,number,number]));  doc.rect(ML,y,3,h,'F')
      doc.setFillColor(...(iC as [number,number,number])); doc.roundedRect(ML+6,y+3,ins.level==='OPTIMASI'?22:18,5.5,1,1,'F')
      doc.setTextColor(...C.white); doc.setFontSize(6.5); doc.setFont('helvetica','bold')
      doc.text(ins.level, ML+8, y+7.5)
      doc.setTextColor(...C.dark); doc.setFontSize(10); doc.setFont('helvetica','bold')
      doc.text(ins.title, ML+6, y+16)
      doc.setTextColor(...C.gray); doc.setFontSize(8); doc.setFont('helvetica','normal')
      const dl = doc.splitTextToSize(ins.detail, CW-12)
      doc.text(dl[0]||'', ML+6, y+23)
      if (dl[1]) doc.text(dl[1], ML+6, y+28)
      doc.setTextColor(20,80,20); doc.setFontSize(7.5); doc.setFont('helvetica','bold')
      doc.text('Aksi: ', ML+6, y+35)
      doc.setFont('helvetica','normal')
      const al = doc.splitTextToSize(ins.action, CW-20)
      doc.text(al[0]||'', ML+20, y+35)
      doc.setTextColor(...C.dark)
      y += h+5
    })
  }

  // ═══════════════════════════════════════════════════════
  // HAL PENUTUP
  // ═══════════════════════════════════════════════════════
  nPage(doc)
  doc.setFillColor(...C.navy); doc.rect(0,0,PW,PH,'F')
  doc.setFillColor(...C.cyan); doc.rect(0,PH-35,PW,35,'F')
  doc.setTextColor(...C.white); doc.setFontSize(28); doc.setFont('helvetica','bold')
  doc.text('Terima Kasih', PW/2, PH/2-20, {align:'center'})
  doc.setFontSize(12); doc.setFont('helvetica','normal'); doc.setTextColor(176,190,197)
  doc.text(`${_brand} — ${_period}`, PW/2, PH/2-8, {align:'center'})
  doc.setFontSize(9)
  doc.text('Laporan ini digenerate secara otomatis dari Dashboard Bisnis', PW/2, PH/2+5, {align:'center'})
  doc.text(new Date().toLocaleDateString('id-ID',{weekday:'long',year:'numeric',month:'long',day:'numeric'}), PW/2, PH/2+13, {align:'center'})

  const fname = `${(config.name||'Laporan').replace(/\s+/g,'_')}_${new Date().toISOString().slice(0,10)}.pdf`
  doc.save(fname)
}

// ════════════════════════════════════════
// EXCEL GENERATION (preserved from original)
// ════════════════════════════════════════
export function generateExcelReport(config: any, allData: any): void {
  const wb = XLSX.utils.book_new();

  if (config.sections.includes('overview') && allData.overviewData?.length > 0) {
    const s = allData.overviewData[allData.overviewData.length - 1].summary;
    const wsData = [
      ['OVERVIEW BISNIS'],
      [],
      ['Metrik', 'Nilai'],
      ['Total GMV', s.gmv],
      ['Total Pesanan', s.orders],
      ['Pembeli Unik', s.uniqueBuyers],
      ['Kunjungan Toko', s.shopVisits],
      ['Konversi (%)', s.conversionRate],
      ['Refund (Rp)', s.refund],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(wsData), 'Overview');
  }

  if (config.sections.includes('affiliate') && allData.affiliateData?.length > 0) {
    const latest = allData.affiliateData[allData.affiliateData.length - 1];
    const headers = ['Username', 'GMV', 'Orders', 'Videos', 'LIVE', 'Tier', 'Refund%', 'Komisi', 'Status'];
    const rows = [...(latest.creators || [])]
      .sort((a: any, b: any) => (b.affiliateGMV ?? 0) - (a.affiliateGMV ?? 0))
      .map((c: any) => [
        c.creatorUsername, c.affiliateGMV, c.affiliateOrders, c.affiliateShoppableVideos,
        c.affiliateLiveStreams, c.creatorTier, `${(c.refundRate ?? 0).toFixed(1)}%`, c.estCommission, c.creatorStatus,
      ]);
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([headers, ...rows]), 'Affiliate');
  }

  if (config.sections.includes('video') && allData.videoData?.length > 0) {
    const latest = allData.videoData[allData.videoData.length - 1];
    const headers = ['Caption', 'GMV', 'GPM', 'CTR%', 'CTOR%', 'VV', 'Status'];
    const rows = [...(latest.videos || [])]
      .sort((a: any, b: any) => (b.gmv ?? 0) - (a.gmv ?? 0))
      .slice(0, 100)
      .map((v: any) => [
        v.videoInfo, v.gmv, v.gpm, v.ctr, v.ctor, v.vv, v.videoStatus,
      ]);
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([headers, ...rows]), 'Video');
  }

  if (config.sections.includes('okr') && allData.okrData?.objectives?.length > 0) {
    const headers = ['Objective', 'Department', 'Progress%', 'Status', 'KR Tercapai'];
    const rows = allData.okrData.objectives.map((obj: any) => [
      obj.title, obj.department, obj.overallProgress, obj.status,
      `${(obj.keyResults ?? []).filter((kr: any) => (kr.progress ?? 0) >= 100).length}/${(obj.keyResults ?? []).length}`,
    ]);
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([headers, ...rows]), 'OKR');
  }

  const filename = `${config.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, filename);
}
