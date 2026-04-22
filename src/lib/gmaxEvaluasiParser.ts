import * as XLSX from "xlsx";
import type {
  SKUGmaxItem,
  CampaignEtalaseItem,
  CampaignOverviewItem,
  FunnelKontenItem,
  KonseptorItem,
  EvalVideoItem,
  ViewFunnelStage,
  PenilaianPenempatan,
  GmaxEvaluasiData,
} from "@/lib/types";

// --- Helpers ---
function num(v: unknown): number {
  if (typeof v === "number") return v;
  return Number(String(v ?? "").replace(/[^0-9.\-]/g, "")) || 0;
}

function str(v: unknown): string {
  return String(v ?? "").trim();
}

function findHeaderRow(rows: unknown[][], search: string): number {
  for (let i = 0; i < Math.min(rows.length, 20); i++) {
    if (rows[i]?.some((c) => str(c).toUpperCase().includes(search.toUpperCase()))) return i;
  }
  return -1;
}

function colMap(headerRow: unknown[]): Map<string, number> {
  const map = new Map<string, number>();
  headerRow.forEach((c, i) => {
    const key = str(c).toUpperCase();
    if (key) map.set(key, i);
  });
  return map;
}

function findCol(cm: Map<string, number>, ...searches: string[]): number {
  for (const s of searches) {
    for (const [key, idx] of cm) {
      if (key.includes(s.toUpperCase())) return idx;
    }
  }
  return -1;
}

