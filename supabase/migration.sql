-- ============================================================
-- Marketing Suite — Supabase Database Migration
-- Run this in Supabase SQL Editor (https://supabase.com/dashboard)
-- ============================================================

-- 1. STORES
CREATE TABLE IF NOT EXISTS stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  color TEXT DEFAULT '#3B82F6',
  avatar TEXT DEFAULT 'S',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for anon" ON stores;
CREATE POLICY "Allow all for anon" ON stores FOR ALL USING (true) WITH CHECK (true);

-- 2. AFFILIATE SUMMARIES
CREATE TABLE IF NOT EXISTS affiliate_summaries (
  id BIGSERIAL PRIMARY KEY,
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  period TEXT NOT NULL,
  platform TEXT NOT NULL,
  total_gmv BIGINT DEFAULT 0,
  live_gmv BIGINT DEFAULT 0,
  video_gmv BIGINT DEFAULT 0,
  product_card_gmv BIGINT DEFAULT 0,
  total_refund BIGINT DEFAULT 0,
  refund_rate REAL DEFAULT 0,
  total_creators INT DEFAULT 0,
  active_creators INT DEFAULT 0,
  active_rate REAL DEFAULT 0,
  total_videos INT DEFAULT 0,
  total_live INT DEFAULT 0,
  total_orders INT DEFAULT 0,
  avg_aov BIGINT DEFAULT 0,
  total_commission BIGINT DEFAULT 0,
  commission_rate REAL DEFAULT 0,
  total_sample_sent INT DEFAULT 0,
  avg_daily_buyers REAL,
  avg_daily_selling_creators REAL,
  avg_daily_posting_creators REAL,
  avg_daily_products_sold REAL,
  avg_daily_video_with_sales REAL,
  avg_daily_live_with_sales REAL,
  UNIQUE(store_id, period, platform)
);

ALTER TABLE affiliate_summaries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for anon" ON affiliate_summaries;
CREATE POLICY "Allow all for anon" ON affiliate_summaries FOR ALL USING (true) WITH CHECK (true);

-- 3. AFFILIATE CREATORS
CREATE TABLE IF NOT EXISTS affiliate_creators (
  id BIGSERIAL PRIMARY KEY,
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  period TEXT NOT NULL,
  platform TEXT NOT NULL,
  username TEXT NOT NULL,
  gmv BIGINT DEFAULT 0,
  live_gmv BIGINT DEFAULT 0,
  video_gmv BIGINT DEFAULT 0,
  product_card_gmv BIGINT DEFAULT 0,
  refund BIGINT DEFAULT 0,
  refund_rate REAL DEFAULT 0,
  refund_items INT DEFAULT 0,
  orders INT DEFAULT 0,
  items_sold INT DEFAULT 0,
  aov BIGINT DEFAULT 0,
  videos INT DEFAULT 0,
  live_streams INT DEFAULT 0,
  followers INT DEFAULT 0,
  tier TEXT DEFAULT 'Nano',
  commission BIGINT DEFAULT 0,
  ctr REAL DEFAULT 0,
  product_impressions INT DEFAULT 0,
  avg_customers REAL DEFAULT 0,
  target_collab_gmv BIGINT DEFAULT 0,
  open_collab_gmv BIGINT DEFAULT 0,
  sample_sent INT DEFAULT 0,
  status TEXT DEFAULT 'inactive'
);

CREATE INDEX IF NOT EXISTS idx_creators_store_period ON affiliate_creators(store_id, period, platform);
CREATE INDEX IF NOT EXISTS idx_creators_username ON affiliate_creators(username);

ALTER TABLE affiliate_creators ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for anon" ON affiliate_creators;
CREATE POLICY "Allow all for anon" ON affiliate_creators FOR ALL USING (true) WITH CHECK (true);

-- 4. GMV MAX CREATIVES
CREATE TABLE IF NOT EXISTS gmv_max_creatives (
  id BIGSERIAL PRIMARY KEY,
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  period TEXT NOT NULL,
  campaign_name TEXT,
  creative_type TEXT,
  tiktok_account TEXT,
  status TEXT,
  cost REAL DEFAULT 0,
  orders INT DEFAULT 0,
  cpo REAL DEFAULT 0,
  revenue REAL DEFAULT 0,
  roi REAL DEFAULT 0,
  impressions INT DEFAULT 0,
  clicks INT DEFAULT 0,
  ctr REAL DEFAULT 0,
  cvr REAL DEFAULT 0,
  view_2s INT DEFAULT 0,
  view_6s INT DEFAULT 0
);

ALTER TABLE gmv_max_creatives ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for anon" ON gmv_max_creatives;
CREATE POLICY "Allow all for anon" ON gmv_max_creatives FOR ALL USING (true) WITH CHECK (true);

-- 5. OVERVIEW DATA
CREATE TABLE IF NOT EXISTS overview_data (
  id BIGSERIAL PRIMARY KEY,
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  period TEXT NOT NULL,
  gmv BIGINT DEFAULT 0,
  refund BIGINT DEFAULT 0,
  sold INT DEFAULT 0,
  buyers INT DEFAULT 0,
  views INT DEFAULT 0,
  visits INT DEFAULT 0,
  orders INT DEFAULT 0,
  cvr REAL DEFAULT 0,
  UNIQUE(store_id, period)
);

ALTER TABLE overview_data ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for anon" ON overview_data;
CREATE POLICY "Allow all for anon" ON overview_data FOR ALL USING (true) WITH CHECK (true);

-- 6. VIDEO PERFORMANCE
CREATE TABLE IF NOT EXISTS video_performance (
  id BIGSERIAL PRIMARY KEY,
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  period TEXT NOT NULL,
  creator_name TEXT,
  video_id TEXT,
  vv INT DEFAULT 0,
  likes INT DEFAULT 0,
  comments INT DEFAULT 0,
  shares INT DEFAULT 0,
  new_followers INT DEFAULT 0,
  gmv BIGINT DEFAULT 0,
  gpm REAL DEFAULT 0,
  ctr REAL DEFAULT 0,
  ctor REAL DEFAULT 0,
  watch_rate REAL DEFAULT 0,
  orders INT DEFAULT 0
);

ALTER TABLE video_performance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for anon" ON video_performance;
CREATE POLICY "Allow all for anon" ON video_performance FOR ALL USING (true) WITH CHECK (true);

-- 5. LIVE CORE STATS (agregat harian)
CREATE TABLE IF NOT EXISTS live_core_stats (
  id BIGSERIAL PRIMARY KEY,
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  gmv_live BIGINT DEFAULT 0,
  gmv_earned BIGINT DEFAULT 0,
  gpm REAL DEFAULT 0,
  sessions_total INT DEFAULT 0,
  sessions_with_gmv INT DEFAULT 0,
  products_sold INT DEFAULT 0,
  sku_orders INT DEFAULT 0,
  buyers INT DEFAULT 0,
  impressions BIGINT DEFAULT 0,
  ctr_live REAL DEFAULT 0,
  order_per_click REAL DEFAULT 0,
  avg_watch_time REAL DEFAULT 0,
  UNIQUE(store_id, date)
);

ALTER TABLE live_core_stats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for anon" ON live_core_stats;
CREATE POLICY "Allow all for anon" ON live_core_stats FOR ALL USING (true) WITH CHECK (true);

-- 6. LIVE SESSIONS (per sesi individual)
CREATE TABLE IF NOT EXISTS live_sessions (
  id BIGSERIAL PRIMARY KEY,
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  creator_id TEXT,
  creator_name TEXT,
  creator_username TEXT,
  started_at TIMESTAMPTZ NOT NULL,
  session_date DATE NOT NULL,
  duration_minutes REAL DEFAULT 0,
  gmv BIGINT DEFAULT 0,
  gmv_earned BIGINT DEFAULT 0,
  avg_order_value BIGINT DEFAULT 0,
  products_added INT DEFAULT 0,
  products_sold INT DEFAULT 0,
  sku_orders_created INT DEFAULT 0,
  sku_orders_live INT DEFAULT 0,
  products_sold_live INT DEFAULT 0,
  unique_buyers INT DEFAULT 0,
  order_per_click REAL DEFAULT 0,
  unique_viewers INT DEFAULT 0,
  total_views INT DEFAULT 0,
  product_views INT DEFAULT 0,
  product_clicks INT DEFAULT 0,
  ctr REAL DEFAULT 0,
  avg_watch_time REAL DEFAULT 0,
  comments INT DEFAULT 0,
  shares INT DEFAULT 0,
  likes INT DEFAULT 0,
  new_followers INT DEFAULT 0,
  is_valid_session BOOLEAN DEFAULT true,
  has_gmv BOOLEAN DEFAULT false
);

ALTER TABLE live_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for anon" ON live_sessions;
CREATE POLICY "Allow all for anon" ON live_sessions FOR ALL USING (true) WITH CHECK (true);

-- 7. GMAX CAMPAIGNS
CREATE TABLE IF NOT EXISTS gmax_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  camp_name TEXT NOT NULL,
  camp_code TEXT,
  campaign_type TEXT DEFAULT 'ads',          -- ads | promo | live | bundle | other
  budget_set DECIMAL(14,2) DEFAULT 0,
  roi_target DECIMAL(6,2) DEFAULT 3.0,
  status TEXT DEFAULT 'active',              -- active | paused | completed
  start_date DATE,
  end_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE gmax_campaigns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for anon" ON gmax_campaigns;
CREATE POLICY "Allow all for anon" ON gmax_campaigns FOR ALL USING (true) WITH CHECK (true);

-- 8. GMAX DAILY
CREATE TABLE IF NOT EXISTS gmax_daily (
  id BIGSERIAL PRIMARY KEY,
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES gmax_campaigns(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  budget_spent DECIMAL(14,2) DEFAULT 0,
  gmv DECIMAL(14,2) DEFAULT 0,
  roi DECIMAL(8,4) DEFAULT 0,
  cac DECIMAL(8,4) DEFAULT 0,
  orders INT DEFAULT 0,
  clicks INT DEFAULT 0,
  impressions INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(campaign_id, date)
);

ALTER TABLE gmax_daily ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for anon" ON gmax_daily;
CREATE POLICY "Allow all for anon" ON gmax_daily FOR ALL USING (true) WITH CHECK (true);

-- FIX: Ubah kolom yang bisa berisi desimal dari INT/REAL → DECIMAL
ALTER TABLE live_core_stats ALTER COLUMN gpm TYPE decimal(10,2);
ALTER TABLE live_core_stats ALTER COLUMN ctr_live TYPE decimal(8,4);
ALTER TABLE live_core_stats ALTER COLUMN order_per_click TYPE decimal(8,4);
ALTER TABLE live_core_stats ALTER COLUMN avg_watch_time TYPE decimal(8,2);

-- ═══════════════════════════════════════════════════
-- 9. PRODUCT CARDS (Kartu Produk)
-- ═══════════════════════════════════════════════════

-- TABEL 1: Master daftar produk
CREATE TABLE IF NOT EXISTS product_cards (
  id                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id          uuid REFERENCES stores(id) ON DELETE CASCADE,
  product_id        varchar(30) NOT NULL,
  product_name      varchar(500) NOT NULL,
  product_image_url varchar(500),
  status            varchar(20) DEFAULT 'active',
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now(),
  UNIQUE(store_id, product_id)
);

ALTER TABLE product_cards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for anon" ON product_cards;
CREATE POLICY "Allow all for anon" ON product_cards FOR ALL USING (true) WITH CHECK (true);

-- TABEL 2: Performa per produk per periode
CREATE TABLE IF NOT EXISTS product_card_stats (
  id                           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id                     uuid REFERENCES stores(id),
  product_id                   varchar(30) NOT NULL,
  period_start                 date NOT NULL,
  period_end                   date NOT NULL,
  period_type                  varchar(10) DEFAULT 'monthly',
  channel_source               varchar(30) DEFAULT 'product_card',
  penonton                     int DEFAULT 0,
  tayangan                     int DEFAULT 0,
  impresi_unik                 int DEFAULT 0,
  perolehan_impresi            int DEFAULT 0,
  klik_unik                    int DEFAULT 0,
  klik                         int DEFAULT 0,
  pesanan_sku                  int DEFAULT 0,
  pembeli                      int DEFAULT 0,
  produk_terjual               int DEFAULT 0,
  add_to_cart                  int DEFAULT 0,
  klik_to_cart                 int DEFAULT 0,
  gmv                          bigint DEFAULT 0,
  gmv_from_content             bigint DEFAULT 0,
  gmv_avg_per_buyer            bigint DEFAULT 0,
  refund_amount                bigint DEFAULT 0,
  pesanan_refund               int DEFAULT 0,
  rate_tayangan_to_klik        decimal(8,6) DEFAULT 0,
  rate_tayangan_to_pembayaran  decimal(8,6) DEFAULT 0,
  rate_klik_to_cart            decimal(8,6) DEFAULT 0,
  rate_klik_to_pembayaran      decimal(8,6) DEFAULT 0,
  rate_cart_to_pembayaran      decimal(8,6) DEFAULT 0,
  rate_pesanan_per_klik        decimal(8,6) DEFAULT 0,
  source            varchar(20) DEFAULT 'excel_import',
  import_batch_id   uuid,
  created_at        timestamptz DEFAULT now(),
  UNIQUE(store_id, product_id, period_start, period_end, channel_source)
);

ALTER TABLE product_card_stats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for anon" ON product_card_stats;
CREATE POLICY "Allow all for anon" ON product_card_stats FOR ALL USING (true) WITH CHECK (true);

-- TABEL 3: Traffic harian agregat semua produk
CREATE TABLE IF NOT EXISTS product_card_daily_traffic (
  id                           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id                     uuid REFERENCES stores(id),
  date                         date NOT NULL,
  channel_source               varchar(30) NOT NULL DEFAULT 'product_card',
  tayangan                     int DEFAULT 0,
  penonton                     int DEFAULT 0,
  klik                         int DEFAULT 0,
  klik_unik                    int DEFAULT 0,
  pembeli                      int DEFAULT 0,
  pesanan_sku                  int DEFAULT 0,
  add_to_cart                  int DEFAULT 0,
  klik_to_cart                 int DEFAULT 0,
  pesanan_refund               int DEFAULT 0,
  gmv                          bigint DEFAULT 0,
  gmv_from_content             bigint DEFAULT 0,
  gmv_avg_per_buyer            bigint DEFAULT 0,
  refund_amount                bigint DEFAULT 0,
  rate_tayangan_to_klik        decimal(8,6) DEFAULT 0,
  rate_tayangan_to_pembayaran  decimal(8,6) DEFAULT 0,
  rate_klik_to_cart            decimal(8,6) DEFAULT 0,
  rate_klik_to_pembayaran      decimal(8,6) DEFAULT 0,
  rate_cart_to_pembayaran      decimal(8,6) DEFAULT 0,
  rate_pesanan_per_klik        decimal(8,6) DEFAULT 0,
  source            varchar(20) DEFAULT 'excel_import',
  created_at        timestamptz DEFAULT now(),
  UNIQUE(store_id, date, channel_source)
);

ALTER TABLE product_card_daily_traffic ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for anon" ON product_card_daily_traffic;
CREATE POLICY "Allow all for anon" ON product_card_daily_traffic FOR ALL USING (true) WITH CHECK (true);

-- TABEL 4: Log setiap kali upload Excel
CREATE TABLE IF NOT EXISTS product_card_import_logs (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id     uuid REFERENCES stores(id),
  filename     varchar(300),
  file_type    varchar(30),
  period       varchar(20),
  total_rows   int DEFAULT 0,
  status       varchar(20) DEFAULT 'success',
  error_log    jsonb,
  imported_at  timestamptz DEFAULT now()
);

ALTER TABLE product_card_import_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for anon" ON product_card_import_logs;
CREATE POLICY "Allow all for anon" ON product_card_import_logs FOR ALL USING (true) WITH CHECK (true);

-- Index untuk performa query
CREATE INDEX IF NOT EXISTS idx_pc_stats_store  ON product_card_stats(store_id, channel_source, period_start DESC);
CREATE INDEX IF NOT EXISTS idx_pc_daily_store  ON product_card_daily_traffic(store_id, channel_source, date DESC);
CREATE INDEX IF NOT EXISTS idx_pc_stats_produk ON product_card_stats(product_id, period_start DESC);
ALTER TABLE live_sessions ALTER COLUMN ctr TYPE decimal(8,4);
ALTER TABLE live_sessions ALTER COLUMN order_per_click TYPE decimal(8,4);
ALTER TABLE live_sessions ALTER COLUMN avg_watch_time TYPE decimal(8,2);
ALTER TABLE live_sessions ALTER COLUMN duration_minutes TYPE decimal(8,2);

-- SKU PHOTOS (for SKU Tracking screen)
CREATE TABLE IF NOT EXISTS sku_photos (
  sku_id TEXT PRIMARY KEY,
  photo_url TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE sku_photos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for anon" ON sku_photos;
CREATE POLICY "Allow all for anon" ON sku_photos FOR ALL USING (true) WITH CHECK (true);

-- Storage bucket: sku-photos (create via Supabase Dashboard > Storage > New bucket)
-- Name: sku-photos, Public: true

-- 10. LAPORAN HARIAN DATA (per-month saved snapshots)
CREATE TABLE IF NOT EXISTS laporan_harian_data (
  id BIGSERIAL PRIMARY KEY,
  period TEXT NOT NULL,                   -- "2026-01", "2026-02", etc.
  data_json JSONB NOT NULL,              -- full ApiResponse snapshot
  saved_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(period)
);

ALTER TABLE laporan_harian_data ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for anon" ON laporan_harian_data;
CREATE POLICY "Allow all for anon" ON laporan_harian_data FOR ALL USING (true) WITH CHECK (true);

-- 11. CREATOR ACTIVITY BREAKDOWN (affiliate_summaries)
ALTER TABLE affiliate_summaries ADD COLUMN IF NOT EXISTS active_promoters INT DEFAULT 0;
ALTER TABLE affiliate_summaries ADD COLUMN IF NOT EXISTS video_creators INT DEFAULT 0;
ALTER TABLE affiliate_summaries ADD COLUMN IF NOT EXISTS live_creators INT DEFAULT 0;
ALTER TABLE affiliate_summaries ADD COLUMN IF NOT EXISTS both_video_and_live INT DEFAULT 0;
