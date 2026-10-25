-- ============================================================================
-- 002_rls_policies.sql
-- Baseline Row Level Security for shared reference tables only.
--
-- Domain tables own their policies in the migration that creates them:
--   people / branches / branch_members → 004 + 005
--   items / customers / audit log      → 006 / 007 / 008
--   MyPerformance tables               → 009
--
-- This migration MUST NOT reference tables that are created later, otherwise
-- a fresh `supabase db reset` fails with "relation does not exist".
-- ============================================================================

-- ----------------------------------------------------------------------------
-- ROLES — readable by everyone authenticated, writable by admins only
-- ----------------------------------------------------------------------------
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "roles_select_all" ON roles;
CREATE POLICY "roles_select_all"
  ON roles FOR SELECT
  TO authenticated, anon
  USING (true);

DROP POLICY IF EXISTS "roles_write_admin" ON roles;
CREATE POLICY "roles_write_admin"
  ON roles FOR ALL
  TO authenticated
  USING ((auth.jwt() ->> 'role') IN ('role_admin', 'super_admin'))
  WITH CHECK ((auth.jwt() ->> 'role') IN ('role_admin', 'super_admin'));

-- ----------------------------------------------------------------------------
-- EVENTS_AUDIT — append-only; admins can read, only service role can write
-- (service_role bypasses RLS entirely, so no INSERT policy is required).
-- ----------------------------------------------------------------------------
ALTER TABLE events_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "events_audit_select_admin" ON events_audit;
CREATE POLICY "events_audit_select_admin"
  ON events_audit FOR SELECT
  TO authenticated
  USING ((auth.jwt() ->> 'role') IN ('role_admin', 'super_admin'));

DROP POLICY IF EXISTS "events_audit_no_update" ON events_audit;
DROP POLICY IF EXISTS "events_audit_no_delete" ON events_audit;
CREATE POLICY "events_audit_no_update"
  ON events_audit FOR UPDATE
  TO authenticated
  USING (false);
CREATE POLICY "events_audit_no_delete"
  ON events_audit FOR DELETE
  TO authenticated
  USING (false);
