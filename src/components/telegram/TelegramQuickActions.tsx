"use client";

import { useState } from "react";
import { Send, Calendar, BarChart3, Target, Layers, Bell, Loader2, CheckCircle, XCircle } from "lucide-react";
import { useAlertStore } from "@/store/useAlertStore";

export default function TelegramQuickActions() {
  const { settings } = useAlertStore();
  const [sending, setSending] = useState<string | null>(null);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const sendSummary = async (type: 'today' | 'month' | 'alert' | 'target' | 'channel') => {
    if (!settings.telegram.enabled || !settings.telegram.chatId) {
      setResult({ success: false, message: 'Telegram belum diaktifkan atau Chat ID belum diisi' });
      return;
    }

    setSending(type);
    setResult(null);
    try {
      const res = await fetch("/api/telegram/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          chatId: settings.telegram.chatId,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult({ success: true, message: `${type} summary dikirim ke Telegram!` });
      } else {
        setResult({ success: false, message: data.error || 'Gagal kirim summary' });
      }
    } catch {
      setResult({ success: false, message: 'Network error' });
    }
    setSending(null);
  };

  const actions = [
    { id: 'today', label: 'Ringkasan Hari Ini', icon: Calendar, color: 'blue' },
    { id: 'month', label: 'Ringkasan Bulanan', icon: BarChart3, color: 'green' },
    { id: 'alert', label: 'Status Alert', icon: Bell, color: 'red' },
    { id: 'target', label: 'Progress Target', icon: Target, color: 'purple' },
    { id: 'channel', label: 'Performa Channel', icon: Layers, color: 'orange' },
  ] as const;

  return (
    <div className="bg-white rounded-2xl border p-4">
      <div className="flex items-center gap-2 mb-3">
        <Send className="text-green-500" size={18} />
        <h3 className="text-sm font-bold text-gray-800">Telegram Quick Actions</h3>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {actions.map((action) => (
          <button
            key={action.id}
            onClick={() => sendSummary(action.id)}
            disabled={sending !== null}
            className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-lg text-sm font-medium transition ${
              sending === action.id
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : `bg-${action.color}-50 text-${action.color}-700 hover:bg-${action.color}-100`
            }`}
          >
            {sending === action.id ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <action.icon size={16} />
            )}
            <span className="text-xs">{action.label}</span>
          </button>
        ))}
      </div>

      {settings.telegram.enabled ? (
        <div className="mt-2 text-[10px] text-green-600 flex items-center gap-1">
          <CheckCircle size={10} /> Telegram aktif — Chat ID: {settings.telegram.chatId.slice(0, 5)}***
        </div>
      ) : (
        <div className="mt-2 text-[10px] text-red-500 flex items-center gap-1">
          <XCircle size={10} /> Telegram belum diaktifkan
        </div>
      )}

      {result && (
        <div className={`mt-2 text-xs p-2 rounded ${result.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {result.message}
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-gray-100">
        <p className="text-[10px] text-gray-500">
          <b>Bot Commands:</b> /today, /month, /alert, /target, /channel, /help
        </p>
      </div>
    </div>
  );
}
