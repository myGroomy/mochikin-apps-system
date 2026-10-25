-- ============================================================================
-- 001_initial_schema.sql
-- Core shared schema for the MOCHIKIN-APPS monorepo.
--
-- IMPORTANT — ownership of tables:
--   * people / branches / branch_members  → 004_people_table.sql + 005_branches_table.sql
--   * items / customers / audit log       → 006 / 007 / 008
--   * MyPerformance domain tables         → 009_myperformance_schema.sql
--
-- This migration intentionally only creates shared reference objects. Earlier
-- revisions created a legacy TEXT-keyed `people` / `branches` pair plus
-- `point_ledger`, `point_rollups`, `care_scores` and `ito_issues` with columns
-- that conflict with the UUID schema used by the rest of the monorepo. Because
-- later migrations use `CREATE TABLE IF NOT EXISTS`, those legacy definitions
-- silently won the race and broke every foreign key. Keep this file free of
-- domain tables.
-- ============================================================================

-- Extensions required across the whole schema
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";   -- uuid_generate_v4() (legacy-compatible)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";    -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "btree_gist";  -- EXCLUDE constraints (task_definitions)

-- ============================================================================
-- ROLES — reference catalog for UI/authorisation labels.
-- Authentication itself is enforced by RLS using JWT custom claims; this table
-- is a read-only catalog and never participates in a foreign key.
-- ============================================================================
CREATE TABLE IF NOT EXISTS roles (
  role_id     TEXT PRIMARY KEY,
  role_name   TEXT UNIQUE NOT NULL,
  permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO roles (role_id, role_name, permissions) VALUES
  ('role_staff',   'Staff',             '["points:read:self"]'::jsonb),
  ('role_captain', 'Captain',           '["points:read:self","points:read:branch","care:assess"]'::jsonb),
  ('role_manager', 'Manager',           '["points:read:self","points:read:branch","care:read:branch"]'::jsonb),
  ('role_admin',   'Administrator',     '["*"]'::jsonb),
  ('super_admin',  'Super Administrator','["*"]'::jsonb)
ON CONFLICT (role_id) DO NOTHING;

COMMENT ON TABLE roles IS 'Reference catalog of role ids used in JWT claims. Not an FK target.';

-- ============================================================================
-- EVENTS_AUDIT — generic append-only audit trail.
-- Used by master-data changes and by sensitive MyPerformance actions such as
-- monthly Google Sheets exports. `table_name` is deliberately free-form.
-- ============================================================================
CREATE TABLE IF NOT EXISTS events_audit (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name  TEXT NOT NULL,
  operation   TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE', 'EXPORT', 'ROLLUP')),
  record_id   TEXT NOT NULL,
  changed_by  TEXT,
  changed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  old_values  JSONB,
  new_values  JSONB
);

CREATE INDEX IF NOT EXISTS idx_events_audit_table_record ON events_audit(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_events_audit_changed_at   ON events_audit(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_audit_changed_by   ON events_audit(changed_by);

COMMENT ON TABLE events_audit IS 'Generic append-only audit trail. See 009 for the MyPerformance-specific entries.';
