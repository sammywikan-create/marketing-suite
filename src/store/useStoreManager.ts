import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { nanoid } from 'nanoid'
import type { Store, BusinessOverviewData, VideoPerformanceData, AffiliateMonthData, AffiliateTarget } from '@/lib/types'
import { isSupabaseConfigured } from '@/lib/supabase'
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

// Tracks the progress of the Supabase sync that runs on app startup.
// 'pending': still loading; 'done': success; 'offline': Supabase not configured or fetch failed.
// The UI uses this to avoid showing SetupScreen before we know if Supabase already has stores.
export type SupabaseInitStatus = 'pending' | 'done' | 'offline'

interface StoreManagerState {
  stores: Store[]
  activeStoreId: string | null
  migrated: boolean
  _supabaseReady: boolean
  _supabaseInitStatus: SupabaseInitStatus

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
      _supabaseInitStatus: 'pending',

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
        // Fix: always produce a clean YYYY-MM period key.
        // data.periodRaw is like "2025-01-01 ~ 2025-01-31" → slice to "2025-01"
        // data.period is a human-readable label like "Januari 2025" — NOT safe as DB key.
        const rawPeriod = data.periodRaw?.split(' ~ ')[0]?.slice(0, 7)
        // Fallback: if periodRaw is missing, attempt to parse data.period (e.g. "Januari 2025")
        // by reversing toLocaleDateString, but use ISO format only.
        const period = rawPeriod && /^\d{4}-\d{2}$/.test(rawPeriod)
          ? rawPeriod
          : (() => {
              // Try to extract YYYY-MM from whatever is available
              const match = (data.periodRaw || '').match(/^(\d{4}-\d{2})/)
              if (match) return match[1]
              // Last resort: current month
              return new Date().toISOString().slice(0, 7)
            })()
        const platform = data.platform || 'tiktok'

        // 1. Save to Supabase — propagate errors so the upload handler can show user feedback
        try {
          await saveAffiliateSummary(storeId, data.summary, period, platform, data.coreSummary)
          if (data.creators?.length) {
            await saveAffiliateCreators(storeId, period, platform, data.creators)
          }
        } catch (err: any) {
          if (err?.message === '__SUPABASE_NOT_CONFIGURED__') {
            // Supabase not configured — silent fallback to local only is intentional
          } else {
            // Real error — log AND re-throw so the caller (handleUpload) can show user feedback
            console.error('Supabase save failed:', err)
            throw err
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
      // Source of truth for store list is Supabase. This function:
      //   1. Merges Supabase stores into local Zustand state
      //   2. Deduplicates local-only stores (created before Supabase sync finished)
      //      that match a Supabase store by name — remapping their data to the
      //      canonical Supabase ID so affiliate uploads don't get orphaned.
      //   3. Ensures activeStoreId points to a valid store after sync.
      initFromSupabase: async () => {
        if (!isSupabaseConfigured) {
          set({ _supabaseInitStatus: 'offline' })
          return
        }
        try {
          const dbStores = await dbGetStores()
          set((state) => {
            // Build a lookup of Supabase stores by normalized name for dedup
            const supabaseById = new Map(dbStores.map((ds) => [ds.id, ds]))
            const supabaseByName = new Map(
              dbStores.map((ds) => [ds.name.trim().toLowerCase(), ds]),
            )

            // Start with merged list of Supabase stores (canonical)
            const mergedStores: Store[] = dbStores.map((ds) => {
              // Prefer existing local entry (keeps its gmvData / videoData / overviewData in memory)
              const local = state.stores.find((s) => s.id === ds.id)
              if (local) {
                return { ...local, name: ds.name, color: ds.color, avatar: ds.avatar }
              }
              return {
                id: ds.id,
                name: ds.name,
                color: ds.color,
                avatar: ds.avatar,
                createdAt: ds.created_at,
                gmvData: {},
                overviewData: [],
                videoData: [],
                affiliateData: [],
              }
            })

            // Remap orphaned local stores: a local store whose ID is NOT in Supabase
            // but whose name matches a Supabase store — transfer its cached data.
            const orphans = state.stores.filter((s) => !supabaseById.has(s.id))
            for (const orphan of orphans) {
              const match = supabaseByName.get(orphan.name.trim().toLowerCase())
              if (match) {
                // Merge orphan's data into canonical store
                const idx = mergedStores.findIndex((s) => s.id === match.id)
                if (idx >= 0) {
                  const canonical = mergedStores[idx]
                  mergedStores[idx] = {
                    ...canonical,
                    gmvData: { ...orphan.gmvData, ...canonical.gmvData },
                    overviewData: canonical.overviewData.length
                      ? canonical.overviewData
                      : orphan.overviewData,
                    videoData: canonical.videoData.length
                      ? canonical.videoData
                      : orphan.videoData,
                    affiliateData: canonical.affiliateData?.length
                      ? canonical.affiliateData
                      : orphan.affiliateData,
                  }
                }
                // Orphan will be dropped (not added to mergedStores)
              } else {
                // No Supabase twin — keep as local-only store
                mergedStores.push(orphan)
              }
            }

            // Ensure activeStoreId points to a valid store.
            // Manager devices typically have no localStorage state, so activeStoreId is null;
            // auto-select the first store so AffiliateScreen's early-return doesn't trigger.
            const validIds = new Set(mergedStores.map((s) => s.id))
            let nextActiveId = state.activeStoreId
            if (!nextActiveId || !validIds.has(nextActiveId)) {
              nextActiveId = mergedStores[0]?.id || null
            }

            return {
              stores: mergedStores,
              activeStoreId: nextActiveId,
              _supabaseReady: true,
              _supabaseInitStatus: 'done',
            }
          })
        } catch (err: any) {
          if (err?.message !== '__SUPABASE_NOT_CONFIGURED__') {
            console.warn('Supabase init failed — using local data only')
          }
          set({ _supabaseReady: false, _supabaseInitStatus: 'offline' })
        }
      },

      loadAffiliateFromSupabase: async (storeId) => {
        try {
          const summaries = await loadAffiliateSummaries(storeId)
          if (!summaries.length) return

          set((state) => ({
            stores: state.stores.map((s) => {
              if (s.id !== storeId) return s
              // Merge Supabase summaries into local affiliate data.
              // When the same period+platform exists both locally and in Supabase, Supabase wins —
              // that's the whole point of cross-device sync: other devices see uploads too.
              const keyOf = (d: { periodRaw?: string; period: string; platform?: string }) =>
                `${d.periodRaw?.split(' ~ ')[0]?.slice(0, 7) || d.period}__${d.platform || 'tiktok'}`

              const supabaseEntries: AffiliateMonthData[] = summaries.map((sm) => ({
                period: sm.period,
                periodRaw: sm.period,
                storeId,
                source: 'combined' as const,
                platform: sm.platform as 'tiktok' | 'tokopedia',
                coreSummary: sm.coreSummary as AffiliateMonthData['coreSummary'],
                creators: [], // loaded on-demand via loadAffiliateCreators()
                summary: sm.summary,
              }))

              const supabaseKeys = new Set(supabaseEntries.map(keyOf))
              const localOnly = (s.affiliateData || []).filter((d) => !supabaseKeys.has(keyOf(d)))

              return {
                ...s,
                affiliateData: [...localOnly, ...supabaseEntries],
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
      // On rehydrate from localStorage, reset sync status to 'pending' so the UI
      // waits for initFromSupabase() before deciding whether to show SetupScreen.
      onRehydrateStorage: () => (state) => {
        if (state) {
          state._supabaseInitStatus = 'pending'
          state._supabaseReady = false
        }
      },
    }
  )
)
