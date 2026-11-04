-- ============================================================================
-- Migration: 012_point_master_changes.sql
-- Module: Unified Point Master Audit Log & Integrity Refactor
-- ============================================================================
-- 1. Creates `point_master_changes` audit table to record all point modifications
--    made directly to master items, checklist items, incident categories, and branch configs.
-- 2. Enforces append-only integrity via trigger (prohibits UPDATE/DELETE).
-- 3. Adds unique indexes on legacy point tables for idempotent upsert support.
-- 4. Enforces decimal numeric types for point columns.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. POINT MASTER CHANGES AUDIT TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS point_master_changes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id       TEXT NOT NULL CHECK (app_id IN ('mycheck', 'stokis', 'mycustomer')),
  entity_type  TEXT NOT NULL CHECK (entity_type IN ('checklist_item', 'incident_category', 'master_item', 'branch_config')),
  entity_ref   TEXT NOT NULL, -- Row ID / Item_ID / branch_id
  entity_label TEXT,          -- Human readable label (e.g. item name or activity title)
  old_points   NUMERIC(8,2),
  new_points   NUMERIC(8,2) NOT NULL,
  action       TEXT NOT NULL CHECK (action IN ('set', 'reset', 'bulk_split')),
  reason       TEXT,
  changed_by   TEXT NOT NULL, -- username, email, or actor identifier
  changed_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for efficient lookup
CREATE INDEX IF NOT EXISTS idx_point_master_changes_lookup 
  ON point_master_changes (app_id, entity_type, entity_ref, changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_point_master_changes_app 
  ON point_master_changes (app_id, changed_at DESC);

COMMENT ON TABLE point_master_changes IS 'Append-only audit trail for all master point adjustments across all apps.';
COMMENT ON COLUMN point_master_changes.entity_ref IS 'Stable identifier in domain master: sheet row ID, Item_ID, or branch_id.';
COMMENT ON COLUMN point_master_changes.action IS 'Modification type: set (individual edit), reset (revert to default), bulk_split (distributed split).';

-- ----------------------------------------------------------------------------
-- 2. APPEND-ONLY TRIGGER
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION point_master_changes_prevent_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'point_master_changes is append-only; UPDATE and DELETE operations are prohibited'
    USING ERRCODE = 'restrict_violation';
END;
$$;

DROP TRIGGER IF EXISTS trg_point_master_changes_append_only ON point_master_changes;
CREATE TRIGGER trg_point_master_changes_append_only
  BEFORE UPDATE OR DELETE ON point_master_changes
  FOR EACH ROW
  EXECUTE FUNCTION point_master_changes_prevent_mutation();

-- ----------------------------------------------------------------------------
-- 3. ROW LEVEL SECURITY (RLS)
-- ----------------------------------------------------------------------------
ALTER TABLE point_master_changes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS point_master_changes_admin_read ON point_master_changes;
CREATE POLICY point_master_changes_admin_read
  ON point_master_changes FOR SELECT
  USING (
    auth.jwt() ->> 'role' IN ('admin', 'super_admin', 'owner')
    OR auth.role() = 'service_role'
  );

DROP POLICY IF EXISTS point_master_changes_admin_insert ON point_master_changes;
CREATE POLICY point_master_changes_admin_insert
  ON point_master_changes FOR INSERT
  WITH CHECK (
    auth.jwt() ->> 'role' IN ('admin', 'super_admin', 'owner')
    OR auth.role() = 'service_role'
  );

-- ----------------------------------------------------------------------------
-- 4. ENSURE DECIMAL TYPES ON EXISTING POINT TABLES (IDEMPOTENT)
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  -- point_items.points
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'point_items' AND column_name = 'points' AND data_type = 'integer'
  ) THEN
    ALTER TABLE point_items ALTER COLUMN points TYPE NUMERIC(10,2);
  END IF;

  -- point_categories.total_points
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'point_categories' AND column_name = 'total_points' AND data_type = 'integer'
  ) THEN
    ALTER TABLE point_categories ALTER COLUMN total_points TYPE NUMERIC(10,2);
  END IF;

  -- point_logs.points_original
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'point_logs' AND column_name = 'points_original' AND data_type = 'integer'
  ) THEN
    ALTER TABLE point_logs ALTER COLUMN points_original TYPE NUMERIC(10,2);
  END IF;

  -- point_logs.points_awarded
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'point_logs' AND column_name = 'points_awarded' AND data_type = 'integer'
  ) THEN
    ALTER TABLE point_logs ALTER COLUMN points_awarded TYPE NUMERIC(10,2);
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 5. UNIQUE INDEXES FOR LEGACY FALLBACK UPSERT
-- ----------------------------------------------------------------------------
-- Allows onConflict: 'app_id,name' / 'category_id,name' on lowercased names
CREATE UNIQUE INDEX IF NOT EXISTS idx_point_categories_app_lower_name 
  ON point_categories (app_id, LOWER(name));

CREATE UNIQUE INDEX IF NOT EXISTS idx_point_items_cat_lower_name 
  ON point_items (category_id, LOWER(name));
