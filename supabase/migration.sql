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
