import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { get, set, del, keys } from 'idb-keyval';

const BUCKET = 'sku-photos';
const TABLE = 'sku_photos';
const IDB_PREFIX = 'sku_photo_';

// --- Supabase implementation ---

async function supabaseSave(skuId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop() || 'jpg';
  const path = `${skuId}.${ext}`;

  // Upload (upsert) to storage
  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type });
  if (upErr) throw upErr;

  // Get public URL
  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
  const publicUrl = urlData.publicUrl + '?t=' + Date.now();

  // Upsert metadata row
  const { error: dbErr } = await supabase
    .from(TABLE)
    .upsert({ sku_id: skuId, photo_url: publicUrl, updated_at: new Date().toISOString() });
  if (dbErr) throw dbErr;

  return publicUrl;
}

async function supabaseGetAll(): Promise<Record<string, string>> {
  const { data, error } = await supabase.from(TABLE).select('sku_id, photo_url');
  if (error) throw error;
  const map: Record<string, string> = {};
  (data || []).forEach((r: { sku_id: string; photo_url: string }) => {
    map[r.sku_id] = r.photo_url;
  });
  return map;
}

async function supabaseDelete(skuId: string): Promise<void> {
  // List files matching skuId prefix and remove
  const { data: files } = await supabase.storage.from(BUCKET).list('', { search: skuId });
  if (files && files.length > 0) {
    await supabase.storage.from(BUCKET).remove(files.map(f => f.name));
  }
  await supabase.from(TABLE).delete().eq('sku_id', skuId);
}

// --- IndexedDB fallback ---

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function idbSave(skuId: string, file: File): Promise<string> {
  const dataUrl = await fileToDataUrl(file);
  await set(IDB_PREFIX + skuId, dataUrl);
  return dataUrl;
}

async function idbGetAll(): Promise<Record<string, string>> {
  const allKeys = await keys();
  const map: Record<string, string> = {};
  for (const k of allKeys) {
    const key = String(k);
    if (key.startsWith(IDB_PREFIX)) {
      const skuId = key.slice(IDB_PREFIX.length);
      const val = await get(key);
      if (val) map[skuId] = val as string;
    }
  }
  return map;
}

async function idbDelete(skuId: string): Promise<void> {
  await del(IDB_PREFIX + skuId);
}

// --- Public API ---

export async function saveSkuPhoto(skuId: string, file: File): Promise<string> {
  if (isSupabaseConfigured) return supabaseSave(skuId, file);
  return idbSave(skuId, file);
}

export async function getSkuPhotos(): Promise<Record<string, string>> {
  if (isSupabaseConfigured) return supabaseGetAll();
  return idbGetAll();
}

export async function deleteSkuPhoto(skuId: string): Promise<void> {
  if (isSupabaseConfigured) return supabaseDelete(skuId);
  return idbDelete(skuId);
}
