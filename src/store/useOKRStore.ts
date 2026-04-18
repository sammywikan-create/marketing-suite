import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { nanoid } from 'nanoid'
import type { Objective, MonthlyOKRReport, KRMetricSource, OKRTableRow } from '@/lib/types'

interface OKRStoreState {
  objectives: Objective[]
  monthlyReports: MonthlyOKRReport[]

  // Objective actions
  addObjective: (obj: Omit<Objective, 'id' | 'createdAt' | 'updatedAt'>) => void
  updateObjective: (id: string, updates: Partial<Objective>) => void
  deleteObjective: (id: string) => void

  // Monthly report actions
  addMonthlyReport: (report: Omit<MonthlyOKRReport, 'id' | 'createdAt' | 'lastUpdated'>) => void
  updateMonthlyReport: (id: string, updates: Partial<MonthlyOKRReport>) => void
  updateOKRRow: (reportId: string, metricKey: KRMetricSource, updates: Partial<OKRTableRow>) => void
  deleteMonthlyReport: (id: string) => void
  getLatestReport: (storeId: string) => MonthlyOKRReport | null
  getReportsByStore: (storeId: string) => MonthlyOKRReport[]
}

export const useOKRStore = create<OKRStoreState>()(
  persist(
    (set, get) => ({
      objectives: [],
      monthlyReports: [],

      // ─── Objective actions ───
      addObjective: (obj) => set((state) => ({
        objectives: [...state.objectives, {
          ...obj,
          id: nanoid(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }],
      })),

      updateObjective: (id, updates) => set((state) => ({
        objectives: state.objectives.map((o) =>
          o.id === id ? { ...o, ...updates, updatedAt: new Date().toISOString() } : o
        ),
      })),

      deleteObjective: (id) => set((state) => ({
        objectives: state.objectives.filter((o) => o.id !== id),
      })),

      // ─── Monthly report actions ───
      addMonthlyReport: (report) => set((state) => ({
        monthlyReports: [...state.monthlyReports, {
          ...report,
          id: nanoid(),
          createdAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString(),
        }],
      })),

      updateMonthlyReport: (id, updates) => set((state) => ({
        monthlyReports: state.monthlyReports.map((r) =>
          r.id === id ? { ...r, ...updates, lastUpdated: new Date().toISOString() } : r
        ),
      })),

      updateOKRRow: (reportId, metricKey, updates) => set((state) => ({
        monthlyReports: state.monthlyReports.map((r) => {
          if (r.id !== reportId) return r
          return {
            ...r,
            lastUpdated: new Date().toISOString(),
            rows: r.rows.map((row) =>
              row.metricKey === metricKey ? { ...row, ...updates } : row
            ),
          }
        }),
      })),

      deleteMonthlyReport: (id) => set((state) => ({
        monthlyReports: state.monthlyReports.filter((r) => r.id !== id),
      })),

      getLatestReport: (storeId) => {
        const { monthlyReports } = get()
        return monthlyReports
          .filter((r) => r.storeId === storeId)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] || null
      },

      getReportsByStore: (storeId) => {
        const { monthlyReports } = get()
        return monthlyReports
          .filter((r) => r.storeId === storeId)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      },
    }),
    { name: 'okr-store' }
  )
)
