import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { nanoid } from 'nanoid'
import type { Store, BusinessOverviewData, VideoPerformanceData, AffiliateMonthData, AffiliateTarget } from '@/lib/types'
import {
  createStore as dbCreateStore,
  updateStoreDb,
  deleteStoreDb,
  getStores as dbGetStores,
  saveAffiliateSummary,
  saveAffiliateCreators,
  loadAffiliateSummaries,
  deleteAffiliateSummary,
  deleteAffiliateCreatorsDb,
} from '@/lib/db'

// Clean up old idb-keyval / localStorage entries
if (typeof window !== 'undefined') {
  try { localStorage.removeItem('gmv-store-manager') } catch { /* ignore */ }
}

interface StoreManagerState {
  stores: Store[]
  activeStoreId: string | null
  migrated: boolean
  _supabaseReady: boolean

  // Store CRUD (async — creates in Supabase first)
  addStore: (name: string, color: string, avatar: string) => Promise<string>
  updateStore: (id: string, updates: Partial<Pick<Store, 'name' | 'color' | 'avatar'>>) => void
  deleteStore: (id: string) => void
  setActiveStore: (id: string) => void
  getActiveStore: () => Store | null

  // GMV / Overview / Video — kept in Zustand (smaller data)
  saveGMVData: (storeId: string, monthKey: string, data: any) => void
  deleteGMVData: (storeId: string, monthKey: string) => void
  saveOverviewData: (storeId: string, data: BusinessOverviewData) => void
  deleteOverviewData: (storeId: string, period: string) => void
  saveVideoData: (storeId: string, data: VideoPerformanceData) => void
  deleteVideoData: (storeId: string, periodRaw: string) => void

  // Affiliate — heavy data goes to Supabase, summary stays in Zustand
  saveAffiliateData: (storeId: string, data: AffiliateMonthData) => Promise<void>
  deleteAffiliateData: (storeId: string, periodRaw: string, platform?: string) => Promise<void>

  // Affiliate Targets — lightweight, stored in Zustand/localStorage
  saveAffiliateTarget: (storeId: string, target: AffiliateTarget) => void
  deleteAffiliateTarget: (storeId: string, targetId: string) => void

  // Init & sync
  initFromSupabase: () => Promise<void>
  loadAffiliateFromSupabase: (storeId: string) => Promise<void>

  setMigrated: () => void
}

