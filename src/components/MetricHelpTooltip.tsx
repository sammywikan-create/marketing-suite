"use client";
import React, { useState } from "react";
import { HelpCircle } from "lucide-react";

interface MetricHelpTooltipProps {
  title: string;
  desc: string;
  formula?: string;
  benchmark?: string;
  position?: "top" | "bottom" | "left" | "right";
  dark?: boolean;
}

export default function MetricHelpTooltip({
  title,
  desc,
  formula,
  benchmark,
  position = "top",
  dark = false,
}: MetricHelpTooltipProps) {
  const [show, setShow] = useState(false);

  const getPositionClasses = () => {
    switch (position) {
      case "bottom":
        return "top-full mt-2 left-1/2 -translate-x-1/2";
      case "left":
        return "right-full mr-2 top-1/2 -translate-y-1/2";
      case "right":
        return "left-full ml-2 top-1/2 -translate-y-1/2";
      case "top":
      default:
        return "bottom-full mb-2 left-1/2 -translate-x-1/2";
    }
  };

  return (
    <div className="relative inline-flex items-center group/tooltip shrink-0">
      <button
        type="button"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={(e) => {
          e.stopPropagation();
          setShow(!show);
        }}
        className={`size-4.5 rounded-full flex items-center justify-center text-[11px] font-extrabold transition-all border shadow-sm cursor-help ${
          dark
            ? "bg-white/20 hover:bg-white text-white hover:text-slate-900 border-white/30"
            : "bg-muted/80 hover:bg-primary text-muted-foreground hover:text-white border-border/80"
        }`}
        aria-label={`Keterangan ${title}`}
      >
        ?
      </button>

      {/* Floating Tooltip Popover */}
      <div
        className={`absolute ${getPositionClasses()} w-64 p-3.5 bg-slate-900/95 backdrop-blur-md text-white rounded-xl shadow-2xl border border-white/20 transition-all duration-200 z-50 text-xs text-left pointer-events-none ${
          show ? "opacity-100 scale-100" : "opacity-0 scale-95"
        }`}
      >
        <div className="font-bold text-white mb-1.5 border-b border-white/15 pb-1 flex items-center gap-1.5">
          <HelpCircle size={13} className="text-primary shrink-0" />
          <span>{title}</span>
        </div>

        <p className="text-[11px] text-white/90 leading-relaxed font-normal mb-1.5">
          {desc}
        </p>

        {formula && (
          <div className="mt-1.5 pt-1.5 border-t border-white/10 text-[10px] text-amber-300 font-mono">
            <strong>Formula:</strong> {formula}
          </div>
        )}

        {benchmark && (
          <div className="mt-1 text-[10px] text-emerald-300 font-semibold">
            💡 <strong>Benchmark:</strong> {benchmark}
          </div>
        )}
      </div>
    </div>
  );
}
