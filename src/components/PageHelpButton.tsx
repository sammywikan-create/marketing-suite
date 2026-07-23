"use client";
import { useState } from "react";
import { HelpCircle, X, Sparkles, CheckCircle2, Target, BookOpen } from "lucide-react";
import { getPageHelp } from "@/lib/pageHelpData";
import Modal from "./Modal";

export default function PageHelpButton({ tabKey }: { tabKey: string }) {
  const [open, setOpen] = useState(false);
  const help = getPageHelp(tabKey);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-primary/30 bg-primary/10 text-primary text-xs font-bold hover:bg-primary hover:text-white transition-all shadow-sm shrink-0"
        title={`Petunjuk & Manfaat Halaman: ${help.title}`}
      >
        <HelpCircle size={15} />
        <span className="hidden sm:inline">Bantuan Halaman</span>
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title={`Panduan Halaman: ${help.title}`} wide>
        <div className="space-y-4 text-sm">
          {/* Header Tag */}
          <div className="flex items-center justify-between border-b border-border pb-3">
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary uppercase tracking-wider">
              {help.groupTitle}
            </span>
            <span className="text-xs text-muted font-medium">Target User: {help.targetUser}</span>
          </div>

          {/* Tujuan */}
          <div className="bg-muted/30 p-4 rounded-xl space-y-1">
            <div className="flex items-center gap-2 font-bold text-foreground text-xs uppercase tracking-wider">
              <Target size={16} className="text-primary" /> Tujuan Utama Halaman Ini:
            </div>
            <p className="text-foreground leading-relaxed text-sm font-medium">{help.tujuan}</p>
          </div>

          {/* Manfaat */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 font-bold text-foreground text-xs uppercase tracking-wider">
              <Sparkles size={16} className="text-emerald-500" /> Manfaat Praktis untuk Anda & Direksi:
            </div>
            <div className="space-y-2 pl-1">
              {help.manfaat.map((m, idx) => (
                <div key={idx} className="flex items-start gap-2.5 text-xs text-muted leading-relaxed">
                  <CheckCircle2 size={15} className="text-emerald-500 shrink-0 mt-0.5" />
                  <span>{m}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Cara Guna */}
          <div className="bg-primary/5 border border-primary/20 p-4 rounded-xl space-y-1 text-xs">
            <div className="flex items-center gap-2 font-bold text-primary text-xs">
              <BookOpen size={16} /> Petunjuk Penggunaan & Input Data:
            </div>
            <p className="text-foreground leading-relaxed">{help.caraGuna}</p>
          </div>

          {/* Footer Note */}
          <div className="pt-3 border-t border-border flex justify-end">
            <button
              onClick={() => setOpen(false)}
              className="px-5 py-2 bg-primary text-white font-bold text-xs rounded-xl shadow hover:opacity-90 transition-opacity"
            >
              Saya Mengerti
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
