"use client";
import { useState } from "react";
import { useStoreManager } from "@/store/useStoreManager";
import { ShoppingBag } from "lucide-react";

const PRESET_COLORS = [
  "#1A237E", "#1B5E20", "#B71C1C", "#E65100", "#4A148C", "#006064", "#F57F17", "#37474F",
];
const PRESET_AVATARS = ["🛒", "🏪", "💊", "🌿", "👁️", "⭐", "🔥", "💎"];

export default function SetupScreen() {
  const { addStore, setActiveStore } = useStoreManager();
  const [name, setName] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [avatar, setAvatar] = useState(PRESET_AVATARS[0]);

  const handleSubmit = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const id = await addStore(trimmed, color, avatar);
    setActiveStore(id);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-6">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-2xl bg-blue-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-200">
            <ShoppingBag size={40} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Selamat Datang! 👋</h1>
          <p className="text-gray-500">Buat toko pertama kamu untuk mulai menggunakan GMV Max Evaluator</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border p-8 space-y-6">
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-1.5">Nama Toko</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: FreshVision Shop"
              className="w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-1.5">Warna Identitas</label>
            <div className="flex gap-3 flex-wrap">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-10 h-10 rounded-full border-2 transition-all ${color === c ? "border-gray-800 scale-110 shadow-lg" : "border-transparent hover:scale-105"}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-1.5">Avatar</label>
            <div className="flex gap-2 flex-wrap">
              {PRESET_AVATARS.map((a) => (
                <button
                  key={a}
                  onClick={() => setAvatar(a)}
                  className={`w-11 h-11 rounded-xl text-xl flex items-center justify-center border-2 transition-all ${avatar === a ? "border-blue-500 bg-blue-50 scale-110" : "border-gray-200 hover:border-gray-300"}`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="bg-gray-50 rounded-xl p-4 flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
              style={{ backgroundColor: color + "20", border: `2px solid ${color}` }}
            >
              {avatar}
            </div>
            <div>
              <p className="font-bold" style={{ color }}>{name || "Nama Toko"}</p>
              <p className="text-xs text-gray-400">Toko pertama kamu</p>
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={!name.trim()}
            className="w-full py-3 rounded-xl text-white font-semibold text-sm transition-all disabled:opacity-40 hover:opacity-90 shadow-lg"
            style={{ backgroundColor: color }}
          >
            🚀 Mulai Sekarang
          </button>
        </div>
      </div>
    </div>
  );
}
