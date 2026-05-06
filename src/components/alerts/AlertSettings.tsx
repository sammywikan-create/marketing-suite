"use client";

import { useState } from "react";
import { Bell, Send, TestTube, CheckCircle, XCircle, Settings, Shield } from "lucide-react";
import { useAlertStore } from "@/store/useAlertStore";
import { ALERT_RULES } from "@/lib/alerts/rules";

export default function AlertSettings({ onClose }: { onClose: () => void }) {
  const { settings, updateSettings, updateTelegram, updateThresholds } = useAlertStore();
  const [testStatus, setTestStatus] = useState<{ loading: boolean; success?: boolean; message?: string }>({ loading: false });

  const handleTestTelegram = async () => {
    setTestStatus({ loading: true });
    try {
      const res = await fetch("/api/alerts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          botToken: settings.telegram.botToken,
          chatId: settings.telegram.chatId,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setTestStatus({ loading: false, success: true, message: `Bot @${data.botName} terhubung!` });
      } else {
        setTestStatus({ loading: false, success: false, message: data.error });
      }
    } catch {
      setTestStatus({ loading: false, success: false, message: "Network error" });
    }
  };

  const toggleRule = (ruleId: string) => {
    const current = settings.enabledRules;
    const updated = current.includes(ruleId)
      ? current.filter(id => id !== ruleId)
      : [...current, ruleId];
    updateSettings({ enabledRules: updated });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 rounded-t-2xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="text-orange-500" size={20} />
            <h2 className="text-lg font-bold text-gray-900">Alert Settings</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold">&times;</button>
        </div>

        <div className="p-6 space-y-6">
          {/* Telegram Configuration */}
          <section>
            <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2 mb-3">
              <Send size={14} /> Telegram Bot
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Aktifkan Notifikasi</span>
                <button
                  onClick={() => updateTelegram({ enabled: !settings.telegram.enabled })}
                  className={`relative w-11 h-6 rounded-full transition ${settings.telegram.enabled ? 'bg-green-500' : 'bg-gray-300'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${settings.telegram.enabled ? 'translate-x-5' : ''}`} />
                </button>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500">Bot Token</label>
                <input
                  type="password"
                  value={settings.telegram.botToken}
                  onChange={e => updateTelegram({ botToken: e.target.value })}
                  placeholder="123456789:ABCdefGHI..."
                  className="w-full border rounded-lg p-2 text-sm mt-1"
                />
                <p className="text-[10px] text-gray-400 mt-1">Buat bot di @BotFather di Telegram</p>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500">Chat ID</label>
                <input
                  type="text"
                  value={settings.telegram.chatId}
                  onChange={e => updateTelegram({ chatId: e.target.value })}
                  placeholder="-1001234567890 atau 123456789"
                  className="w-full border rounded-lg p-2 text-sm mt-1"
                />
                <p className="text-[10px] text-gray-400 mt-1">Gunakan @userinfobot untuk dapat Chat ID</p>
              </div>

              <button
                onClick={handleTestTelegram}
                disabled={testStatus.loading || !settings.telegram.botToken}
                className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-100 disabled:opacity-50 transition"
              >
                <TestTube size={14} />
                {testStatus.loading ? "Testing..." : "Test Koneksi"}
              </button>
              {testStatus.message && (
                <div className={`flex items-center gap-2 text-sm ${testStatus.success ? 'text-green-600' : 'text-red-600'}`}>
                  {testStatus.success ? <CheckCircle size={14} /> : <XCircle size={14} />}
                  {testStatus.message}
                </div>
              )}
            </div>
          </section>

          {/* Alert Rules */}
          <section>
            <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2 mb-3">
              <Shield size={14} /> Alert Rules
            </h3>
            <div className="space-y-2">
              {ALERT_RULES.map(rule => (
                <div key={rule.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                  <div>
                    <div className="text-sm font-medium text-gray-800 flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${rule.severity === 'critical' ? 'bg-red-500' : 'bg-yellow-500'}`} />
                      {rule.name}
                    </div>
                    <p className="text-[10px] text-gray-500">{rule.description}</p>
                  </div>
                  <button
                    onClick={() => toggleRule(rule.id)}
                    className={`relative w-9 h-5 rounded-full transition ${settings.enabledRules.includes(rule.id) ? 'bg-green-500' : 'bg-gray-300'}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${settings.enabledRules.includes(rule.id) ? 'translate-x-4' : ''}`} />
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* Thresholds */}
          <section>
            <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2 mb-3">
              <Settings size={14} /> Threshold
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-medium text-gray-500">Min Pace Target (%)</label>
                <input
                  type="number"
                  value={settings.thresholds.omzetPacePct}
                  onChange={e => updateThresholds({ omzetPacePct: Number(e.target.value) })}
                  className="w-full border rounded-lg p-2 text-sm mt-1"
                />
              </div>
              <div>
                <label className="text-[10px] font-medium text-gray-500">Min ROAS</label>
                <input
                  type="number"
                  step="0.1"
                  value={settings.thresholds.roasMin}
                  onChange={e => updateThresholds({ roasMin: Number(e.target.value) })}
                  className="w-full border rounded-lg p-2 text-sm mt-1"
                />
              </div>
              <div>
                <label className="text-[10px] font-medium text-gray-500">Max CAC (%)</label>
                <input
                  type="number"
                  value={settings.thresholds.cacMax}
                  onChange={e => updateThresholds({ cacMax: Number(e.target.value) })}
                  className="w-full border rounded-lg p-2 text-sm mt-1"
                />
              </div>
              <div>
                <label className="text-[10px] font-medium text-gray-500">Drop Harian (%)</label>
                <input
                  type="number"
                  value={settings.thresholds.dailyDropPct}
                  onChange={e => updateThresholds({ dailyDropPct: Number(e.target.value) })}
                  className="w-full border rounded-lg p-2 text-sm mt-1"
                />
              </div>
              <div>
                <label className="text-[10px] font-medium text-gray-500">Spike Biaya (%)</label>
                <input
                  type="number"
                  value={settings.thresholds.costSpikePct}
                  onChange={e => updateThresholds({ costSpikePct: Number(e.target.value) })}
                  className="w-full border rounded-lg p-2 text-sm mt-1"
                />
              </div>
              <div>
                <label className="text-[10px] font-medium text-gray-500">Cooldown (menit)</label>
                <input
                  type="number"
                  value={settings.cooldownMinutes}
                  onChange={e => updateSettings({ cooldownMinutes: Number(e.target.value) })}
                  className="w-full border rounded-lg p-2 text-sm mt-1"
                />
              </div>
            </div>
          </section>

          {/* Auto-check toggle */}
          <div className="flex items-center justify-between bg-blue-50 rounded-lg p-3">
            <div>
              <div className="text-sm font-medium text-blue-800">Auto-Check Saat Data Refresh</div>
              <p className="text-[10px] text-blue-600">Cek alert otomatis setiap kali data laporan harian di-refresh</p>
            </div>
            <button
              onClick={() => updateSettings({ autoCheck: !settings.autoCheck })}
              className={`relative w-11 h-6 rounded-full transition ${settings.autoCheck ? 'bg-blue-500' : 'bg-gray-300'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${settings.autoCheck ? 'translate-x-5' : ''}`} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
