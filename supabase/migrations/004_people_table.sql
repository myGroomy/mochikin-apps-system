-- ============================================================================
-- F3.1: Master Data Hub — People Table
-- ============================================================================
-- Employees, branch assignment, role.
--
-- NOTE ON ORDERING: `people.branch_id` references `branches(id)`, and Supabase
-- runs migrations lexicographically. The canonical branches DDL therefore lives
-- in this file (004) so that it exists before the FK is created. File 005 keeps
-- the branch-centric objects (branch_members, branches_audit, branch policies).
-- Both files use IF NOT EXISTS and are safe to re-run.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- BRANCHES (created here because people depends on it)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS branches (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT NOT NULL,
  code              TEXT UNIQUE NOT NULL,          -- e.g. "BJ01", "BJ02"
  description       TEXT,
  city              TEXT NOT NULL,
  address           TEXT,
  phone             TEXT,
  parent_branch_id  UUID REFERENCES branches(id) ON DELETE SET NULL,
  settings          JSONB NOT NULL DEFAULT '{}'::jsonb,
  status            TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'inactive', 'closed')),
  created_by        UUID NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by        UUID,
  updated_at        TIMESTAMPTZ,
  deleted_at        TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_branches_code             ON branches(code);
CREATE INDEX IF NOT EXISTS idx_branches_status           ON branches(status);
CREATE INDEX IF NOT EXISTS idx_branches_parent_branch_id ON branches(parent_branch_id);
CREATE INDEX IF NOT EXISTS idx_branches_city             ON branches(city);

COMMENT ON TABLE branches IS 'Master data: outlet/branch locations with hierarchical support';
COMMENT ON COLUMN branches.code IS 'Unique branch code (e.g. BJ01, BJ02)';
COMMENT ON COLUMN branches.settings IS 'Per-branch config, e.g. {"timezone":"Asia/Jakarta","currency":"IDR"}';

-- ----------------------------------------------------------------------------
-- PEOPLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS people (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  email       TEXT UNIQUE NOT NULL,
  phone       TEXT,
  role        TEXT NOT NULL
              CHECK (role IN ('super_admin', 'role_admin', 'branch_manager', 'staff', 'guest')),
  branch_id   UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  status      TEXT NOT NULL DEFAULT 'active'
              CHECK (status IN ('active', 'inactive', 'suspended')),
  created_by  UUID NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by  UUID,
  updated_at  TIMESTAMPTZ,
  deleted_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_people_branch_id ON people(branch_id);
CREATE INDEX IF NOT EXISTS idx_people_role      ON people(role);
CREATE INDEX IF NOT EXISTS idx_people_status    ON people(status);
CREATE INDEX IF NOT EXISTS idx_people_email     ON people(email);

COMMENT ON TABLE people IS 'Master data: employees with branch assignment and role';
COMMENT ON COLUMN people.role IS 'super_admin | role_admin | branch_manager | staff | guest';
COMMENT ON COLUMN people.status IS 'active | inactive | suspended';

-- ----------------------------------------------------------------------------
-- PEOPLE AUDIT
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS people_audit (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  people_id   UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  action      TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  changed_by  UUID NOT NULL,
  changed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  old_values  JSONB,
  new_values  JSONB,
  ip_address  TEXT,
  user_agent  TEXT
);

CREATE INDEX IF NOT EXISTS idx_people_audit_people_id  ON people_audit(people_id);
CREATE INDEX IF NOT EXISTS idx_people_audit_changed_at ON people_audit(changed_at DESC);

-- ----------------------------------------------------------------------------
-- RLS — PEOPLE
-- ----------------------------------------------------------------------------
ALTER TABLE people ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS people_admin_all                 ON people;
DROP POLICY IF EXISTS people_branch_manager_see_branch ON people;
DROP POLICY IF EXISTS people_staff_see_self_and_branch ON people;
DROP POLICY IF EXISTS people_admin_insert              ON people;
DROP POLICY IF EXISTS people_manager_update            ON people;
DROP POLICY IF EXISTS people_admin_delete              ON people;
DROP POLICY IF EXISTS people_self_or_branch_select     ON people;

-- Admin (both modern `role_admin` and legacy `super_admin`) can do anything.
CREATE POLICY people_admin_all
  ON people FOR ALL
  TO authenticated
  USING ((auth.jwt() ->> 'role') IN ('super_admin', 'role_admin'))
  WITH CHECK ((auth.jwt() ->> 'role') IN ('super_admin', 'role_admin'));

-- Staff/captain can read their own record and colleagues in the same branch.
CREATE POLICY people_self_or_branch_select
  ON people FOR SELECT
  TO authenticated
  USING (
    id = (auth.jwt() ->> 'person_id')::UUID
    OR branch_id = (auth.jwt() ->> 'branch_id')::UUID
  );

-- Branch managers can update people in their own branch.
CREATE POLICY people_manager_update
  ON people FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() ->> 'role') = 'branch_manager'
    AND branch_id = (auth.jwt() ->> 'branch_id')::UUID
  )
  WITH CHECK (
    (auth.jwt() ->> 'role') = 'branch_manager'
    AND branch_id = (auth.jwt() ->> 'branch_id')::UUID
  );

-- ----------------------------------------------------------------------------
-- RLS — PEOPLE AUDIT (admin read-only, service role writes)
-- ----------------------------------------------------------------------------
ALTER TABLE people_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS people_audit_admin_read ON people_audit;
CREATE POLICY people_audit_admin_read
  ON people_audit FOR SELECT
  TO authenticated
  USING ((auth.jwt() ->> 'role') IN ('super_admin', 'role_admin'));
