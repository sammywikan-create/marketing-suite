"use client";
import { useState, useMemo } from "react";
import { Calculator } from "lucide-react";
import { formatRupiah, fmtDec } from "@/utils/gmvAnalyzer";

interface CalcInputs {
  hargaJual: number;
  hpp: number;
  biayaKirim: number;
  totalBudget: number;
  targetROI: number;
  estCTR: number;
  estCVR: number;
  estImpresi: number;
}

const defaults: CalcInputs = {
  hargaJual: 150000,
  hpp: 50000,
  biayaKirim: 15000,
  totalBudget: 10000000,
  targetROI: 5,
  estCTR: 3,
  estCVR: 10,
  estImpresi: 500000,
};

function InputField({ label, value, onChange, prefix, suffix, hint }: {
  label: string; value: number; onChange: (v: number) => void; prefix?: string; suffix?: string; hint?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-muted mb-1">{label}</label>
      <div className="relative">
        {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted">{prefix}</span>}
        <input
          type="number"
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          className={`w-full px-3 py-2.5 border border-border rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary ${prefix ? "pl-9" : ""} ${suffix ? "pr-10" : ""}`}
        />
        {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted">{suffix}</span>}
      </div>
      {hint && <p className="text-xs text-muted mt-0.5">{hint}</p>}
    </div>
  );
}

function OutputRow({ label, value, highlight, color }: { label: string; value: string; highlight?: boolean; color?: string }) {
  return (
    <div className={`flex items-center justify-between py-3 px-4 ${highlight ? "bg-primary-50 rounded-lg" : "border-b border-border"}`}>
      <span className="text-sm text-muted">{label}</span>
      <span className={`text-sm font-bold ${color || "text-foreground"}`}>{value}</span>
    </div>
  );
}

export default function GMVCalculatorScreen() {
  const [inputs, setInputs] = useState<CalcInputs>(defaults);

  const update = (key: keyof CalcInputs, val: number) => {
    setInputs(prev => ({ ...prev, [key]: val }));
  };

  const calc = useMemo(() => {
    const { hargaJual, hpp, biayaKirim, totalBudget, targetROI, estCTR, estCVR, estImpresi } = inputs;

    const marginKotorPerUnit = hargaJual - hpp - biayaKirim;
    const marginKotorPct = hargaJual > 0 ? (marginKotorPerUnit / hargaJual) * 100 : 0;

    const estKlik = estImpresi * (estCTR / 100);
    const estOrder = estKlik * (estCVR / 100);
    const estGrossRevenue = estOrder * hargaJual;
    const estROI = totalBudget > 0 ? estGrossRevenue / totalBudget : 0;
    const estProfitBersih = (estOrder * marginKotorPerUnit) - totalBudget;

    const breakEvenOrders = marginKotorPerUnit > 0 ? Math.ceil(totalBudget / marginKotorPerUnit) : 0;
    const breakEvenRevenue = breakEvenOrders * hargaJual;

    let statusLabel: string;
    let statusColor: string;
    let statusEmoji: string;
    if (estProfitBersih > 0 && estROI >= targetROI) {
      statusLabel = "SANGAT PROFITABLE"; statusColor = "text-green-700"; statusEmoji = "🏆";
    } else if (estProfitBersih > 0) {
      statusLabel = "PROFITABLE"; statusColor = "text-green-600"; statusEmoji = "✅";
    } else if (estProfitBersih === 0) {
      statusLabel = "BREAK EVEN"; statusColor = "text-orange-600"; statusEmoji = "⚠️";
    } else {
      statusLabel = "RUGI"; statusColor = "text-red-700"; statusEmoji = "🔴";
    }

    return {
      marginKotorPerUnit,
      marginKotorPct,
      estKlik,
      estOrder,
      estGrossRevenue,
      estROI,
      estProfitBersih,
      breakEvenOrders,
      breakEvenRevenue,
      statusLabel,
      statusColor,
      statusEmoji,
    };
  }, [inputs]);

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary"><Calculator size={20} /></div>
        <div>
          <h1 className="text-xl font-bold">ROI Calculator</h1>
          <p className="text-sm text-muted">Kalkulasi profitabilitas campaign secara real-time</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Section */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-border">
          <h3 className="font-semibold mb-4">📥 Input Parameter</h3>
          <div className="grid grid-cols-2 gap-4">
            <InputField label="Harga Jual Produk" value={inputs.hargaJual} onChange={v => update("hargaJual", v)} prefix="Rp" />
            <InputField label="HPP / Modal Produk" value={inputs.hpp} onChange={v => update("hpp", v)} prefix="Rp" />
            <InputField label="Biaya Pengiriman" value={inputs.biayaKirim} onChange={v => update("biayaKirim", v)} prefix="Rp" />
            <InputField label="Total Budget Iklan" value={inputs.totalBudget} onChange={v => update("totalBudget", v)} prefix="Rp" />
            <InputField label="Target ROI" value={inputs.targetROI} onChange={v => update("targetROI", v)} suffix="x" />
            <InputField label="Estimasi CTR" value={inputs.estCTR} onChange={v => update("estCTR", v)} suffix="%" hint="Benchmark: 3-5%" />
            <InputField label="Estimasi CVR" value={inputs.estCVR} onChange={v => update("estCVR", v)} suffix="%" hint="Benchmark: 10-15%" />
            <InputField label="Estimasi Impressi" value={inputs.estImpresi} onChange={v => update("estImpresi", v)} />
          </div>
        </div>

        {/* Output Section */}
        <div className="space-y-4">
          {/* Status Card */}
          <div className={`rounded-xl p-5 border-2 ${calc.estProfitBersih > 0 ? "bg-green-50 border-green-200" : calc.estProfitBersih === 0 ? "bg-orange-50 border-orange-200" : "bg-red-50 border-red-200"}`}>
            <div className="text-center">
              <span className="text-3xl">{calc.statusEmoji}</span>
              <p className={`text-xl font-bold mt-1 ${calc.statusColor}`}>{calc.statusLabel}</p>
              <p className="text-sm text-muted mt-1">
                Est. Profit: <strong className={calc.statusColor}>{formatRupiah(calc.estProfitBersih)}</strong>
              </p>
            </div>
          </div>

          {/* Calculation Results */}
          <div className="bg-white rounded-xl shadow-sm border border-border overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-border">
              <h3 className="font-semibold text-sm">📊 Hasil Kalkulasi</h3>
            </div>
            <div>
              <OutputRow label="Margin Kotor per Unit" value={formatRupiah(calc.marginKotorPerUnit)} color={calc.marginKotorPerUnit > 0 ? "text-green-700" : "text-red-700"} />
              <OutputRow label="Margin Kotor (%)" value={fmtDec(calc.marginKotorPct, 1) + "%"} />
              <OutputRow label="Estimasi Klik" value={Math.round(calc.estKlik).toLocaleString("id-ID")} />
              <OutputRow label="Estimasi Order" value={Math.round(calc.estOrder).toLocaleString("id-ID")} />
              <OutputRow label="Estimasi Gross Revenue" value={formatRupiah(calc.estGrossRevenue)} highlight />
              <OutputRow label="Estimasi ROI" value={fmtDec(calc.estROI, 2) + "x"} color={calc.estROI >= inputs.targetROI ? "text-green-700" : "text-red-700"} highlight />
              <OutputRow label="Estimasi Profit Bersih" value={formatRupiah(calc.estProfitBersih)} color={calc.estProfitBersih >= 0 ? "text-green-700" : "text-red-700"} highlight />
            </div>
          </div>

          {/* Break Even */}
          <div className="bg-white rounded-xl shadow-sm border border-border overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-border">
              <h3 className="font-semibold text-sm">📈 Break-Even Analysis</h3>
            </div>
            <div>
              <OutputRow label="Break-Even Orders" value={calc.breakEvenOrders.toLocaleString("id-ID") + " orders"} />
              <OutputRow label="Break-Even Revenue" value={formatRupiah(calc.breakEvenRevenue)} />
              <div className="px-4 py-3">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted">Progress ke Break-Even</span>
                  <span className="font-semibold">{calc.breakEvenOrders > 0 ? fmtDec(Math.min(100, (calc.estOrder / calc.breakEvenOrders * 100)), 0) : 0}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${calc.estOrder >= calc.breakEvenOrders ? "bg-green-500" : "bg-orange-500"}`} style={{ width: `${calc.breakEvenOrders > 0 ? Math.min(100, (calc.estOrder / calc.breakEvenOrders * 100)) : 0}%` }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
