"use client";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import type { ExecSummaryExportData } from "@/lib/exportExecSummary";

interface ExecExportMenuProps {
  data: ExecSummaryExportData;
  disabled?: boolean;
}

type BusyKind = "pdf" | "ppt" | "telegram" | null;

/**
 * Menu export Executive Summary: PDF, PowerPoint, dan kirim ringkasan ke Telegram.
 * Library export dimuat dinamis saat diklik agar tidak membebani bundle awal.
 */
export default function ExecExportMenu({ data, disabled }: ExecExportMenuProps) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<BusyKind>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const handlePdf = async () => {
    setBusy("pdf");
    try {
      const m = await import("@/lib/exportExecSummary");
      m.generateExecSummaryPdf(data);
      toast.success("PDF Executive Summary berhasil diunduh");
      setOpen(false);
    } catch {
      toast.error("Gagal membuat PDF");
    } finally {
      setBusy(null);
    }
  };

  const handlePpt = async () => {
    setBusy("ppt");
    try {
      const m = await import("@/lib/exportExecSummary");
      await m.generateExecSummaryPpt(data);
      toast.success("PowerPoint Executive Summary berhasil diunduh");
      setOpen(false);
    } catch {
      toast.error("Gagal membuat PowerPoint");
    } finally {
      setBusy(null);
    }
  };

  const handleTelegram = async () => {
    setBusy("telegram");
    try {
      const m = await import("@/lib/exportExecSummary");
      const message = m.buildExecSummaryTelegramText(data);
      const res = await fetch("/api/telegram/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "custom", message }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || "Gagal mengirim ke Telegram");
      toast.success("Ringkasan terkirim ke Telegram 🚀");
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal mengirim ke Telegram");
    } finally {
      setBusy(null);
    }
  };

  const items = [
    { key: "pdf" as const, icon: "📄", label: "Export PDF", desc: "Laporan siap cetak", onClick: handlePdf },
    { key: "ppt" as const, icon: "📽️", label: "Export PowerPoint", desc: "Deck siap presentasi", onClick: handlePpt },
    { key: "telegram" as const, icon: "✈️", label: "Kirim ke Telegram", desc: "Ringkasan ke grup tim", onClick: handleTelegram },
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={disabled || busy !== null}
        className="flex min-h-10 items-center gap-1.5 rounded-xl border border-border bg-card px-3 text-sm font-semibold text-foreground transition hover:border-primary/30 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
        title="Export Executive Summary"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {busy ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-indigo-600" />
        ) : (
          <span>⬇️</span>
        )}
        <span className="hidden sm:inline">Export</span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-12 z-40 w-64 overflow-hidden rounded-xl border border-border bg-card shadow-xl"
        >
          <div className="border-b border-border bg-background px-4 py-2.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Export Executive Summary</p>
            <p className="truncate text-xs font-semibold text-foreground">{data.periodLabel}</p>
          </div>
          {items.map((item) => (
            <button
              key={item.key}
              role="menuitem"
              onClick={item.onClick}
              disabled={busy !== null}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-background disabled:opacity-50"
            >
              <span className="text-lg">{busy === item.key ? "⏳" : item.icon}</span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-foreground">{item.label}</span>
                <span className="block text-[11px] text-muted">{item.desc}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