// --- Parse TRACKING SKU ---
export function parseTrackingSKU(ws: XLSX.WorkSheet): {
  skuList: SKUGmaxItem[];
  campaignEtalase: CampaignEtalaseItem[];
  periode: string;
} {
  const raw: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
  const skuList: SKUGmaxItem[] = [];
  const campaignEtalase: CampaignEtalaseItem[] = [];
  let periode = "";

  // Try to find period from first rows
  for (let i = 0; i < Math.min(5, raw.length); i++) {
    const joined = raw[i]?.map(str).join(" ") ?? "";
    if (joined.match(/\d{4}/) && (joined.toLowerCase().includes("periode") || joined.includes("~") || joined.includes("-"))) {
      periode = joined.replace(/^[^a-zA-Z0-9]*/, "").trim();
      break;
    }
  }

  // Find SKU header row
  const skuHeaderIdx = findHeaderRow(raw, "KLASIFIKASI STATUS");
  if (skuHeaderIdx === -1) {
    // Try alternative
    const alt = findHeaderRow(raw, "SKU ID");
    if (alt >= 0) {
      const cm = colMap(raw[alt]);
      const iNo = findCol(cm, "NO");
      const iNama = findCol(cm, "NAMA PRODUK");
      const iSku = findCol(cm, "SKU ID");
      const iKlas = findCol(cm, "KLASIFIKASI");
      const iGmv = findCol(cm, "GMV");
      const iTerjual = findCol(cm, "PRODUK TERJUAL", "TERJUAL");
      const iPesanan = findCol(cm, "PESANAN");
      const iGmvHari = findCol(cm, "GMV RATA", "GMV/HARI");
      const iTerjualHari = findCol(cm, "TERJUAL/HARI", "TERJUAL /HARI");
      const iPesananHari = findCol(cm, "PESANAN/HARI", "PESANAN /HARI");

      for (let r = alt + 1; r < raw.length; r++) {
        const row = raw[r];
        if (!row || !str(row[iSku >= 0 ? iSku : 0])) continue;
        if (str(row[0]).toUpperCase().includes("CAMPAIGN")) break; // reached campaign table
        skuList.push({
          no: iNo >= 0 ? num(row[iNo]) : skuList.length + 1,
          namaProduk: str(row[iNama >= 0 ? iNama : 1]),
          skuId: str(row[iSku >= 0 ? iSku : 3]),
          klasifikasiStatus: parseKlasifikasi(str(row[iKlas >= 0 ? iKlas : 4])),
          gmv: num(row[iGmv >= 0 ? iGmv : 5]),
          produkTerjual: num(row[iTerjual >= 0 ? iTerjual : 6]),
          pesanan: num(row[iPesanan >= 0 ? iPesanan : 7]),
          gmvPerHari: num(row[iGmvHari >= 0 ? iGmvHari : 8]),
          terjualPerHari: num(row[iTerjualHari >= 0 ? iTerjualHari : 9]),
          pesananPerHari: num(row[iPesananHari >= 0 ? iPesananHari : 10]),
        });
      }
    }
  } else {
    const cm = colMap(raw[skuHeaderIdx]);
    const iNo = findCol(cm, "NO SKU", "NO");
    const iNama = findCol(cm, "NAMA PRODUK");
    const iSku = findCol(cm, "SKU ID");
    const iKlas = findCol(cm, "KLASIFIKASI");
    const iGmv = findCol(cm, "GMV");
    const iTerjual = findCol(cm, "PRODUK TERJUAL", "TERJUAL");
    const iPesanan = findCol(cm, "PESANAN");
    const iGmvHari = findCol(cm, "GMV RATA", "GMV/HARI");
    const iTerjualHari = findCol(cm, "TERJUAL/HARI", "TERJUAL /HARI");
    const iPesananHari = findCol(cm, "PESANAN/HARI", "PESANAN /HARI");

    for (let r = skuHeaderIdx + 1; r < raw.length; r++) {
      const row = raw[r];
      if (!row) continue;
      const skuVal = str(row[iSku >= 0 ? iSku : 3]);
      if (!skuVal || skuVal.toUpperCase().includes("CAMPAIGN") || skuVal.toUpperCase().includes("SUPER HERO")) break;
      skuList.push({
        no: iNo >= 0 ? num(row[iNo]) : skuList.length + 1,
        namaProduk: str(row[iNama >= 0 ? iNama : 2]),
        skuId: skuVal,
        klasifikasiStatus: parseKlasifikasi(str(row[iKlas >= 0 ? iKlas : 4])),
        gmv: num(row[iGmv >= 0 ? iGmv : 5]),
        produkTerjual: num(row[iTerjual >= 0 ? iTerjual : 6]),
        pesanan: num(row[iPesanan >= 0 ? iPesanan : 7]),
        gmvPerHari: num(row[iGmvHari >= 0 ? iGmvHari : 8]),
        terjualPerHari: num(row[iTerjualHari >= 0 ? iTerjualHari : 9]),
        pesananPerHari: num(row[iPesananHari >= 0 ? iPesananHari : 10]),
      });
    }
  }

  // Find CAMPAIGN ETALASE table
  const campHeaderIdx = findHeaderRow(raw, "CAMPAIGN");
  if (campHeaderIdx >= 0) {
    const cm = colMap(raw[campHeaderIdx]);
    const iNo = findCol(cm, "NO");
    const iCamp = findCol(cm, "CAMPAIGN");
    const iEtalase = findCol(cm, "ETALASE");
    const iSku = findCol(cm, "SKU ID");
    const iNama = findCol(cm, "NAMA PRODUK");

    for (let r = campHeaderIdx + 1; r < raw.length; r++) {
      const row = raw[r];
      if (!row || (!str(row[iCamp >= 0 ? iCamp : 1]) && !str(row[iSku >= 0 ? iSku : 3]))) break;
      campaignEtalase.push({
        no: iNo >= 0 ? num(row[iNo]) : campaignEtalase.length + 1,
        namaCampaign: str(row[iCamp >= 0 ? iCamp : 1]),
        etalase: str(row[iEtalase >= 0 ? iEtalase : 2]),
        skuId: str(row[iSku >= 0 ? iSku : 3]),
        namaProduk: str(row[iNama >= 0 ? iNama : 5]),
      });
    }
  }

  return { skuList, campaignEtalase, periode };
}

function parseKlasifikasi(val: string): SKUGmaxItem["klasifikasiStatus"] {
  const u = val.toUpperCase();
  if (u.includes("SUPER HERO")) return "SUPER HERO SKU";
  if (u.includes("HERO")) return "HERO SKU";
  if (u.includes("GROWING")) return "GROWING STAR";
  if (u.includes("STAR")) return "STAR SKU";
  return "";
}

