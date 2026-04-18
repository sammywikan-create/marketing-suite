import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import type { ReportConfig, SavedReport } from '@/lib/types';

interface ReportStore {
  savedConfigs: ReportConfig[];
  reportHistory: SavedReport[];
  saveConfig: (config: Omit<ReportConfig, 'id' | 'createdAt'>) => string;
  updateConfig: (id: string, updates: Partial<ReportConfig>) => void;
  deleteConfig: (id: string) => void;
  addToHistory: (report: Omit<SavedReport, 'id'>) => void;
  clearHistory: () => void;
}

export const useReportStore = create<ReportStore>()(
  persist(
    (set) => ({
      savedConfigs: [],
      reportHistory: [],
      saveConfig: (config) => {
        const id = nanoid();
        set((state) => ({
          savedConfigs: [
            ...state.savedConfigs,
            { ...config, id, createdAt: new Date().toISOString() },
          ],
        }));
        return id;
      },
      updateConfig: (id, updates) =>
        set((state) => ({
          savedConfigs: state.savedConfigs.map((c) =>
            c.id === id ? { ...c, ...updates } : c
          ),
        })),
      deleteConfig: (id) =>
        set((state) => ({
          savedConfigs: state.savedConfigs.filter((c) => c.id !== id),
        })),
      addToHistory: (report) =>
        set((state) => ({
          reportHistory: [
            { ...report, id: nanoid() },
            ...state.reportHistory,
          ].slice(0, 20),
        })),
      clearHistory: () => set({ reportHistory: [] }),
    }),
    { name: 'gmv-report-store' }
  )
);
