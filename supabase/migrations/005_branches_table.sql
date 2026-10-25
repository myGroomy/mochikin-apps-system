-- ============================================================================
-- F3.2: Master Data Hub — Branch membership, branch audit, branch policies
-- ============================================================================
-- The canonical `branches` table is created in 004_people_table.sql because
-- `people.branch_id` depends on it. This file adds the remaining branch-scoped
-- objects and all branch-related RLS.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- BRANCH MEMBERS — supports multi-branch assignment
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS branch_members (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id    UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  person_id    UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  branch_role  TEXT CHECK (branch_role IN ('manager', 'staff', 'observer')),
  is_active    BOOLEAN NOT NULL DEFAULT true,
  assigned_by  UUID NOT NULL,
  assigned_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  removed_at   TIMESTAMPTZ,
  UNIQUE (branch_id, person_id)
);

CREATE INDEX IF NOT EXISTS idx_branch_members_branch_id ON branch_members(branch_id);
CREATE INDEX IF NOT EXISTS idx_branch_members_person_id ON branch_members(person_id);
CREATE INDEX IF NOT EXISTS idx_branch_members_is_active ON branch_members(is_active);

COMMENT ON TABLE branch_members IS 'Assignments linking people to branches (supports multi-branch)';

-- ----------------------------------------------------------------------------
-- BRANCHES AUDIT
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS branches_audit (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id   UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  action      TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  changed_by  UUID NOT NULL,
  changed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  old_values  JSONB,
  new_values  JSONB
);

CREATE INDEX IF NOT EXISTS idx_branches_audit_branch_id  ON branches_audit(branch_id);
CREATE INDEX IF NOT EXISTS idx_branches_audit_changed_at ON branches_audit(changed_at DESC);

-- ----------------------------------------------------------------------------
-- RLS — BRANCHES
-- ----------------------------------------------------------------------------
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS branches_admin_all          ON branches;
DROP POLICY IF EXISTS branches_user_see_assigned  ON branches;
DROP POLICY IF EXISTS branches_admin_insert       ON branches;
DROP POLICY IF EXISTS branches_admin_update       ON branches;
DROP POLICY IF EXISTS branches_admin_delete       ON branches;

CREATE POLICY branches_admin_all
  ON branches FOR ALL
  TO authenticated
  USING ((auth.jwt() ->> 'role') IN ('super_admin', 'role_admin'))
  WITH CHECK ((auth.jwt() ->> 'role') IN ('super_admin', 'role_admin'));

CREATE POLICY branches_user_see_assigned
  ON branches FOR SELECT
  TO authenticated
  USING (
    id = (auth.jwt() ->> 'branch_id')::UUID
    OR id IN (
      SELECT bm.branch_id
      FROM branch_members bm
      WHERE bm.person_id = (auth.jwt() ->> 'person_id')::UUID
        AND bm.is_active = true
    )
  );

-- ----------------------------------------------------------------------------
-- RLS — BRANCH MEMBERS
-- ----------------------------------------------------------------------------
ALTER TABLE branch_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS branch_members_admin_all     ON branch_members;
DROP POLICY IF EXISTS branch_members_user_see_self ON branch_members;
DROP POLICY IF EXISTS branch_members_manager_read  ON branch_members;

CREATE POLICY branch_members_admin_all
  ON branch_members FOR ALL
  TO authenticated
  USING ((auth.jwt() ->> 'role') IN ('super_admin', 'role_admin'))
  WITH CHECK ((auth.jwt() ->> 'role') IN ('super_admin', 'role_admin'));

CREATE POLICY branch_members_user_see_self
  ON branch_members FOR SELECT
  TO authenticated
  USING (person_id = (auth.jwt() ->> 'person_id')::UUID);

CREATE POLICY branch_members_manager_read
  ON branch_members FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() ->> 'role') IN ('role_captain', 'role_manager', 'branch_manager')
    AND branch_id = (auth.jwt() ->> 'branch_id')::UUID
  );

-- ----------------------------------------------------------------------------
-- RLS — BRANCHES AUDIT (admin read-only, service role writes)
-- ----------------------------------------------------------------------------
ALTER TABLE branches_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS branches_audit_admin_read ON branches_audit;
CREATE POLICY branches_audit_admin_read
  ON branches_audit FOR SELECT
  TO authenticated
  USING ((auth.jwt() ->> 'role') IN ('super_admin', 'role_admin'));