// --- Parse OVERVIEW GMAX ---
export function parseOverviewGmax(ws: XLSX.WorkSheet): CampaignOverviewItem[] {
  const raw: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
  const items: CampaignOverviewItem[] = [];

  // Find header row with "Kampanye" or "CAMPAIGN"
  const hdrIdx = findHeaderRow(raw, "KAMPANYE");
  const hdrIdx2 = hdrIdx === -1 ? findHeaderRow(raw, "CAMPAIGN") : hdrIdx;
  const hi = hdrIdx2 >= 0 ? hdrIdx2 : findHeaderRow(raw, "SET ANGGARAN");
  if (hi < 0) return items;

  const cm = colMap(raw[hi]);
  const iName = findCol(cm, "KAMPANYE", "CAMPAIGN");
  const iSetAng = findCol(cm, "SET ANGGARAN");
  const iSetRoi = findCol(cm, "SET ROI");
  const iAnggaran = findCol(cm, "ANGGARAN");
  const iGmv = findCol(cm, "GMV");
  const iRoi = findCol(cm, "ROI");
  const iCac = findCol(cm, "CAC");
  const iAbsorb = findCol(cm, "ABSORB");
  const iAchieve = findCol(cm, "ACHIEVE");

  let current: Partial<CampaignOverviewItem> | null = null;

  for (let r = hi + 1; r < raw.length; r++) {
    const row = raw[r];
    if (!row) continue;
    const nameVal = str(row[iName >= 0 ? iName : 0]).toUpperCase();
    const firstCell = str(row[0]).toUpperCase();

    // Skip empty rows
    if (!nameVal && !firstCell) continue;

    // Check for TOTAL ALL / TOTAL 7 / TOTAL 3 rows
    if (firstCell.includes("TOTAL ALL") || nameVal.includes("TOTAL ALL")) {
      if (current) {
        current.totalAnggaran = num(row[iAnggaran >= 0 ? iAnggaran : 4]);
        current.totalGmv = num(row[iGmv >= 0 ? iGmv : 5]);
        current.roi = num(row[iRoi >= 0 ? iRoi : 6]);
        current.cac = num(row[iCac >= 0 ? iCac : 7]);
        current.absorbAnggaran = str(row[iAbsorb >= 0 ? iAbsorb : 8]);
        current.achieveROI = str(row[iAchieve >= 0 ? iAchieve : 9]);
      }
      continue;
    }
    if (firstCell.includes("TOTAL 7") || nameVal.includes("TOTAL 7")) {
      if (current) {
        current.anggaran7Hari = num(row[iAnggaran >= 0 ? iAnggaran : 4]);
        current.gmv7Hari = num(row[iGmv >= 0 ? iGmv : 5]);
      }
      continue;
    }
    if (firstCell.includes("TOTAL 3") || nameVal.includes("TOTAL 3")) {
      if (current) {
        current.anggaran3Hari = num(row[iAnggaran >= 0 ? iAnggaran : 4]);
        current.gmv3Hari = num(row[iGmv >= 0 ? iGmv : 5]);
        // Finalize this campaign
        items.push(current as CampaignOverviewItem);
        current = null;
      }
      continue;
    }

    // New campaign header row (has name + set anggaran)
    if (nameVal && !nameVal.includes("TOTAL") && !nameVal.includes("KETERANGAN")) {
      if (current) items.push(current as CampaignOverviewItem);
      current = {
        namaCampaign: str(row[iName >= 0 ? iName : 0]),
        setAnggaran: num(row[iSetAng >= 0 ? iSetAng : 1]),
        setROI: num(row[iSetRoi >= 0 ? iSetRoi : 2]),
        totalAnggaran: 0,
        totalGmv: 0,
        roi: 0,
        cac: 0,
        absorbAnggaran: "",
        achieveROI: "",
        anggaran7Hari: 0,
        gmv7Hari: 0,
        anggaran3Hari: 0,
        gmv3Hari: 0,
      };
    }
  }
  if (current) items.push(current as CampaignOverviewItem);

  return items;
}

