"use client";
import { useState, useEffect } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

// ─── TYPES ────────────────────────────────────────────────
export interface LiveCoreStat {
  id: string;
  store_id: string;
  date: string;
  gmv_live: number;
  gmv_earned: number;
  gpm: number;
  sessions_total: number;
  sessions_with_gmv: number;
  products_sold: number;
  sku_orders: number;
  buyers: number;
  impressions: number;
  ctr_live: number;
  order_per_click: number;
  avg_watch_time: number;
}

export interface LiveSession {
  id: string;
  store_id: string;
  creator_id: string;
  creator_name: string;
  creator_username: string;
  started_at: string;
  session_date: string;
  duration_minutes: number;
  gmv: number;
  gmv_earned: number;
  avg_order_value: number;
  products_added: number;
  products_sold: number;
  sku_orders_created: number;
  sku_orders_live: number;
  products_sold_live: number;
  unique_buyers: number;
  order_per_click: number;
  unique_viewers: number;
  total_views: number;
  product_views: number;
  product_clicks: number;
  ctr: number;
  avg_watch_time: number;
  comments: number;
  shares: number;
  likes: number;
  new_followers: number;
  is_valid_session: boolean;
  has_gmv: boolean;
}

interface StoreRef {
  id: string;
  name: string;
}

export function useLiveAnalytics(stores: StoreRef[]) {
  const [coreStats, setCoreStats] = useState<LiveCoreStat[]>([]);
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!stores.length || !isSupabaseConfigured) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    async function load() {
      setIsLoading(true);
      const storeIds = stores.map((s) => s.id);

      try {
        const [{ data: cs }, { data: sess }] = await Promise.all([
          supabase
            .from("live_core_stats")
            .select("*")
            .in("store_id", storeIds)
            .order("date", { ascending: true }),
          supabase
            .from("live_sessions")
            .select("*")
            .in("store_id", storeIds)
            .order("started_at", { ascending: false }),
        ]);

        if (!cancelled) {
          setCoreStats((cs as LiveCoreStat[]) || []);
          setSessions((sess as LiveSession[]) || []);
        }
      } catch (err) {
        console.error("Failed to load live analytics:", err);
        if (!cancelled) {
          setCoreStats([]);
          setSessions([]);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [stores]);

  return { coreStats, sessions, isLoading };
}
