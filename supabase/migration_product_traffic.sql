-- ═══════════════════════════════════════════════════════════
-- MIGRATION: Product Traffic Analyzer (Analisis Trafik Produk)
-- Jalankan di Supabase SQL Editor.
-- Menyimpan data export TikTok Shop:
--   1. Product_Traffic_[total]_Key_Metrics_*.xlsx → product_traffic_daily
--   2. product_list_*.xlsx                        → product_catalog
--   3. Video Performance Core Stats_*.xlsx        → video_core_stats
--   (Live Performance Core Stats memakai tabel live_core_stats yang sudah ada)
-- ═══════════════════════════════════════════════════════════

-- 1. TRAFIK HARIAN PER PRODUK PER JENIS KONTEN
CREATE TABLE IF NOT EXISTS product_traffic_daily (
  id BIGSERIAL PRIMARY KEY,
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  product_name TEXT DEFAULT '',
  date DATE NOT NULL,
  content_type TEXT NOT NULL, -- 'all' | 'live_penjual' | 'video_penjual' | 'kartu_produk' | 'afiliasi'
  gmv BIGINT DEFAULT 0,
  orders INT DEFAULT 0,
  sku_orders INT DEFAULT 0,
  products_sold INT DEFAULT 0,
  buyers INT DEFAULT 0,
  aov BIGINT DEFAULT 0,
  impressions BIGINT DEFAULT 0,
  clicks BIGINT DEFAULT 0,
  ctr REAL DEFAULT 0,
  atc BIGINT DEFAULT 0,
  atc_rate REAL DEFAULT 0,
  ctor REAL DEFAULT 0,
  impressions_unique BIGINT DEFAULT 0,
  clicks_unique BIGINT DEFAULT 0,
  ctr_unique REAL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, product_id, date, content_type)
);

CREATE INDEX IF NOT EXISTS idx_ptd_store_product
  ON product_traffic_daily(store_id, product_id, date);

ALTER TABLE product_traffic_daily ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for anon" ON product_traffic_daily;
CREATE POLICY "Allow all for anon" ON product_traffic_daily FOR ALL USING (true) WITH CHECK (true);

-- 2. KATALOG PRODUK (snapshot per rentang analisis)
CREATE TABLE IF NOT EXISTS product_catalog (
  id BIGSERIAL PRIMARY KEY,
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  name TEXT DEFAULT '',
  status TEXT DEFAULT '',
  gmv_range TEXT DEFAULT '',
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  gmv BIGINT DEFAULT 0,
  channel_gmv JSONB DEFAULT '{}'::jsonb, -- breakdown GMV per channel
  orders INT DEFAULT 0,
  sku_orders INT DEFAULT 0,
  products_sold INT DEFAULT 0,
  buyers INT DEFAULT 0,
  aov BIGINT DEFAULT 0,
  impressions BIGINT DEFAULT 0,
  clicks BIGINT DEFAULT 0,
  ctr REAL DEFAULT 0,
  atc BIGINT DEFAULT 0,
  atc_rate REAL DEFAULT 0,
  ctor REAL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, product_id, period_start, period_end)
);

CREATE INDEX IF NOT EXISTS idx_pcatalog_store
  ON product_catalog(store_id, period_end DESC);

ALTER TABLE product_catalog ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for anon" ON product_catalog;
CREATE POLICY "Allow all for anon" ON product_catalog FOR ALL USING (true) WITH CHECK (true);

-- 3. STATISTIK HARIAN CHANNEL VIDEO (padanan live_core_stats untuk video)
CREATE TABLE IF NOT EXISTS video_core_stats (
  id BIGSERIAL PRIMARY KEY,
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  gmv_from_video BIGINT DEFAULT 0,
  gmv_video BIGINT DEFAULT 0,
  gmv_indirect BIGINT DEFAULT 0,
  vv BIGINT DEFAULT 0,
  gpm BIGINT DEFAULT 0,
  sku_orders_attr INT DEFAULT 0,
  sku_orders_video INT DEFAULT 0,
  sku_orders_indirect INT DEFAULT 0,
  avg_daily_buyers INT DEFAULT 0,
  product_viewers BIGINT DEFAULT 0,
  product_impressions BIGINT DEFAULT 0,
  product_clicks BIGINT DEFAULT 0,
  ctr_video REAL DEFAULT 0,
  ctor_video REAL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, date)
);

ALTER TABLE video_core_stats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for anon" ON video_core_stats;
CREATE POLICY "Allow all for anon" ON video_core_stats FOR ALL USING (true) WITH CHECK (true);