// --- Parse FUNNELING KONTEN ---
export function parseFunnelingKonten(ws: XLSX.WorkSheet): {
  funnelItems: FunnelKontenItem[];
  konseptorPembagian: KonseptorItem[];
} {
  const raw: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
  const funnelItems: FunnelKontenItem[] = [];
  const konseptorPembagian: KonseptorItem[] = [];

  // Find funnel table header
  const funnelHdr = findHeaderRow(raw, "JENIS KONTEN");
  if (funnelHdr >= 0) {
    const cm = colMap(raw[funnelHdr]);
    const iJenis = findCol(cm, "JENIS KONTEN", "JENIS");
    const iFunnel = findCol(cm, "FUNNEL");
    const iSub = findCol(cm, "SUB KONTEN", "SUB");

    for (let r = funnelHdr + 1; r < raw.length; r++) {
      const row = raw[r];
      if (!row) continue;
      const jenis = str(row[iJenis >= 0 ? iJenis : 0]);
      const funnel = str(row[iFunnel >= 0 ? iFunnel : 1]).toUpperCase();
      const sub = str(row[iSub >= 0 ? iSub : 2]);
      if (!jenis && !funnel && !sub) break;
      const parsedFunnel = funnel.includes("UPPER") ? "UPPER" : funnel.includes("LOWER") ? "LOWER" : "MIDDLE";
      funnelItems.push({ jenisKonten: jenis, funnel: parsedFunnel, subKonten: sub });
    }
  }

  // Find konseptor table header
  const konseptorHdr = findHeaderRow(raw, "CONTENT PILLAR");
  if (konseptorHdr >= 0) {
    const headerRow = raw[konseptorHdr];
    const cm = colMap(headerRow);
    const iNo = findCol(cm, "NO");
    const iJenis = findCol(cm, "JENIS");
    const iPillar = findCol(cm, "CONTENT PILLAR", "PILLAR");

    // Find konseptor name columns (after the known columns)
    const knownCols = new Set([iNo, iJenis, iPillar]);
    const konseptorCols: { name: string; idx: number }[] = [];
    (headerRow as unknown[]).forEach((c, i) => {
      if (!knownCols.has(i) && str(c) && !str(c).toUpperCase().includes("NO") && !str(c).toUpperCase().includes("JENIS") && !str(c).toUpperCase().includes("PILLAR") && !str(c).toUpperCase().includes("CONTENT")) {
        konseptorCols.push({ name: str(c), idx: i });
      }
    });

    for (let r = konseptorHdr + 1; r < raw.length; r++) {
      const row = raw[r];
      if (!row) continue;
      const pillar = str(row[iPillar >= 0 ? iPillar : 2]);
      if (!pillar || str(row[iNo >= 0 ? iNo : 0]).toUpperCase().includes("TOTAL")) break;
      konseptorPembagian.push({
        no: num(row[iNo >= 0 ? iNo : 0]) || konseptorPembagian.length + 1,
        jenis: str(row[iJenis >= 0 ? iJenis : 1]),
        contentPillar: pillar,
        konseptor1: konseptorCols[0]?.name || "Konseptor 1",
        jumlah1: konseptorCols[0] ? num(row[konseptorCols[0].idx]) : 0,
        konseptor2: konseptorCols[1]?.name || "Konseptor 2",
        jumlah2: konseptorCols[1] ? num(row[konseptorCols[1].idx]) : 0,
      });
    }
  }

  return { funnelItems, konseptorPembagian };
}

