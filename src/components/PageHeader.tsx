"use client";
import { Plus, Search } from "lucide-react";
import { btnPrimary } from "./Modal";

export default function PageHeader({
  title, icon, count, onAdd, search, onSearch, addLabel
}: {
  title: string; icon: React.ReactNode; count?: number;
  onAdd?: () => void; search?: string; onSearch?: (v: string) => void;
  addLabel?: string;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">{icon}</div>
        <div>
          <h1 className="text-xl font-bold text-foreground">{title}</h1>
          {count !== undefined && <span className="text-sm text-muted">{count} item</span>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {onSearch && (
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              value={search || ""}
              onChange={e => onSearch(e.target.value)}
              placeholder="Cari..."
              className="pl-9 pr-3 py-2 border border-border rounded-lg text-sm w-56 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        )}
        {onAdd && (
          <button onClick={onAdd} className={btnPrimary + " flex items-center gap-1.5"}>
            <Plus size={16} /> {addLabel || "Tambah"}
          </button>
        )}
      </div>
    </div>
  );
}
