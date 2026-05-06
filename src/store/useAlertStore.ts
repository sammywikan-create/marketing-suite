import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AlertThresholds, DEFAULT_THRESHOLDS, AlertResult } from '@/lib/alerts/rules';

export interface TelegramConfig {
  botToken: string;
  chatId: string;
  enabled: boolean;
}

export interface AlertSettings {
  telegram: TelegramConfig;
  thresholds: AlertThresholds;
  enabledRules: string[];
  autoCheck: boolean; // auto-check on data refresh
  cooldownMinutes: number; // min minutes between same alert
}

interface AlertHistoryItem extends AlertResult {
  sentViaTelegram: boolean;
  period?: string;
}

interface AlertState {
  settings: AlertSettings;
  history: AlertHistoryItem[];
  lastChecked: number | null;
  updateSettings: (patch: Partial<AlertSettings>) => void;
  updateTelegram: (patch: Partial<TelegramConfig>) => void;
  updateThresholds: (patch: Partial<AlertThresholds>) => void;
  addToHistory: (alerts: AlertHistoryItem[]) => void;
  clearHistory: () => void;
  setLastChecked: (ts: number) => void;
}

export const useAlertStore = create<AlertState>()(
  persist(
    (set) => ({
      settings: {
        telegram: {
          botToken: '',
          chatId: '',
          enabled: false,
        },
        thresholds: DEFAULT_THRESHOLDS,
        enabledRules: ['omzet_below_pace', 'roas_low', 'cac_high', 'daily_drop', 'cost_spike'],
        autoCheck: true,
        cooldownMinutes: 60,
      },
      history: [],
      lastChecked: null,

      updateSettings: (patch) =>
        set((state) => ({ settings: { ...state.settings, ...patch } })),

      updateTelegram: (patch) =>
        set((state) => ({
          settings: {
            ...state.settings,
            telegram: { ...state.settings.telegram, ...patch },
          },
        })),

      updateThresholds: (patch) =>
        set((state) => ({
          settings: {
            ...state.settings,
            thresholds: { ...state.settings.thresholds, ...patch },
          },
        })),

      addToHistory: (alerts) =>
        set((state) => ({
          history: [...alerts, ...state.history].slice(0, 100), // keep last 100
        })),

      clearHistory: () => set({ history: [] }),

      setLastChecked: (ts) => set({ lastChecked: ts }),
    }),
    {
      name: 'ms-alert-settings',
    }
  )
);
