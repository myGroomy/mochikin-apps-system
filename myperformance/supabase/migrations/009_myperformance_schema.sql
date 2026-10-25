-- ============================================================================
-- F6: MyPerformance — Points Engine & CARE Scorecard
-- Migration: 009_myperformance_schema.sql
-- Depends:   004_people_table.sql, 005_branches_table.sql
-- PRD:       PLANS/PRD-myperformance/PRD.md §7
-- TRD:       myperformance/TRD.md §3
--
-- Design rules enforced here:
--   K2  Ledger is append-only. Corrections use a reversal entry with negative
--       points. A BEFORE UPDATE/DELETE trigger makes this true even for the
--       service role.
--   K3  The ledger snapshots task name and tariff at event time. Editing a task
--       definition never changes history.
--   K4  CARE scores are private. RLS blocks captains from reading a self-score
--       until the assessment leaves `draft`.
--   T+0 Today's points live in Redis; this table is the source of truth for
--       rollups and T-1+ history.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ============================================================================
-- 1. TASK DEFINITIONS — config-as-data for point rules
-- ============================================================================
CREATE TABLE IF NOT EXISTS task_definitions (
  task_code        TEXT PRIMARY KEY,
  name             TEXT NOT NULL,
  app_id           TEXT NOT NULL CHECK (app_id IN ('mycheck', 'stokis', 'mycustomer')),
  category         TEXT CHECK (category IN ('M', 'T')),
  level_role       TEXT CHECK (level_role IN ('Manajer', 'SPV', 'Staf')),
  points_per_unit  DECIMAL(10,2) NOT NULL CHECK (points_per_unit >= 0),
  unit_output      TEXT,
  is_active        BOOLEAN NOT NULL DEFAULT true,
  valid_from       DATE NOT NULL,
  valid_to         DATE,
  created_by       UUID REFERENCES people(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ,

  -- No two ACTIVE definitions for the same task_code may overlap in time.
  EXCLUDE USING gist (
    task_code WITH =,
    daterange(valid_from, COALESCE(valid_to, '9999-12-31'::date), '[)') WITH &&
  ) WHERE (is_active = true)
);

COMMENT ON TABLE task_definitions IS 'Point task catalogue (immutable config-as-data). Managed by admins.';
COMMENT ON COLUMN task_definitions.task_code IS 'Primary key. Format APP_TASKNAME, e.g. MYCHECK_HADIR.';
COMMENT ON COLUMN task_definitions.points_per_unit IS 'Tariff per unit. The ledger snapshots this value at event time.';
COMMENT ON COLUMN task_definitions.valid_to IS 'NULL = open-ended. EXCLUDE constraint prevents overlapping active rows.';

CREATE INDEX IF NOT EXISTS idx_td_app_active ON task_definitions(app_id, is_active);

-- ============================================================================
-- 2. POINT LEDGER — append-only transaction ledger
-- ============================================================================
CREATE TABLE IF NOT EXISTS point_ledger (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id                 UUID NOT NULL REFERENCES people(id) ON DELETE RESTRICT,
  branch_id                 UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  task_code                 TEXT NOT NULL REFERENCES task_definitions(task_code) ON DELETE RESTRICT,
  task_name_snapshot        TEXT NOT NULL,
  points_per_unit_snapshot  DECIMAL(10,2) NOT NULL,
  source_app                TEXT NOT NULL CHECK (source_app IN ('mycheck', 'stokis', 'mycustomer')),
  event_id                  TEXT UNIQUE NOT NULL,
  idempotency_key           TEXT UNIQUE NOT NULL,
  quantity                  INTEGER NOT NULL CHECK (quantity > 0),
  points                    DECIMAL(10,2) NOT NULL,
  shift_date                DATE NOT NULL,
  shift_code                TEXT,
  occurred_at               TIMESTAMPTZ NOT NULL,
  meta                      JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE point_ledger IS 'Append-only points ledger. No UPDATE/DELETE; corrections via reversal entries.';
COMMENT ON COLUMN point_ledger.event_id IS 'Unique event id. Duplicate submissions are replayed, not re-inserted.';
COMMENT ON COLUMN point_ledger.points IS 'Server-computed: quantity × points_per_unit_snapshot.';
COMMENT ON COLUMN point_ledger.shift_date IS 'Business date (local timezone), not the UTC date of occurred_at.';
COMMENT ON COLUMN point_ledger.meta IS 'Free-form metadata. Reversal: {"reversal_of":"<event_id>","reason":"..."}';

CREATE INDEX IF NOT EXISTS idx_pl_person_date ON point_ledger(person_id, shift_date);
CREATE INDEX IF NOT EXISTS idx_pl_branch_date ON point_ledger(branch_id, shift_date);
CREATE INDEX IF NOT EXISTS idx_pl_source_date ON point_ledger(source_app, shift_date);
CREATE INDEX IF NOT EXISTS idx_pl_task_date   ON point_ledger(task_code, shift_date);
CREATE INDEX IF NOT EXISTS idx_pl_occurred    ON point_ledger(occurred_at DESC);

-- Append-only guard (applies to EVERY role, including service_role).
CREATE OR REPLACE FUNCTION myperformance_point_ledger_append_only()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'point_ledger is append-only; insert a reversal entry instead'
    USING ERRCODE = 'restrict_violation';
END;
$$;

DROP TRIGGER IF EXISTS trg_point_ledger_append_only ON point_ledger;
CREATE TRIGGER trg_point_ledger_append_only
  BEFORE UPDATE OR DELETE ON point_ledger
  FOR EACH ROW
  EXECUTE FUNCTION myperformance_point_ledger_append_only();

-- ============================================================================
-- 3. POINT ROLLUPS — materialised aggregation per period
-- ============================================================================
CREATE TABLE IF NOT EXISTS point_rollups (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id       UUID NOT NULL REFERENCES people(id) ON DELETE RESTRICT,
  branch_id       UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  period_type     TEXT NOT NULL CHECK (period_type IN ('shift', 'day', 'month', 'year')),
  period_key      TEXT NOT NULL,
  total_points    DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_quantity  INTEGER NOT NULL DEFAULT 0,
  event_count     INTEGER NOT NULL DEFAULT 0,
  computed_at     TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (person_id, branch_id, period_type, period_key),

  CHECK (
    (period_type = 'day'    AND period_key ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$') OR
    (period_type = 'month'  AND period_key ~ '^[0-9]{4}-[0-9]{2}$') OR
    (period_type = 'year'   AND period_key ~ '^[0-9]{4}$') OR
    (period_type = 'shift'  AND period_key ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}-[A-Za-z0-9_]+$')
  )
);

COMMENT ON TABLE point_rollups IS 'Periodic point aggregation produced by cron. T+0 (today) lives in Redis, not here.';
COMMENT ON COLUMN point_rollups.period_key IS 'day: YYYY-MM-DD | month: YYYY-MM | year: YYYY | shift: YYYY-MM-DD-CODE';

CREATE INDEX IF NOT EXISTS idx_pr_person_period ON point_rollups(person_id, period_type, period_key);
CREATE INDEX IF NOT EXISTS idx_pr_branch_period ON point_rollups(branch_id, period_type, period_key);
CREATE INDEX IF NOT EXISTS idx_pr_period        ON point_rollups(period_type, period_key);

-- ============================================================================
-- 4. CARE ASSESSMENTS — header for a monthly CARE session
-- ============================================================================
CREATE TABLE IF NOT EXISTS care_assessments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id   UUID NOT NULL REFERENCES people(id) ON DELETE RESTRICT,
  branch_id   UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  period      TEXT NOT NULL CHECK (period ~ '^[0-9]{4}-[0-9]{2}$'),
  status      TEXT NOT NULL DEFAULT 'draft'
              CHECK (status IN ('draft', 'submitted', 'discussed', 'final')),
  note_1on1   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ,

  UNIQUE (person_id, period)
);

COMMENT ON TABLE care_assessments IS 'Monthly CARE session header. One-way status flow: draft→submitted→discussed→final.';
COMMENT ON COLUMN care_assessments.note_1on1 IS '1:1 notes; only captain/admin may write (enforced by RLS).';

CREATE INDEX IF NOT EXISTS idx_ca_branch_period ON care_assessments(branch_id, period);
CREATE INDEX IF NOT EXISTS idx_ca_status        ON care_assessments(status);

-- ============================================================================
-- 5. CARE SCORES — 7 dimensions × 2 assessors per session
-- ============================================================================
CREATE TABLE IF NOT EXISTS care_scores (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id        UUID NOT NULL REFERENCES care_assessments(id) ON DELETE CASCADE,
  person_id            UUID NOT NULL REFERENCES people(id) ON DELETE RESTRICT,
  branch_id            UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  assessor_person_id   UUID NOT NULL REFERENCES people(id) ON DELETE RESTRICT,
  assessor_role        TEXT NOT NULL CHECK (assessor_role IN ('self', 'captain')),
  dimension_code       TEXT NOT NULL,
  score                DECIMAL(2,1) CHECK (score >= 1.0 AND score <= 4.0),
  observed_fact        TEXT,
  followup             TEXT,
  period_key           TEXT NOT NULL CHECK (period_key ~ '^[0-9]{4}-[0-9]{2}$'),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (person_id, assessor_person_id, assessor_role, dimension_code, period_key)
);

COMMENT ON TABLE care_scores IS 'CARE 7 dimensions, scale 1.0–4.0 (half points). Final = ROUND((self+captain)/2*2)/2.';
COMMENT ON COLUMN care_scores.dimension_code IS 'C1_CUSTOMER, A2_ACCOUNTABILITY, R3_RELIABILITY, E4_EXCELLENCE, T5_TEAMWORK, I6_INTEGRITY, O7_OWNERSHIP.';
COMMENT ON COLUMN care_scores.score IS 'NULL = not filled yet.';

CREATE INDEX IF NOT EXISTS idx_cs_person_period   ON care_scores(person_id, period_key);
CREATE INDEX IF NOT EXISTS idx_cs_assessment      ON care_scores(assessment_id);
CREATE INDEX IF NOT EXISTS idx_cs_assessor_person ON care_scores(assessor_person_id, period_key);

-- ============================================================================
-- 6. ITO ISSUES — Issues / Talk / Observation board
-- ============================================================================
CREATE TABLE IF NOT EXISTS ito_issues (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id    UUID NOT NULL REFERENCES people(id) ON DELETE RESTRICT,
  branch_id    UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  raised_by    UUID NOT NULL REFERENCES people(id) ON DELETE RESTRICT,
  title        TEXT NOT NULL,
  description  TEXT,
  action_item  TEXT,
  assignee     UUID REFERENCES people(id) ON DELETE SET NULL,
  severity     TEXT CHECK (severity IN ('low', 'medium', 'high')),
  status       TEXT NOT NULL DEFAULT 'baru' CHECK (status IN ('baru', 'diskusi', 'selesai')),
  period_key   TEXT NOT NULL CHECK (period_key ~ '^[0-9]{4}-[0-9]{2}$'),
  resolved_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE ito_issues IS 'ITO board. Status flow: baru → diskusi → selesai. One board per branch per period.';

CREATE INDEX IF NOT EXISTS idx_ito_branch_period ON ito_issues(branch_id, period_key);
CREATE INDEX IF NOT EXISTS idx_ito_person        ON ito_issues(person_id, status);
CREATE INDEX IF NOT EXISTS idx_ito_assignee      ON ito_issues(assignee, status);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- ----------------------------------------------------------------------------
-- task_definitions: everyone reads, admin writes, nobody deletes
-- ----------------------------------------------------------------------------
ALTER TABLE task_definitions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS task_def_select_all  ON task_definitions;
DROP POLICY IF EXISTS task_def_insert_admin ON task_definitions;
DROP POLICY IF EXISTS task_def_update_admin ON task_definitions;
DROP POLICY IF EXISTS task_def_no_delete    ON task_definitions;

CREATE POLICY task_def_select_all
  ON task_definitions FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY task_def_insert_admin
  ON task_definitions FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt() ->> 'role') IN ('role_admin', 'super_admin'));

CREATE POLICY task_def_update_admin
  ON task_definitions FOR UPDATE
  TO authenticated
  USING ((auth.jwt() ->> 'role') IN ('role_admin', 'super_admin'))
  WITH CHECK ((auth.jwt() ->> 'role') IN ('role_admin', 'super_admin'));

CREATE POLICY task_def_no_delete
  ON task_definitions FOR DELETE
  TO authenticated
  USING (false);

-- ----------------------------------------------------------------------------
-- point_ledger: owner + branch-scoped leadership read; write via service role
-- ----------------------------------------------------------------------------
ALTER TABLE point_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ledger_select_scoped       ON point_ledger;
DROP POLICY IF EXISTS ledger_insert_service_only ON point_ledger;
DROP POLICY IF EXISTS ledger_no_update           ON point_ledger;
DROP POLICY IF EXISTS ledger_no_delete           ON point_ledger;

CREATE POLICY ledger_select_scoped
  ON point_ledger FOR SELECT
  TO authenticated
  USING (
    person_id = (auth.jwt() ->> 'person_id')::UUID
    OR (
      branch_id = (auth.jwt() ->> 'branch_id')::UUID
      AND (auth.jwt() ->> 'role') IN ('role_captain', 'role_manager', 'role_admin', 'super_admin')
    )
  );

-- The API uses the service role, which bypasses RLS. This policy is defence in
-- depth for any accidental anon/authenticated write.
CREATE POLICY ledger_insert_service_only
  ON point_ledger FOR INSERT
  TO authenticated
  WITH CHECK (current_setting('app.service_context', true) = 'events_worker');

CREATE POLICY ledger_no_update
  ON point_ledger FOR UPDATE
  TO authenticated
  USING (false);

CREATE POLICY ledger_no_delete
  ON point_ledger FOR DELETE
  TO authenticated
  USING (false);

-- ----------------------------------------------------------------------------
-- point_rollups: scoped read; cron writes via service role
-- ----------------------------------------------------------------------------
ALTER TABLE point_rollups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rollup_select_scoped       ON point_rollups;
DROP POLICY IF EXISTS rollup_write_service_only  ON point_rollups;

CREATE POLICY rollup_select_scoped
  ON point_rollups FOR SELECT
  TO authenticated
  USING (
    person_id = (auth.jwt() ->> 'person_id')::UUID
    OR (
      branch_id = (auth.jwt() ->> 'branch_id')::UUID
      AND (auth.jwt() ->> 'role') IN ('role_captain', 'role_manager', 'role_admin', 'super_admin')
    )
  );

CREATE POLICY rollup_write_service_only
  ON point_rollups FOR ALL
  TO authenticated
  USING (current_setting('app.service_context', true) = 'rollup_cron')
  WITH CHECK (current_setting('app.service_context', true) = 'rollup_cron');

-- ----------------------------------------------------------------------------
-- care_assessments
-- ----------------------------------------------------------------------------
ALTER TABLE care_assessments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS care_assessment_select_scoped ON care_assessments;
DROP POLICY IF EXISTS care_assessment_insert_scoped ON care_assessments;
DROP POLICY IF EXISTS care_assessment_update_scoped ON care_assessments;

CREATE POLICY care_assessment_select_scoped
  ON care_assessments FOR SELECT
  TO authenticated
  USING (
    person_id = (auth.jwt() ->> 'person_id')::UUID
    OR (
      branch_id = (auth.jwt() ->> 'branch_id')::UUID
      AND (auth.jwt() ->> 'role') IN ('role_captain', 'role_manager', 'role_admin', 'super_admin')
    )
  );

CREATE POLICY care_assessment_insert_scoped
  ON care_assessments FOR INSERT
  TO authenticated
  WITH CHECK (
    branch_id = (auth.jwt() ->> 'branch_id')::UUID
    AND (auth.jwt() ->> 'role') IN ('role_captain', 'role_admin', 'super_admin')
  );

CREATE POLICY care_assessment_update_scoped
  ON care_assessments FOR UPDATE
  TO authenticated
  USING (
    branch_id = (auth.jwt() ->> 'branch_id')::UUID
    AND (auth.jwt() ->> 'role') IN ('role_captain', 'role_admin', 'super_admin')
  )
  WITH CHECK (
    branch_id = (auth.jwt() ->> 'branch_id')::UUID
    AND (auth.jwt() ->> 'role') IN ('role_captain', 'role_admin', 'super_admin')
  );

-- ----------------------------------------------------------------------------
-- care_scores: K4 privacy
-- ----------------------------------------------------------------------------
ALTER TABLE care_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS care_scores_select_k4    ON care_scores;
DROP POLICY IF EXISTS care_scores_insert_scoped ON care_scores;
DROP POLICY IF EXISTS care_scores_update_scoped ON care_scores;

CREATE POLICY care_scores_select_k4
  ON care_scores FOR SELECT
  TO authenticated
  USING (
    person_id = (auth.jwt() ->> 'person_id')::UUID
    OR assessor_person_id = (auth.jwt() ->> 'person_id')::UUID
    OR (
      (auth.jwt() ->> 'role') = 'role_captain'
      AND branch_id = (auth.jwt() ->> 'branch_id')::UUID
      AND assessment_id IN (SELECT id FROM care_assessments WHERE status <> 'draft')
    )
    OR (auth.jwt() ->> 'role') IN ('role_manager', 'role_admin', 'super_admin')
  );

CREATE POLICY care_scores_insert_scoped
  ON care_scores FOR INSERT
  TO authenticated
  WITH CHECK (
    assessor_person_id = (auth.jwt() ->> 'person_id')::UUID
    AND (
      (assessor_role = 'self' AND person_id = (auth.jwt() ->> 'person_id')::UUID)
      OR (assessor_role = 'captain' AND (auth.jwt() ->> 'role') IN ('role_captain', 'role_admin', 'super_admin'))
    )
  );

CREATE POLICY care_scores_update_scoped
  ON care_scores FOR UPDATE
  TO authenticated
  USING (assessor_person_id = (auth.jwt() ->> 'person_id')::UUID)
  WITH CHECK (assessor_person_id = (auth.jwt() ->> 'person_id')::UUID);

-- ----------------------------------------------------------------------------
-- ito_issues: branch isolation
-- ----------------------------------------------------------------------------
ALTER TABLE ito_issues ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ito_select_branch      ON ito_issues;
DROP POLICY IF EXISTS ito_insert_captain_up  ON ito_issues;
DROP POLICY IF EXISTS ito_update_captain_up  ON ito_issues;

CREATE POLICY ito_select_branch
  ON ito_issues FOR SELECT
  TO authenticated
  USING (
    branch_id = (auth.jwt() ->> 'branch_id')::UUID
    OR person_id = (auth.jwt() ->> 'person_id')::UUID
  );

CREATE POLICY ito_insert_captain_up
  ON ito_issues FOR INSERT
  TO authenticated
  WITH CHECK (
    branch_id = (auth.jwt() ->> 'branch_id')::UUID
    AND (auth.jwt() ->> 'role') IN ('role_captain', 'role_manager', 'role_admin', 'super_admin')
  );

CREATE POLICY ito_update_captain_up
  ON ito_issues FOR UPDATE
  TO authenticated
  USING (
    branch_id = (auth.jwt() ->> 'branch_id')::UUID
    AND (auth.jwt() ->> 'role') IN ('role_captain', 'role_manager', 'role_admin', 'super_admin')
  )
  WITH CHECK (
    branch_id = (auth.jwt() ->> 'branch_id')::UUID
    AND (auth.jwt() ->> 'role') IN ('role_captain', 'role_manager', 'role_admin', 'super_admin')
  );

-- ============================================================================
-- SEED — initial task catalogue (tariffs are placeholders; adjust to policy)
-- ============================================================================
INSERT INTO task_definitions (task_code, name, app_id, category, level_role, points_per_unit, unit_output, valid_from)
VALUES
  ('MYCHECK_HADIR',       'Hadir Tepat Waktu',          'mycheck',    'T', 'Staf',    1.00, 'shift',   '2026-01-01'),
  ('MYCHECK_SHIFT_CLOSE', 'Tutup Shift',                'mycheck',    'T', 'SPV',     2.00, 'shift',   '2026-01-01'),
  ('MYCHECK_INCIDENT',    'Laporan Insiden',            'mycheck',    'T', 'Staf',    1.50, 'laporan', '2026-01-01'),
  ('STOKIS_OPNAME',       'Opname Stok',                'stokis',     'T', 'Staf',    3.00, 'sesi',    '2026-01-01'),
  ('STOKIS_MUTASI',       'Mutasi Barang',              'stokis',     'T', 'Staf',    1.00, 'item',    '2026-01-01'),
  ('MYCUST_TIKET',        'Penanganan Tiket Pelanggan', 'mycustomer', 'T', 'Staf',    2.00, 'tiket',   '2026-01-01'),
  ('MYCUST_ORDER',        'Proses Order',               'mycustomer', 'T', 'Staf',    0.50, 'order',   '2026-01-01')
ON CONFLICT (task_code) DO NOTHING;

-- ============================================================================
-- NOTES
-- ============================================================================
-- 1. points_per_unit values are placeholders; align them with Point Kerja.pdf.
-- 2. CARE dimension codes must be verified against SCORE-CARDS.xlsx (TRD §12 Q2).
-- 3. Ledger rows are immutable. To correct a mistake, insert a reversal row with
--    negative points and meta {"reversal_of": "<event_id>", "reason": "..."}.
-- 4. Today (T+0) is served from Redis; only T-1 and older come from point_rollups.