export const useStoreManager = create<StoreManagerState>()(
  persist(
    (set, get) => ({
      stores: [],
      activeStoreId: null,
      migrated: false,
      _supabaseReady: false,

      // ─── STORE CRUD ──────────────────────────────────
      addStore: async (name, color, avatar) => {
        let id: string
        try {
          const dbStore = await dbCreateStore(name, color, avatar)
          id = dbStore.id
        } catch {
          // Supabase unavailable — fall back to local ID
          id = nanoid()
        }
        const newStore: Store = {
          id,
          name,
          color,
          avatar,
          createdAt: new Date().toISOString(),
          gmvData: {},
          overviewData: [],
          videoData: [],
          affiliateData: [],
        }
        set((state) => ({
          stores: [...state.stores, newStore],
          activeStoreId: state.activeStoreId || id,
        }))
        return id
      },

      updateStore: (id, updates) => {
        set((state) => ({
          stores: state.stores.map((s) => (s.id === id ? { ...s, ...updates } : s)),
        }))
        updateStoreDb(id, updates).catch(() => {})
      },

      deleteStore: (id) => {
        set((state) => {
          const remaining = state.stores.filter((s) => s.id !== id)
          return {
            stores: remaining,
            activeStoreId:
              state.activeStoreId === id
                ? remaining[0]?.id || null
                : state.activeStoreId,
          }
        })
        deleteStoreDb(id).catch(() => {})
      },

      setActiveStore: (id) => set({ activeStoreId: id }),

      getActiveStore: () => {
        const { stores, activeStoreId } = get()
        return stores.find((s) => s.id === activeStoreId) || null
      },

      // ─── GMV DATA (Zustand only) ─────────────────────
      saveGMVData: (storeId, monthKey, data) =>
        set((state) => ({
          stores: state.stores.map((s) =>
            s.id === storeId
              ? { ...s, gmvData: { ...s.gmvData, [monthKey]: data } }
              : s
          ),
        })),

      deleteGMVData: (storeId, monthKey) =>
        set((state) => ({
          stores: state.stores.map((s) => {
            if (s.id !== storeId) return s
            const { [monthKey]: _, ...rest } = s.gmvData
            return { ...s, gmvData: rest }
          }),
        })),

      // ─── OVERVIEW DATA (Zustand only) ─────────────────
      saveOverviewData: (storeId, data) =>
        set((state) => ({
          stores: state.stores.map((s) => {
            if (s.id !== storeId) return s
            const existing = s.overviewData.findIndex((d) => d.period.month === data.period.month)
            const updated =
              existing >= 0
                ? s.overviewData.map((d, i) => (i === existing ? data : d))
                : [...s.overviewData, data]
            return {
              ...s,
              overviewData: updated.sort((a, b) => a.period.month.localeCompare(b.period.month)),
            }
          }),
        })),

      deleteOverviewData: (storeId, periodMonth) =>
        set((state) => ({
          stores: state.stores.map((s) =>
            s.id === storeId
              ? { ...s, overviewData: s.overviewData.filter((d) => d.period.month !== periodMonth) }
              : s
          ),
        })),

      // ─── VIDEO DATA (Zustand only) ────────────────────
      saveVideoData: (storeId, data) =>
        set((state) => ({
          stores: state.stores.map((s) => {
            if (s.id !== storeId) return s
            const existing = s.videoData.findIndex((d) => d.periodRaw === data.periodRaw)
            const updated =
              existing >= 0
                ? s.videoData.map((d, i) => (i === existing ? data : d))
                : [...s.videoData, data]
            return { ...s, videoData: updated }
          }),
        })),

      deleteVideoData: (storeId, periodRaw) =>
        set((state) => ({
          stores: state.stores.map((s) =>
            s.id === storeId
              ? { ...s, videoData: s.videoData.filter((d) => d.periodRaw !== periodRaw) }
              : s
          ),
        })),

      // ─── AFFILIATE DATA (Supabase + Zustand summary) ──
      saveAffiliateData: async (storeId, data) => {
        const period = data.periodRaw?.split(' ~ ')[0]?.slice(0, 7) || data.period
        const platform = data.platform || 'tiktok'

        // 1. Save to Supabase
        try {
          await saveAffiliateSummary(storeId, data.summary, period, platform, data.coreSummary)
          if (data.creators?.length) {
            await saveAffiliateCreators(storeId, period, platform, data.creators)
          }
        } catch (err: any) {
          if (err?.message !== '__SUPABASE_NOT_CONFIGURED__') {
            console.error('Supabase save failed, keeping in Zustand:', err)
          }
        }

        // 2. Update Zustand state (keep creators in memory; partialize strips them from localStorage)
        const fullData: AffiliateMonthData = {
          ...data,
          storeId,
        }
        set((state) => ({
          stores: state.stores.map((s) => {
            if (s.id !== storeId) return s
            const affData = s.affiliateData || []
            const key = `${period}__${platform}`
            const existing = affData.findIndex(
              (d) => `${d.periodRaw?.split(' ~ ')[0]?.slice(0, 7) || d.period}__${d.platform || 'tiktok'}` === key,
            )
            const updated =
              existing >= 0
                ? affData.map((d, i) => (i === existing ? fullData : d))
                : [...affData, fullData]
            return { ...s, affiliateData: updated }
          }),
        }))
      },

      deleteAffiliateData: async (storeId, periodRaw, platform) => {
        const period = periodRaw.split(' ~ ')[0]?.slice(0, 7) || periodRaw
        const plt = platform || 'tiktok'

        try {
          await deleteAffiliateSummary(storeId, period, plt)
          await deleteAffiliateCreatorsDb(storeId, period, plt)
        } catch (err: any) {
          if (err?.message !== '__SUPABASE_NOT_CONFIGURED__') {
            console.error('Supabase delete failed:', err)
          }
        }

        set((state) => ({
          stores: state.stores.map((s) =>
            s.id === storeId
              ? {
                  ...s,
                  affiliateData: (s.affiliateData || []).filter(
                    (d) => d.periodRaw !== periodRaw,
                  ),
                }
              : s
          ),
        }))
      },

      // ─── AFFILIATE TARGETS (Zustand/localStorage only) ──
      saveAffiliateTarget: (storeId, target) =>
        set((state) => ({
          stores: state.stores.map((s) => {
            if (s.id !== storeId) return s
            const targets = s.affiliateTargets || []
            const existing = targets.findIndex((t) => t.id === target.id)
            const updated =
              existing >= 0
                ? targets.map((t, i) => (i === existing ? target : t))
                : [...targets, target]
            return { ...s, affiliateTargets: updated }
          }),
        })),

      deleteAffiliateTarget: (storeId, targetId) =>
        set((state) => ({
          stores: state.stores.map((s) =>
            s.id === storeId
              ? { ...s, affiliateTargets: (s.affiliateTargets || []).filter((t) => t.id !== targetId) }
              : s
          ),
        })),

      // ─── INIT FROM SUPABASE ────────────────────────────
      initFromSupabase: async () => {
        try {
          const dbStores = await dbGetStores()
          if (dbStores.length > 0) {
            set((state) => {
              // Merge: keep local stores, add Supabase stores that don't exist locally
              const localIds = new Set(state.stores.map((s) => s.id))
              const newStores = dbStores
                .filter((ds) => !localIds.has(ds.id))
                .map((ds) => ({
                  id: ds.id,
                  name: ds.name,
                  color: ds.color,
                  avatar: ds.avatar,
                  createdAt: ds.created_at,
                  gmvData: {},
                  overviewData: [],
                  videoData: [],
                  affiliateData: [],
                } as Store))
              return {
                stores: [...state.stores, ...newStores],
                _supabaseReady: true,
              }
            })
          } else {
            set({ _supabaseReady: true })
          }
        } catch (err: any) {
          if (err?.message !== '__SUPABASE_NOT_CONFIGURED__') {
            console.warn('Supabase init failed — using local data only')
          }
          set({ _supabaseReady: false })
        }
      },

      loadAffiliateFromSupabase: async (storeId) => {
        try {
          const summaries = await loadAffiliateSummaries(storeId)
          if (!summaries.length) return

          set((state) => ({
            stores: state.stores.map((s) => {
              if (s.id !== storeId) return s
              // Merge Supabase summaries into local affiliate data
              const existing = new Set(
                (s.affiliateData || []).map(
                  (d) => `${d.periodRaw?.split(' ~ ')[0]?.slice(0, 7) || d.period}__${d.platform || 'tiktok'}`,
                ),
              )
              const newEntries: AffiliateMonthData[] = summaries
                .filter((sm) => !existing.has(`${sm.period}__${sm.platform}`))
                .map((sm) => ({
                  period: sm.period,
                  periodRaw: sm.period,
                  storeId,
                  source: 'combined' as const,
                  platform: sm.platform as 'tiktok' | 'tokopedia',
                  coreSummary: sm.coreSummary as AffiliateMonthData['coreSummary'],
                  creators: [], // loaded on-demand
                  summary: sm.summary,
                }))
              return {
                ...s,
                affiliateData: [...(s.affiliateData || []), ...newEntries],
              }
            }),
          }))
        } catch (err: any) {
          if (err?.message === '__SUPABASE_NOT_CONFIGURED__') return
          const msg = err?.message || err?.details || ''
          if (msg.includes('does not exist') || msg.includes('relation') || msg.includes('42P01')) return
          console.warn('Failed to load affiliate summaries:', msg || err)
        }
      },

      setMigrated: () => set({ migrated: true }),
    }),
    {
      name: 'store-manager-v2',
      partialize: (state) => ({
        stores: state.stores.map((s) => ({
          ...s,
          // Strip creators from persisted affiliate data to stay under localStorage limit
          affiliateData: (s.affiliateData || []).map((d) => ({
            ...d,
            creators: [],
          })),
        })),
        activeStoreId: state.activeStoreId,
        migrated: state.migrated,
      }),
    }
  )
)
