"use client";
import { useState } from "react";
import { useStoreManager } from "@/store/useStoreManager";
import { Settings, Trash2, Edit3, Plus } from "lucide-react";
import { formatRupiah } from "@/utils/gmvAnalyzer";
import AddStoreModal from "@/components/AddStoreModal";

export default function StoreSettingsScreen() {
  const { stores, activeStoreId, deleteStore, setActiveStore } = useStoreManager();
  const [editId, setEditId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Hapus toko "${name}" beserta SEMUA datanya?\nTindakan ini tidak bisa dibatalkan.`)) return;
    deleteStore(id);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings size={24} className="text-gray-600" /> Kelola Toko
          </h1>
          <p className="text-sm text-gray-500">{stores.length} toko terdaftar</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} /> Tambah Toko Baru
        </button>
      </div>

      {stores.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center">
          <p className="text-gray-500">Belum ada toko. Klik tombol di atas untuk membuat toko pertama.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {stores.map((store) => {
            const totalOverviewGMV = store.overviewData.reduce((a, d) => a + d.summary.gmv, 0);
            const totalVideoGMV = store.videoData.reduce((a, d) => a + d.summary.totalGMV, 0);
            const gmvMonths = Object.keys(store.gmvData).length;
            const isActive = store.id === activeStoreId;

            return (
              <div
                key={store.id}
                className={`bg-white rounded-xl border-2 p-6 transition-all ${isActive ? "shadow-md" : "hover:shadow-sm"}`}
                style={{ borderColor: isActive ? store.color : "#E5E7EB" }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
                      style={{ backgroundColor: store.color + "20", border: `2px solid ${store.color}` }}
                    >
                      {store.avatar}
                    </div>
                    <div>
                      <p className="font-bold text-sm" style={{ color: store.color }}>{store.name}</p>
                      <p className="text-[10px] text-gray-400">
                        Dibuat {new Date(store.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                      {isActive && (
                        <span className="inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: store.color }}>
                          AKTIF
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setEditId(store.id)}
                      className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500" title="Edit"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(store.id, store.name)}
                      className="p-2 rounded-lg hover:bg-red-50 transition-colors text-gray-400 hover:text-red-500" title="Hapus"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 text-xs mb-4">
                  <div className="bg-gray-50 rounded-lg p-2.5 text-center">
                    <p className="text-gray-500">GMV Max</p>
                    <p className="font-bold">{gmvMonths} bulan</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2.5 text-center">
                    <p className="text-gray-500">Overview</p>
                    <p className="font-bold">{store.overviewData.length} bulan</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2.5 text-center">
                    <p className="text-gray-500">Video</p>
                    <p className="font-bold">{store.videoData.length} bulan</p>
                  </div>
                </div>

                <div className="text-xs space-y-1 mb-4">
                  {totalOverviewGMV > 0 && (
                    <p className="text-gray-600">📊 Total GMV Overview: <strong>{formatRupiah(totalOverviewGMV)}</strong></p>
                  )}
                  {totalVideoGMV > 0 && (
                    <p className="text-gray-600">📹 Total GMV Video: <strong>{formatRupiah(totalVideoGMV)}</strong></p>
                  )}
                </div>

                {!isActive && (
                  <button
                    onClick={() => setActiveStore(store.id)}
                    className="w-full py-2 rounded-lg border text-xs font-semibold transition-colors hover:bg-gray-50"
                    style={{ borderColor: store.color, color: store.color }}
                  >
                    Jadikan Aktif
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {editId && <AddStoreModal editStoreId={editId} onClose={() => setEditId(null)} />}
      {showAdd && <AddStoreModal onClose={() => setShowAdd(false)} />}
    </div>
  );
}
