-- ============================================================================
-- F1: Mochikin Unified Point System
-- Migration: 010_points_system.sql
-- PRD:       PLANS/PRD-POINTS.md
-- Depends:   004_people_table.sql, 005_branches_table.sql
--
-- Core principles:
-- 1. All point transactions across mycheck, mycustomer, stokis, and myperformance
--    are tracked in Supabase as canonical source of truth.
-- 2. Audit flow is reversible (zero_point / undo_zero_point) until final approval.
-- 3. Anonymous 360 peer scorecard evaluations.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. POINT CATEGORIES
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS point_categories (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id        TEXT NOT NULL CHECK (app_id IN ('mycheck', 'mycustomer', 'stokis', 'myperformance')),
  name          TEXT NOT NULL,
  set_method    TEXT NOT NULL CHECK (set_method IN ('per_item', 'per_category')),
  total_points  NUMERIC(10,2) NOT NULL DEFAULT 0,
  branch_id     UUID REFERENCES branches(id) ON DELETE CASCADE,
  external_ref  TEXT, -- category reference ID in originating app/sheet
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_point_categories_app ON point_categories(app_id, is_active);
CREATE INDEX IF NOT EXISTS idx_point_categories_branch ON point_categories(branch_id);

COMMENT ON TABLE point_categories IS 'Category configuration for point setup (Method A per_item or Method B per_category).';

-- ----------------------------------------------------------------------------
-- 2. POINT ITEMS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS point_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id   UUID NOT NULL REFERENCES point_categories(id) ON DELETE CASCADE,
  app_id        TEXT NOT NULL CHECK (app_id IN ('mycheck', 'mycustomer', 'stokis', 'myperformance')),
  name          TEXT NOT NULL,
  points        NUMERIC(10,2) NOT NULL DEFAULT 0,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  external_ref  TEXT, -- point_ref (e.g. CK-001) or Item_ID
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_point_items_category ON point_items(category_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_point_items_app ON point_items(app_id, is_active);
CREATE INDEX IF NOT EXISTS idx_point_items_external ON point_items(external_ref);

COMMENT ON TABLE point_items IS 'Individual point items belonging to a category with configured point weight.';

-- ----------------------------------------------------------------------------
-- 3. REPORTS (Shift, Daily CRM, or SO Session Reports)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reports (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id        TEXT NOT NULL CHECK (app_id IN ('mycheck', 'mycustomer', 'stokis', 'myperformance')),
  branch_id     UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  period_label  TEXT NOT NULL, -- e.g. "Shift Pagi - 2026-11-01" or "SO Mingguan"
  period_start  TIMESTAMPTZ NOT NULL,
  period_end    TIMESTAMPTZ NOT NULL,
  status        TEXT NOT NULL CHECK (status IN (
                  'draft','submitted','under_review',
                  'revision','approved','rejected'
                )) DEFAULT 'draft',
  total_points  NUMERIC(10,2) NOT NULL DEFAULT 0,
  external_ref  TEXT, -- ID of source shift instance or SO report
  created_by    UUID NOT NULL REFERENCES people(id) ON DELETE RESTRICT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reports_app_status ON reports(app_id, status);
CREATE INDEX IF NOT EXISTS idx_reports_branch_period ON reports(branch_id, period_start);
CREATE INDEX IF NOT EXISTS idx_reports_external ON reports(external_ref);

COMMENT ON TABLE reports IS 'Parent report session across apps under review/audit.';

-- ----------------------------------------------------------------------------
-- 4. REPORT CONTRIBUTORS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS report_contributors (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id     UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES people(id) ON DELETE RESTRICT,
  points_earned NUMERIC(10,2) NOT NULL DEFAULT 0,
  items_count   INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(report_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_report_contributors_user ON report_contributors(user_id);
CREATE INDEX IF NOT EXISTS idx_report_contributors_report ON report_contributors(report_id);

COMMENT ON TABLE report_contributors IS 'Breakdown of earned points per contributor within a report session.';

-- ----------------------------------------------------------------------------
-- 5. POINT LOGS (Granular Source of Truth)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS point_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id          TEXT NOT NULL CHECK (app_id IN ('mycheck', 'mycustomer', 'stokis', 'myperformance')),
  user_id         UUID NOT NULL REFERENCES people(id) ON DELETE RESTRICT,
  branch_id       UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  item_id         UUID REFERENCES point_items(id) ON DELETE SET NULL,
  category_id     UUID REFERENCES point_categories(id) ON DELETE SET NULL,
  activity_type   TEXT NOT NULL, -- 'checklist_item', 'so_item', 'order_wa', 'scorecard'
  points_earned   NUMERIC(10,2) NOT NULL,
  points_original NUMERIC(10,2) NOT NULL, -- original points before any audit zeroing
  report_id       UUID REFERENCES reports(id) ON DELETE SET NULL,
  metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_point_logs_user_date ON point_logs(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_point_logs_report ON point_logs(report_id);
CREATE INDEX IF NOT EXISTS idx_point_logs_app_branch ON point_logs(app_id, branch_id);

COMMENT ON TABLE point_logs IS 'Immutable point logs recorded per executed activity.';

-- ----------------------------------------------------------------------------
-- 6. REPORT AUDITS (Reversible Audit Trail)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS report_audits (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id     UUID REFERENCES reports(id) ON DELETE CASCADE,
  auditor_id    UUID NOT NULL REFERENCES people(id) ON DELETE RESTRICT,
  action        TEXT NOT NULL CHECK (action IN (
                  'approve','reject','feedback',
                  'zero_point','undo_zero_point'
                )),
  target_log_id UUID REFERENCES point_logs(id) ON DELETE SET NULL,
  note          TEXT,
  points_before NUMERIC(10,2),
  points_after  NUMERIC(10,2),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_report_audits_report ON report_audits(report_id);
CREATE INDEX IF NOT EXISTS idx_report_audits_auditor ON report_audits(auditor_id);

COMMENT ON TABLE report_audits IS 'Audit log entries capturing changes and zeroing made during review.';

-- ----------------------------------------------------------------------------
-- 7. MYCUSTOMER CONFIG & WA LOCKS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mycustomer_point_config (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id             UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  repeat_customer_point BOOLEAN NOT NULL DEFAULT true,
  repeat_wa_point       BOOLEAN NOT NULL DEFAULT true,
  points_per_wa         NUMERIC(10,2) NOT NULL DEFAULT 1.00,
  updated_by            UUID REFERENCES people(id) ON DELETE SET NULL,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(branch_id)
);

CREATE TABLE IF NOT EXISTS mycustomer_wa_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES people(id) ON DELETE RESTRICT,
  customer_id   TEXT NOT NULL,
  order_id      TEXT NOT NULL,
  clicked_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  point_granted BOOLEAN NOT NULL DEFAULT false,
  locked_until  DATE NOT NULL,
  UNIQUE(user_id, customer_id, locked_until)
);

CREATE INDEX IF NOT EXISTS idx_mycust_wa_lookup ON mycustomer_wa_logs(user_id, customer_id, locked_until);

COMMENT ON TABLE mycustomer_wa_logs IS 'Daily lock record ensuring WA follow-up points cannot be granted twice on the same day.';

-- ----------------------------------------------------------------------------
-- 8. SCORECARDS (360 Peer Evaluation Engine)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS scorecard_sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id     UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  title         TEXT NOT NULL,
  opened_by     UUID NOT NULL REFERENCES people(id) ON DELETE RESTRICT,
  opened_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at     TIMESTAMPTZ,
  is_open       BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scorecard_sessions_branch ON scorecard_sessions(branch_id, is_open);

CREATE TABLE IF NOT EXISTS scorecard_questions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    UUID NOT NULL REFERENCES scorecard_sessions(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  max_points    NUMERIC(10,2) NOT NULL DEFAULT 10.00,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scorecard_questions_session ON scorecard_questions(session_id, sort_order);

CREATE TABLE IF NOT EXISTS scorecard_responses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID NOT NULL REFERENCES scorecard_sessions(id) ON DELETE CASCADE,
  question_id     UUID NOT NULL REFERENCES scorecard_questions(id) ON DELETE CASCADE,
  evaluator_id    UUID NOT NULL REFERENCES people(id) ON DELETE RESTRICT,
  evaluated_id    UUID NOT NULL REFERENCES people(id) ON DELETE RESTRICT,
  points_given    NUMERIC(10,2) NOT NULL CHECK (points_given >= 0),
  feedback        TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(question_id, evaluator_id, evaluated_id)
);

CREATE INDEX IF NOT EXISTS idx_scorecard_responses_session ON scorecard_responses(session_id);
CREATE INDEX IF NOT EXISTS idx_scorecard_responses_eval ON scorecard_responses(evaluated_id);

COMMENT ON TABLE scorecard_responses IS 'Evaluation responses. Staff read aggregations anonymously; Admins view full evaluations.';

-- ----------------------------------------------------------------------------
-- 9. ROW LEVEL SECURITY (RLS)
-- ----------------------------------------------------------------------------
ALTER TABLE point_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_contributors ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE mycustomer_point_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE mycustomer_wa_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE scorecard_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE scorecard_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE scorecard_responses ENABLE ROW LEVEL SECURITY;

-- Read policies for authenticated users
CREATE POLICY point_categories_read ON point_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY point_items_read ON point_items FOR SELECT TO authenticated USING (true);
CREATE POLICY reports_read ON reports FOR SELECT TO authenticated USING (true);
CREATE POLICY report_contributors_read ON report_contributors FOR SELECT TO authenticated USING (true);
CREATE POLICY point_logs_read ON point_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY report_audits_read ON report_audits FOR SELECT TO authenticated USING (true);
CREATE POLICY mycust_config_read ON mycustomer_point_config FOR SELECT TO authenticated USING (true);
CREATE POLICY mycust_wa_read ON mycustomer_wa_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY scorecard_sessions_read ON scorecard_sessions FOR SELECT TO authenticated USING (true);
CREATE POLICY scorecard_questions_read ON scorecard_questions FOR SELECT TO authenticated USING (true);

-- Scorecard responses: Staff can evaluate, but evaluator identity is protected in application views
CREATE POLICY scorecard_responses_read ON scorecard_responses FOR SELECT TO authenticated USING (true);

-- Write policies: authenticated users can insert logs/reports, service role handles administrative overrides
CREATE POLICY point_categories_write ON point_categories FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY point_items_write ON point_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY reports_write ON reports FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY report_contributors_write ON report_contributors FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY point_logs_write ON point_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY report_audits_write ON report_audits FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY mycust_config_write ON mycustomer_point_config FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY mycust_wa_write ON mycustomer_wa_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY scorecard_sessions_write ON scorecard_sessions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY scorecard_questions_write ON scorecard_questions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY scorecard_responses_write ON scorecard_responses FOR ALL TO authenticated USING (true) WITH CHECK (true);
