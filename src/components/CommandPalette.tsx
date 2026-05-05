"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { Search, CornerDownLeft } from "lucide-react";
import { TabKey } from "@/lib/types";

interface MenuItem {
  key: TabKey;
  label: string;
  group: string;
}

const ALL_ITEMS: MenuItem[] = [
  { key: "home", label: "Executive Summary", group: "Home" },
  { key: "dashboard", label: "Dashboard", group: "Marketing Planner" },
  { key: "panduan", label: "Panduan", group: "Marketing Planner" },
  { key: "content-tracker", label: "Content Tracker", group: "Marketing Planner" },
  { key: "campaign-log", label: "Campaign Log", group: "Marketing Planner" },
  { key: "kol-tracker", label: "KOL Tracker", group: "Marketing Planner" },
  { key: "hipotesis-plan", label: "Hipotesis & Plan", group: "Marketing Planner" },
  { key: "referensi-kpi", label: "Referensi KPI", group: "Marketing Planner" },
  { key: "aida-funnel", label: "AIDA Funnel", group: "Marketing Planner" },
  { key: "budget-roi", label: "Budget & ROI", group: "Marketing Planner" },
  { key: "tofu-mofu-bofu", label: "TOFU MOFU BOFU", group: "Marketing Planner" },
  { key: "target-roi-bulanan", label: "Target & ROI Bulanan", group: "Marketing Planner" },
  { key: "budgeting-harian", label: "Budgeting Harian", group: "Marketing Planner" },
  { key: "analisis-tmb", label: "Analisis TMB", group: "Marketing Planner" },
  { key: "gmv-upload", label: "Upload Data", group: "GMV Analyzer" },
  { key: "gmv-dashboard", label: "GMV Dashboard", group: "GMV Analyzer" },
  { key: "gmv-overview", label: "Overview Bisnis", group: "GMV Analyzer" },
  { key: "video-performance", label: "Video Performance", group: "GMV Analyzer" },
  { key: "affiliate", label: "Affiliate Manager", group: "GMV Analyzer" },
  { key: "live-analytics", label: "Live Analytics", group: "GMV Analyzer" },
  { key: "gmv-sku", label: "SKU Analyzer", group: "GMV Analyzer" },
  { key: "gmv-creative", label: "Creative Optimizer", group: "GMV Analyzer" },
  { key: "gmv-benchmark", label: "Top Seller Metrics", group: "GMV Analyzer" },
  { key: "gmv-checklist", label: "Checklist Evaluasi", group: "GMV Analyzer" },
  { key: "gmv-optimasi", label: "Optimasi Kreatif", group: "GMV Analyzer" },
  { key: "gmv-kalkulator", label: "ROI Calculator", group: "GMV Analyzer" },
  { key: "product-cards", label: "Kartu Produk", group: "GMV Analyzer" },
  { key: "sku-tracking", label: "SKU Tracking", group: "GMV Analyzer" },
  { key: "gmax-overview", label: "GMAX Overview", group: "GMV Maximizer" },
  { key: "gmax-evaluasi", label: "GMAX Evaluasi", group: "GMV Maximizer" },
  { key: "okr", label: "OKR Framework", group: "OKR" },
  { key: "report-builder", label: "Report Builder", group: "Laporan" },
  { key: "laporan-harian", label: "Laporan Harian", group: "Laporan" },
  { key: "compare-gabungan", label: "Compare & Gabungan", group: "Multi-Toko" },
  { key: "store-compare", label: "Bandingkan Toko", group: "Multi-Toko" },
  { key: "store-settings", label: "Kelola Toko", group: "Multi-Toko" },
];

interface Props {
  onNavigate: (tab: TabKey) => void;
}

export default function CommandPalette({ onNavigate }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Ctrl+K / Cmd+K to open
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const filtered = query.trim()
    ? ALL_ITEMS.filter(
        (item) =>
          item.label.toLowerCase().includes(query.toLowerCase()) ||
          item.group.toLowerCase().includes(query.toLowerCase()) ||
          item.key.includes(query.toLowerCase())
      )
    : ALL_ITEMS;

  // Reset selection on query change
  useEffect(() => { setSelectedIdx(0); }, [query]);

  const handleSelect = useCallback(
    (item: MenuItem) => {
      onNavigate(item.key);
      setOpen(false);
    },
    [onNavigate]
  );

  // Keyboard navigation
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && filtered[selectedIdx]) {
      e.preventDefault();
      handleSelect(filtered[selectedIdx]);
    }
  };

  // Scroll selected item into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${selectedIdx}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIdx]);

  if (!open) return null;

  // Group filtered items
  const groups: Record<string, MenuItem[]> = {};
  filtered.forEach((item) => {
    if (!groups[item.group]) groups[item.group] = [];
    groups[item.group].push(item);
  });
  let globalIdx = -1;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]" onClick={() => setOpen(false)}>
      <div className="fixed inset-0 bg-black/40 dark:bg-black/60" />
      <div
        className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <Search size={18} className="text-gray-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Cari halaman..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            className="flex-1 bg-transparent outline-none text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400"
          />
          <kbd className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-mono text-gray-400 bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[50vh] overflow-y-auto py-2">
          {filtered.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-gray-400">
              Tidak ditemukan halaman untuk &ldquo;{query}&rdquo;
            </div>
          )}
          {Object.entries(groups).map(([group, items]) => (
            <div key={group}>
              <div className="px-4 pt-2 pb-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                  {group}
                </span>
              </div>
              {items.map((item) => {
                globalIdx++;
                const idx = globalIdx;
                return (
                  <button
                    key={item.key}
                    data-idx={idx}
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setSelectedIdx(idx)}
                    className={`w-full flex items-center justify-between px-4 py-2 text-sm transition-colors ${
                      idx === selectedIdx
                        ? "bg-primary-50 dark:bg-gray-800 text-primary dark:text-blue-400"
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    }`}
                  >
                    <span>{item.label}</span>
                    {idx === selectedIdx && (
                      <CornerDownLeft size={14} className="text-gray-400 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 flex items-center gap-4 text-[11px] text-gray-400">
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-[10px] font-mono">↑↓</kbd> navigasi
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-[10px] font-mono">↵</kbd> buka
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-[10px] font-mono">Esc</kbd> tutup
          </span>
        </div>
      </div>
    </div>
  );
}
