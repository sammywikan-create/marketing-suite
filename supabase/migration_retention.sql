-- ============================================================
-- Marketing Suite — Retention Feature Migration
-- Run this AFTER the main migration.sql
-- ============================================================

-- 1. AFFILIATE RETENTION NOTES
-- Catatan/notes per kreator oleh tim
CREATE TABLE IF NOT EXISTS affiliate_retention_notes (
  id BIGSERIAL PRIMARY KEY,
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  note TEXT NOT NULL,
  created_by TEXT DEFAULT 'admin',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_retention_notes_store ON affiliate_retention_notes(store_id, username);

ALTER TABLE affiliate_retention_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for anon" ON affiliate_retention_notes;
CREATE POLICY "Allow all for anon" ON affiliate_retention_notes FOR ALL USING (true) WITH CHECK (true);

-- 2. AFFILIATE RETENTION ACTIONS
-- Log histori semua tindakan follow-up
CREATE TABLE IF NOT EXISTS affiliate_retention_actions (
  id BIGSERIAL PRIMARY KEY,
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  action_type TEXT NOT NULL DEFAULT 'general',
  status TEXT NOT NULL DEFAULT 'pending',
  note TEXT DEFAULT '',
  period TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_retention_actions_store ON affiliate_retention_actions(store_id, username);
CREATE INDEX IF NOT EXISTS idx_retention_actions_date ON affiliate_retention_actions(created_at DESC);

ALTER TABLE affiliate_retention_actions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for anon" ON affiliate_retention_actions;
CREATE POLICY "Allow all for anon" ON affiliate_retention_actions FOR ALL USING (true) WITH CHECK (true);

-- 3. AFFILIATE CREATOR TAGS
-- Sistem tagging kreator (VIP, Prioritas, dll)
CREATE TABLE IF NOT EXISTS affiliate_creator_tags (
  id BIGSERIAL PRIMARY KEY,
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  tag TEXT NOT NULL,
  color TEXT DEFAULT '#3B82F6',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(store_id, username, tag)
);

CREATE INDEX IF NOT EXISTS idx_creator_tags_store ON affiliate_creator_tags(store_id, username);

ALTER TABLE affiliate_creator_tags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for anon" ON affiliate_creator_tags;
CREATE POLICY "Allow all for anon" ON affiliate_creator_tags FOR ALL USING (true) WITH CHECK (true);

-- 4. AFFILIATE RETENTION TARGETS
-- Target retention rate per period
CREATE TABLE IF NOT EXISTS affiliate_retention_targets (
  id BIGSERIAL PRIMARY KEY,
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  period TEXT NOT NULL DEFAULT 'global',
  target_retention_rate REAL DEFAULT 70,
  target_active_creators INT DEFAULT 0,
  target_gmv BIGINT DEFAULT 0,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(store_id, period)
);

ALTER TABLE affiliate_retention_targets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for anon" ON affiliate_retention_targets;
CREATE POLICY "Allow all for anon" ON affiliate_retention_targets FOR ALL USING (true) WITH CHECK (true);
