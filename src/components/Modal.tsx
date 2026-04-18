"use client";
import { X } from "lucide-react";
import { ReactNode } from "react";

export default function Modal({
  open, onClose, title, children, wide
}: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className={`bg-white rounded-xl shadow-2xl ${wide ? "w-[720px]" : "w-[520px]"} max-h-[85vh] flex flex-col mx-4`}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-bold text-foreground">{title}</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100"><X size={20} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>
      </div>
    </div>
  );
}

export function FormField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mb-3">
      <label className="block text-sm font-medium text-muted mb-1">{label}</label>
      {children}
    </div>
  );
}

export const inputClass = "w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary";
export const selectClass = "w-full px-3 py-2 border border-border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary";
export const btnPrimary = "px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors";
export const btnDanger = "px-4 py-2 bg-danger text-white rounded-lg text-sm font-medium hover:opacity-90 transition-colors";
export const btnSecondary = "px-4 py-2 bg-gray-100 text-foreground rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors";