// --- Parse EVAL KONSEP ---
export function parseEvalKonsep(ws: XLSX.WorkSheet, sheetType: "UPPER" | "LOWER"): EvalVideoItem[] {
  const raw: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
  const items: EvalVideoItem[] = [];

  // Find header row with "Nama Iklan" or "NAMA IKLAN"
  const hdrIdx = findHeaderRow(raw, "NAMA IKLAN");
  if (hdrIdx < 0) return items;

  const cm = colMap(raw[hdrIdx]);
  const iNama = findCol(cm, "NAMA IKLAN");
  const iStatus = findCol(cm, "STATUS");
  const iBiaya = findCol(cm, "BIAYA");
  const iImpresi = findCol(cm, "IMPRESI");
  const iCpm = findCol(cm, "CPM");
  const iJangkauan = findCol(cm, "JANGKAUAN");
  const iFrek = findCol(cm, "FREKUENSI");
  const i2dtk = findCol(cm, "2DETIK", "2DTK", "2 DETIK");
  const i6dtk = findCol(cm, "6DETIK", "6DTK", "6 DETIK");
  const i25 = findCol(cm, "25%");
  const i50 = findCol(cm, "50%");
  const i75 = findCol(cm, "75%");
  const i100 = findCol(cm, "100%");
  const iCtr = findCol(cm, "CTR");

  for (let r = hdrIdx + 1; r < raw.length; r++) {
    const row = raw[r];
    if (!row) continue;
    const nama = str(row[iNama >= 0 ? iNama : 0]);
    if (!nama) continue;
    // Skip separator/section rows
    if (nama.toUpperCase().includes("PENILAIAN") || nama.toUpperCase().includes("TOTAL")) break;

    const jangkauan = num(row[iJangkauan >= 0 ? iJangkauan : 5]);
    const v2dtk = num(row[i2dtk >= 0 ? i2dtk : 7]);
    const v6dtk = num(row[i6dtk >= 0 ? i6dtk : 8]);
    const v25 = num(row[i25 >= 0 ? i25 : 9]);
    const v50 = num(row[i50 >= 0 ? i50 : 10]);
    const v75 = num(row[i75 >= 0 ? i75 : 11]);
    const v100 = num(row[i100 >= 0 ? i100 : 12]);

    const stages: ViewFunnelStage[] = [
      { label: "Jangkauan", jumlah: jangkauan, penurunan: 0 },
      { label: "2 detik", jumlah: v2dtk, penurunan: jangkauan > 0 ? ((jangkauan - v2dtk) / jangkauan) * 100 : 0 },
      { label: "6 detik", jumlah: v6dtk, penurunan: v2dtk > 0 ? ((v2dtk - v6dtk) / v2dtk) * 100 : 0 },
      { label: "25%", jumlah: v25, penurunan: v6dtk > 0 ? ((v6dtk - v25) / v6dtk) * 100 : 0 },
      { label: "50%", jumlah: v50, penurunan: v25 > 0 ? ((v25 - v50) / v25) * 100 : 0 },
      { label: "75%", jumlah: v75, penurunan: v50 > 0 ? ((v50 - v75) / v50) * 100 : 0 },
      { label: "100%", jumlah: v100, penurunan: v75 > 0 ? ((v75 - v100) / v75) * 100 : 0 },
    ];

    const cpmVal = num(row[iCpm >= 0 ? iCpm : 4]);
    const frekVal = num(row[iFrek >= 0 ? iFrek : 6]);
    const impresiVal = num(row[iImpresi >= 0 ? iImpresi : 3]);

    const penilaianPenempatan: PenilaianPenempatan = {
      jangkauan,
      cpm: cpmVal,
      impresi: impresiVal,
      frekuensi: frekVal,
      statusCpm: cpmVal <= 2500 ? "✅" : "❌",
      statusFrekuensi: frekVal <= 1.5 ? "✅" : "❌",
    };

    items.push({
      namaIklan: nama,
      status: str(row[iStatus >= 0 ? iStatus : 1]),
      biaya: num(row[iBiaya >= 0 ? iBiaya : 2]),
      impresi: impresiVal,
      cpm: cpmVal,
      jangkauan,
      frekuensi: frekVal,
      viewFunnel: stages,
      ctr: str(row[iCtr >= 0 ? iCtr : 13]),
      penilaianPenempatan,
      sheetType,
    });
  }

  return items;
}

// --- Main parser ---
export function parseGmaxEvaluasiFile(workbook: XLSX.WorkBook, fileName: string): GmaxEvaluasiData {
  let skuList: SKUGmaxItem[] = [];
  let campaignEtalase: CampaignEtalaseItem[] = [];
  let campaignOverview: CampaignOverviewItem[] = [];
  let funnelKonten: FunnelKontenItem[] = [];
  let konseptorPembagian: KonseptorItem[] = [];
  let evalUpper: EvalVideoItem[] = [];
  let evalLower: EvalVideoItem[] = [];
  let periode = "";

  for (const name of workbook.SheetNames) {
    const ws = workbook.Sheets[name];
    const upper = name.toUpperCase();

    if (upper.includes("TRACKING SKU") || upper.includes("TRACKING")) {
      const result = parseTrackingSKU(ws);
      skuList = result.skuList;
      campaignEtalase = result.campaignEtalase;
      if (result.periode) periode = result.periode;
    } else if (upper.includes("OVERVIEW")) {
      campaignOverview = parseOverviewGmax(ws);
    } else if (upper.includes("FUNNELING")) {
      const result = parseFunnelingKonten(ws);
      funnelKonten = result.funnelItems;
      konseptorPembagian = result.konseptorPembagian;
    } else if (upper.includes("EVAL") && upper.includes("UPPER")) {
      evalUpper = parseEvalKonsep(ws, "UPPER");
    } else if (upper.includes("EVAL") && upper.includes("LOWER")) {
      evalLower = parseEvalKonsep(ws, "LOWER");
    }
  }

  return {
    skuList,
    campaignEtalase,
    campaignOverview,
    funnelKonten,
    konseptorPembagian,
    evalUpper,
    evalLower,
    periode,
    namaFile: fileName,
  };
}
