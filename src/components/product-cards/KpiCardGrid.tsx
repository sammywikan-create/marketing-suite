"use client";

interface KpiCard {
  icon: string;
  label: string;
  value: string;
  sub?: string;
  badge?: { text: string; color: string };
}

export default function KpiCardGrid({ cards, cols = 3 }: { cards: KpiCard[]; cols?: number }) {
  const gridClass = cols === 4 ? "grid-cols-2 lg:grid-cols-4" : "grid-cols-2 lg:grid-cols-3";
  return (
    <div className={`grid ${gridClass} gap-4`}>
      {cards.map((c, i) => (
        <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400 font-medium">{c.icon} {c.label}</span>
            {c.badge && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${c.badge.color}`}>
                {c.badge.text}
              </span>
            )}
          </div>
          <div className="text-xl font-bold text-gray-900">{c.value}</div>
          {c.sub && <div className="text-xs text-gray-400 mt-1">{c.sub}</div>}
        </div>
      ))}
    </div>
  );
}
