import { supabase, isSupabaseConfigured } from '@/lib/supabase';

// ─── Daily Traffic ───────────────────────────────────
export async function fetchDailyTraffic(storeId: string, channel: string, startDate?: string, endDate?: string) {
  if (!isSupabaseConfigured) return [];
  let q = supabase
    .from('product_card_daily_traffic')
    .select('*')
    .eq('store_id', storeId)
    .eq('channel_source', channel)
    .order('date', { ascending: true });
  if (startDate) q = q.gte('date', startDate);
  if (endDate) q = q.lte('date', endDate);
  const { data } = await q;
  return data || [];
}

// ─── Product Stats ───────────────────────────────────
export async function fetchProductStats(storeId: string, channel: string, periodStart?: string, periodEnd?: string) {
  if (!isSupabaseConfigured) return [];
  let q = supabase
    .from('product_card_stats')
    .select('*')
    .eq('store_id', storeId)
    .eq('channel_source', channel)
    .order('gmv', { ascending: false });
  if (periodStart) q = q.gte('period_start', periodStart);
  if (periodEnd) q = q.lte('period_end', periodEnd);
  const { data } = await q;
  return data || [];
}

// ─── Single Product History ──────────────────────────
export async function fetchProductHistory(storeId: string, productId: string, channel?: string) {
  if (!isSupabaseConfigured) return [];
  let q = supabase
    .from('product_card_stats')
    .select('*')
    .eq('store_id', storeId)
    .eq('product_id', productId)
    .order('period_start', { ascending: true });
  if (channel) q = q.eq('channel_source', channel);
  const { data } = await q;
  return data || [];
}

// ─── Product Master ──────────────────────────────────
export async function fetchProductMaster(storeId: string, productId: string) {
  if (!isSupabaseConfigured) return null;
  const { data } = await supabase
    .from('product_cards')
    .select('*')
    .eq('store_id', storeId)
    .eq('product_id', productId)
    .single();
  return data;
}

// ─── Import Logs ─────────────────────────────────────
export async function fetchImportLogs(storeId: string, limit = 20) {
  if (!isSupabaseConfigured) return [];
  const { data } = await supabase
    .from('product_card_import_logs')
    .select('*')
    .eq('store_id', storeId)
    .order('imported_at', { ascending: false })
    .limit(limit);
  return data || [];
}

// ─── Upsert helpers ──────────────────────────────────
export async function upsertProductCards(storeId: string, products: { product_id: string; product_name: string }[]) {
  if (!isSupabaseConfigured) return;
  await supabase.from('product_cards').upsert(
    products.map(p => ({ store_id: storeId, product_id: p.product_id, product_name: p.product_name })),
    { onConflict: 'store_id,product_id', ignoreDuplicates: false }
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function upsertProductStats(storeId: string, rows: any[]) {
  if (!isSupabaseConfigured) return;
  await supabase.from('product_card_stats').upsert(
    rows.map(r => ({ store_id: storeId, ...r })),
    { onConflict: 'store_id,product_id,period_start,period_end,channel_source' }
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function upsertDailyTraffic(storeId: string, rows: any[]) {
  if (!isSupabaseConfigured) return;
  await supabase.from('product_card_daily_traffic').upsert(
    rows.map(r => ({ store_id: storeId, ...r })),
    { onConflict: 'store_id,date,channel_source' }
  );
}

export async function logImport(storeId: string, filename: string, fileType: string, totalRows: number, status = 'success') {
  if (!isSupabaseConfigured) return;
  await supabase.from('product_card_import_logs').insert({
    store_id: storeId, filename, file_type: fileType, total_rows: totalRows, status,
  });
}
