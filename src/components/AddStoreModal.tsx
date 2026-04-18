"use client";
import { useState } from "react";
import { X } from "lucide-react";
import { useStoreManager } from "@/store/useStoreManager";

const PRESET_COLORS = [
  { value: "#1A237E", label: "Biru" },
  { value: "#1B5E20", label: "Hijau" },
  { value: "#B71C1C", label: "Merah" },
  { value: "#E65100", label: "Orange" },
  { value: "#4A148C", label: "Ungu" },
  { value: "#006064", label: "Teal" },
  { value: "#F57F17", label: "Kuning" },
  { value: "#37474F", label: "Abu" },
];

const PRESET_AVATARS = ["🛒", "🏪", "💊", "🌿", "👁️", "⭐", "🔥", "💎", "🎯", "🧴", "🍯", "💪"];

interface Props {
  onClose: () => void;
  editStoreId?: string;
}

export default function AddStoreModal({ onClose, editStoreId }: Props) {
  const { stores, addStore, updateStore, setActiveStore } = useStoreManager();
  const existing = editStoreId ? stores.find((s) => s.id === editStoreId) : null;

  const [name, setName] = useState(existing?.name || "");
  const [color, setColor] = useState(existing?.color || PRESET_COLORS[0].value);
  const [avatar, setAvatar] = useState(existing?.avatar || PRESET_AVATARS[0]);

  const handleSubmit = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (editStoreId && existing) {
      updateStore(editStoreId, { name: trimmed, color, avatar });
    } else {
      const id = await addStore(trimmed, color, avatar);
      setActiveStore(id);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold">{editStoreId ? "Edit Toko" : "Tambah Toko Baru"}</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 transition-colors"><X size={20} /></button>
        </div>

        <div className="space-y-5">
          {/* Name */}
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-1.5">Nama Toko</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="FreshVision Shop"
              className="w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
            />
          </div>

          {/* Color */}
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-1.5">Warna Identitas</label>
            <div className="flex gap-2 flex-wrap">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setColor(c.value)}
                  className={`w-9 h-9 rounded-full border-2 transition-all ${color === c.value ? "border-gray-800 scale-110 shadow-lg" : "border-transparent hover:scale-105"}`}
                  style={{ backgroundColor: c.value }}
                  title={c.label}
                />
              ))}
            </div>
          </div>

          {/* Avatar */}
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-1.5">Avatar / Emoji</label>
            <div className="flex gap-2 flex-wrap">
              {PRESET_AVATARS.map((a) => (
                <button
                  key={a}
                  onClick={() => setAvatar(a)}
                  className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center border-2 transition-all ${avatar === a ? "border-blue-500 bg-blue-50 scale-110" : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"}`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-2">Preview</p>
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                style={{ backgroundColor: color + "20", border: `2px solid ${color}` }}
              >
                {avatar}
              </div>
              <div>
                <p className="font-semibold text-sm" style={{ color }}>{name || "Nama Toko"}</p>
                <p className="text-xs text-gray-400">Toko baru</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            Batal
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name.trim()}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-40"
            style={{ backgroundColor: color }}
          >
            {editStoreId ? "Simpan Perubahan" : "Buat Toko"}
          </button>
        </div>
      </div>
    </div>
  );
}
