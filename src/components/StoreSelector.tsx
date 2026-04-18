"use client";
import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, Plus, BarChart2, Settings } from "lucide-react";
import { useStoreManager } from "@/store/useStoreManager";
import AddStoreModal from "./AddStoreModal";

interface Props {
  onNavigate?: (tab: string) => void;
}

export default function StoreSelector({ onNavigate }: Props) {
  const { stores, activeStoreId, setActiveStore } = useStoreManager();
  const [open, setOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const activeStore = stores.find((s) => s.id === activeStoreId);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (stores.length === 0) return null;

  return (
    <>
      <div ref={ref} className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 px-4 py-2 bg-white border-2 rounded-xl hover:shadow-md transition-all min-w-[180px]"
          style={{ borderColor: activeStore?.color || "#E5E7EB" }}
        >
          <span className="text-lg">{activeStore?.avatar || "🛒"}</span>
          <span className="font-semibold text-gray-800 text-sm truncate flex-1 text-left">
            {activeStore?.name || "Pilih Toko"}
          </span>
          <ChevronDown size={16} className={`text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>

        {open && (
          <div className="absolute top-full mt-2 left-0 w-72 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
            <div className="p-2">
              <p className="text-[10px] text-gray-400 px-3 py-1 font-semibold uppercase tracking-wider">Pilih Toko</p>
              {stores.map((store) => (
                <button
                  key={store.id}
                  onClick={() => { setActiveStore(store.id); setOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                    store.id === activeStoreId ? "bg-blue-50" : "hover:bg-gray-50"
                  }`}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0"
                    style={{ backgroundColor: store.color + "20", border: `1.5px solid ${store.color}` }}
                  >
                    {store.avatar}
                  </div>
                  <div className="text-left flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-800 truncate">{store.name}</p>
                    <p className="text-[10px] text-gray-400">
                      {store.videoData.length} video · {store.overviewData.length} overview · {Object.keys(store.gmvData).length} GMV
                    </p>
                  </div>
                  {store.id === activeStoreId && <Check size={16} className="text-blue-500 shrink-0" />}
                </button>
              ))}
            </div>
            <div className="border-t border-gray-100 p-2 space-y-0.5">
              <button
                onClick={() => { setShowModal(true); setOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg text-sm font-semibold transition-colors"
              >
                <Plus size={16} /> Tambah Toko Baru
              </button>
              {stores.length >= 2 && onNavigate && (
                <button
                  onClick={() => { onNavigate("store-compare"); setOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-purple-600 hover:bg-purple-50 rounded-lg text-sm font-semibold transition-colors"
                >
                  <BarChart2 size={16} /> Bandingkan 2 Toko
                </button>
              )}
              {onNavigate && (
                <button
                  onClick={() => { onNavigate("store-settings"); setOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-gray-600 hover:bg-gray-50 rounded-lg text-sm font-semibold transition-colors"
                >
                  <Settings size={16} /> Kelola Toko
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {showModal && <AddStoreModal onClose={() => setShowModal(false)} />}
    </>
  );
}
