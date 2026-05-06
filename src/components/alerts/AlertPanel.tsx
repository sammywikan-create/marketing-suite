"use client";

import { useState, useCallback } from "react";
import { Bell, BellRing, Settings, Trash2, Send, AlertTriangle, CheckCircle } from "lucide-react";
import { useAlertStore } from "@/store/useAlertStore";
import type { AlertResult } from "@/lib/alerts/rules";
import AlertSettings from "./AlertSettings";

interface AlertPanelProps {
  summary: {
    total_omzet: number;
    total_closing: number;
    total_botol: number;
    total_biaya_iklan: number;
    rata_cac: number;
    roas: number;
    hari: number;
    avg_omzet_harian: number;
  };
  harian: { tanggal: string; omzet: number; biaya_iklan: number }[];
  target: number;
  period?: string;
}

export default function AlertPanel({ summary, harian, target, period }: AlertPanelProps) {
  const { settings, history, lastChecked, addToHistory, setLastChecked, clearHistory } = useAlertStore();
  const [showSettings, setShowSettings] = useState(false);
  const [checking, setChecking] = useState(false);
  const [lastResult, setLastResult] = useState<{ count: number; telegramSent: boolean } | null>(null);

  const checkAlerts = useCallback(async () => {
    setChecking(true);
    setLastResult(null);
    try {
      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          summary,
          harian,
          target,
          thresholds: settings.thresholds,
          enabledRules: settings.enabledRules,
          telegram: {
            enabled: settings.telegram.enabled,
            chatId: settings.telegram.chatId,
          },
          period,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setLastChecked(Date.now());
        setLastResult({ count: data.count, telegramSent: data.telegram?.sent || false });
        if (data.alerts?.length > 0) {
          addToHistory(data.alerts.map((a: AlertResult) => ({
            ...a,
            sentViaTelegram: data.telegram?.sent || false,
            period,
          })));
        }
      }
    } catch { /* silent */ }
    setChecking(false);
  }, [summary, harian, target, settings, period, addToHistory, setLastChecked]);

  const criticalCount = history.filter(h => h.severity === 'critical').length;
  const recentAlerts = history.slice(0, 5);

  return (
    <>
      <div className="bg-white rounded-2xl border p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {criticalCount > 0 ? (
              <BellRing className="text-red-500 animate-pulse" size={18} />
            ) : (
              <Bell className="text-gray-400" size={18} />
            )}
            <h3 className="text-sm font-bold text-gray-800">Alert Monitor</h3>
            {criticalCount > 0 && (
              <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                {criticalCount} critical
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={checkAlerts}
              disabled={checking}
              className="flex items-center gap-1 bg-orange-50 text-orange-700 px-2.5 py-1.5 rounded-lg text-xs font-medium hover:bg-orange-100 disabled:opacity-50 transition"
            >
              <Send size={12} />
              {checking ? "Checking..." : "Cek Alert"}
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
            >
              <Settings size={14} />
            </button>
          </div>
        </div>

        {/* Status bar */}
        <div className="flex items-center gap-3 text-[10px] text-gray-500 mb-3">
          {lastChecked && (
            <span>Last check: {new Date(lastChecked).toLocaleString("id-ID", { hour: "2-digit", minute: "2-digit" })}</span>
          )}
          {settings.telegram.enabled && (
            <span className="flex items-center gap-1 text-green-600">
              <Send size={10} /> Telegram aktif
            </span>
          )}
          {settings.autoCheck && (
            <span className="text-blue-500">Auto-check ON</span>
          )}
        </div>

        {/* Last result */}
        {lastResult && (
          <div className={`rounded-lg p-2.5 mb-3 text-xs ${lastResult.count > 0 ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
            {lastResult.count > 0 ? (
              <div className="flex items-center gap-2">
                <AlertTriangle size={14} />
                <span className="font-medium">{lastResult.count} alert terdeteksi</span>
                {lastResult.telegramSent && <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded">Telegram sent</span>}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <CheckCircle size={14} />
                <span className="font-medium">Semua metrik dalam batas normal</span>
              </div>
            )}
          </div>
        )}

        {/* Recent alerts */}
        {recentAlerts.length > 0 ? (
          <div className="space-y-1.5">
            {recentAlerts.map((alert, i) => (
              <div key={`${alert.ruleId}-${alert.timestamp}-${i}`} className={`rounded-lg px-3 py-2 text-xs ${alert.severity === 'critical' ? 'bg-red-50 border-l-2 border-red-400' : 'bg-yellow-50 border-l-2 border-yellow-400'}`}>
                <div className="font-medium text-gray-800">{alert.ruleName}</div>
                <div className="text-gray-600 mt-0.5">{alert.message}</div>
                <div className="text-[10px] text-gray-400 mt-1">
                  {new Date(alert.timestamp).toLocaleString("id-ID")}
                  {alert.sentViaTelegram && <span className="ml-2 text-green-600">via Telegram</span>}
                </div>
              </div>
            ))}
            {history.length > 5 && (
              <p className="text-[10px] text-gray-400 text-center">+{history.length - 5} alert lainnya</p>
            )}
            <button
              onClick={clearHistory}
              className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-red-500 transition mt-1"
            >
              <Trash2 size={10} /> Clear history
            </button>
          </div>
        ) : (
          <p className="text-xs text-gray-400 text-center py-2">
            Belum ada alert. Klik &quot;Cek Alert&quot; untuk memulai monitoring.
          </p>
        )}
      </div>

      {showSettings && <AlertSettings onClose={() => setShowSettings(false)} />}
    </>
  );
}
