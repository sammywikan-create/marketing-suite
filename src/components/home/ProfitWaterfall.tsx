"use client";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";

interface WaterfallStep {
  label: string;
  value: number;
}

interface ProfitWaterfallProps {
  omzet: number;
  costs: WaterfallStep[];
  grossProfit: number;
}

interface WaterfallRow {
  name: string;
  base: number;
  size: number;
  actual: number;
  color: string;
  kind: "in" | "out" | "result";
}

const fRp = (n: number) => "Rp " + Math.round(n).toLocaleString("id-ID");
const COST_COLORS = ["#f97316", "#8b5cf6", "#ef4444", "#10b981", "#f59e0b", "#6366f1", "#ec4899", "#14b8a6"];

/**
 * Waterfall chart Omzet → Biaya → Gross Profit.
 * Dibangun dengan stacked bar Recharts: bar "base" transparan sebagai penyangga
 * dan bar "size" berwarna sebagai segmen nilai.
 */
export default function ProfitWaterfall({ omzet, costs, grossProfit }: ProfitWaterfallProps) {
  const rows: WaterfallRow[] = [];

  rows.push({ name: "Omzet", base: 0, size: omzet, actual: omzet, color: "#059669", kind: "in" });

  let running = omzet;
  costs
    .filter((c) => c.value > 0)
    .forEach((c, i) => {
      running -= c.value;
      rows.push({
        name: c.label,
        base: running,
        size: c.value,
        actual: -c.value,
        color: COST_COLORS[i % COST_COLORS.length],
        kind: "out",
      });
    });

  rows.push({
    name: "Gross Profit",
    base: Math.min(0, grossProfit),
    size: Math.abs(grossProfit),
    actual: grossProfit,
    color: grossProfit >= 0 ? "#2563eb" : "#dc2626",
    kind: "result",
  });

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={rows} margin={{ top: 10, right: 16, left: 4, bottom: 24 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 10, fill: "#9ca3af" }}
          axisLine={false}
          tickLine={false}
          interval={0}
          angle={-18}
          textAnchor="end"
          height={52}
        />
        <YAxis
          tick={{ fontSize: 10, fill: "#9ca3af" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `${(Number(v) / 1e6).toFixed(0)}Jt`}
        />
        <Tooltip
          cursor={{ fill: "rgba(148,163,184,0.08)" }}
          contentStyle={{ borderRadius: "12px", border: "1px solid #e5e7eb", fontSize: "12px" }}
          formatter={(_val, _name, entry) => {
            const p = entry?.payload as WaterfallRow | undefined;
            if (!p) return ["", ""];
            const sign = p.kind === "out" ? "−" : p.actual < 0 ? "−" : "";
            return [`${sign}${fRp(Math.abs(p.actual))}`, p.kind === "out" ? "Pengurang" : p.kind === "in" ? "Pemasukan" : "Hasil"];
          }}
          labelStyle={{ fontWeight: 700, color: "#111827" }}
        />
        <ReferenceLine y={0} stroke="#cbd5e1" />
        <Bar dataKey="base" stackId="wf" fill="transparent" isAnimationActive={false} />
        <Bar dataKey="size" stackId="wf" radius={[4, 4, 0, 0]} maxBarSize={64}>
          {rows.map((row, i) => (
            <Cell key={i} fill={row.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
