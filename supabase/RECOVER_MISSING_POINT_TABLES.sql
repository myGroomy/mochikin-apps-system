-- RECOVERY: buat kembali tabel poin yang HILANG di Supabase project jjugzkpqgfvlgerfapnl
-- Punca: migration 009 (point_ledger) & 010 (sistem poin mycustomer) belum ter apply sepenuhnya,
-- sehingga query ke public.point_ledger / public.point_logs mengembalikan PGRST205.
-- Cara pakai: Supabase Dashboard -> SQL Editor -> salin isi ini -> Run.
-- Setelah Run, refresh schema cache: Settings -> API -> "Refresh schema cache" (atau tunggu ~1 menit).

CREATE TABLE IF NOT EXISTS point_categories (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id        TEXT NOT NULL CHECK (app_id IN ('mycheck','mycustomer','stokis','myperformance')),
  name          TEXT NOT NULL,
  set_method    TEXT NOT NULL CHECK (set_method IN ('per_item','per_category')),
  total_points  NUMERIC(10,2) NOT NULL DEFAULT 0,
  branch_id     UUID REFERENCES branches(id) ON DELETE CASCADE,
  external_ref  TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_point_categories_app ON point_categories(app_id,is_active);
CREATE INDEX IF NOT EXISTS idx_point_categories_branch ON point_categories(branch_id);
ALTER TABLE point_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS point_categories_read ON point_categories;
CREATE POLICY point_categories_read ON point_categories FOR SELECT TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS point_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id   UUID NOT NULL REFERENCES point_categories(id) ON DELETE CASCADE,
  app_id        TEXT NOT NULL CHECK (app_id IN ('mycheck','mycustomer','stokis','myperformance')),
  name          TEXT NOT NULL,
  points        NUMERIC(10,2) NOT NULL DEFAULT 0,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  external_ref  TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_point_items_category ON point_items(category_id,sort_order);
CREATE INDEX IF NOT EXISTS idx_point_items_app ON point_items(app_id,is_active);
ALTER TABLE point_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS point_items_read ON point_items;
CREATE POLICY point_items_read ON point_items FOR SELECT TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS reports (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id        TEXT NOT NULL CHECK (app_id IN ('mycheck','mycustomer','stokis','myperformance')),
  branch_id     UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  period_label  TEXT NOT NULL,
  period_start  TIMESTAMPTZ NOT NULL,
  period_end    TIMESTAMPTZ NOT NULL,
  status        TEXT NOT NULL CHECK (status IN ('draft','submitted','under_review','revision','approved','rejected')) DEFAULT 'draft',
  total_points  NUMERIC(10,2) NOT NULL DEFAULT 0,
  external_ref  TEXT,
  created_by    UUID NOT NULL REFERENCES people(id) ON DELETE RESTRICT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_reports_app_status ON reports(app_id,status);
CREATE INDEX IF NOT EXISTS idx_reports_branch_period ON reports(branch_id,period_start);
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS reports_read ON reports;
CREATE POLICY reports_read ON reports FOR SELECT TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS report_contributors (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id     UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES people(id) ON DELETE RESTRICT,
  points_earned NUMERIC(10,2) NOT NULL DEFAULT 0,
  items_count   INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(report_id,user_id)
);
CREATE INDEX IF NOT EXISTS idx_report_contributors_user ON report_contributors(user_id);
CREATE INDEX IF NOT EXISTS idx_report_contributors_report ON report_contributors(report_id);
ALTER TABLE report_contributors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS report_contributors_read ON report_contributors;
CREATE POLICY report_contributors_read ON report_contributors FOR SELECT TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS point_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id          TEXT NOT NULL CHECK (app_id IN ('mycheck','mycustomer','stokis','myperformance')),
  user_id         UUID NOT NULL REFERENCES people(id) ON DELETE RESTRICT,
  branch_id       UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  item_id         UUID REFERENCES point_items(id) ON DELETE SET NULL,
  category_id     UUID REFERENCES point_categories(id) ON DELETE SET NULL,
  activity_type   TEXT NOT NULL,
  points_earned   NUMERIC(10,2) NOT NULL,
  points_original NUMERIC(10,2) NOT NULL,
  report_id       UUID REFERENCES reports(id) ON DELETE SET NULL,
  metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_point_logs_user_date ON point_logs(user_id,created_at);
CREATE INDEX IF NOT EXISTS idx_point_logs_report ON point_logs(report_id);
CREATE INDEX IF NOT EXISTS idx_point_logs_app_branch ON point_logs(app_id,branch_id);
ALTER TABLE point_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS point_logs_read ON point_logs;
CREATE POLICY point_logs_read ON point_logs FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS point_logs_write ON point_logs;
CREATE POLICY point_logs_write ON point_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS report_audits (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id     UUID REFERENCES reports(id) ON DELETE CASCADE,
  auditor_id    UUID NOT NULL REFERENCES people(id) ON DELETE RESTRICT,
  action        TEXT NOT NULL CHECK (action IN ('approve','reject','feedback','zero_point','undo_zero_point')),
  target_log_id UUID REFERENCES point_logs(id) ON DELETE SET NULL,
  note          TEXT,
  points_before NUMERIC(10,2),
  points_after  NUMERIC(10,2),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_report_audits_report ON report_audits(report_id);
CREATE INDEX IF NOT EXISTS idx_report_audits_auditor ON report_audits(auditor_id);
ALTER TABLE report_audits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS report_audits_read ON report_audits;
CREATE POLICY report_audits_read ON report_audits FOR SELECT TO authenticated USING (true);

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
ALTER TABLE mycustomer_point_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS mycust_config_read ON mycustomer_point_config;
CREATE POLICY mycust_config_read ON mycustomer_point_config FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS mycust_config_write ON mycustomer_point_config;
CREATE POLICY mycust_config_write ON mycustomer_point_config FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS mycustomer_wa_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES people(id) ON DELETE RESTRICT,
  customer_id   TEXT NOT NULL,
  order_id      TEXT NOT NULL,
  clicked_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  point_granted BOOLEAN NOT NULL DEFAULT false,
  locked_until  DATE NOT NULL,
  UNIQUE(user_id,customer_id,locked_until)
);
CREATE INDEX IF NOT EXISTS idx_mycust_wa_lookup ON mycustomer_wa_logs(user_id,customer_id,locked_until);
ALTER TABLE mycustomer_wa_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS mycust_wa_read ON mycustomer_wa_logs;
CREATE POLICY mycust_wa_read ON mycustomer_wa_logs FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS mycust_wa_write ON mycustomer_wa_logs;
CREATE POLICY mycust_wa_write ON mycustomer_wa_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS point_ledger (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id                 UUID NOT NULL REFERENCES people(id) ON DELETE RESTRICT,
  branch_id                 UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  task_code                 TEXT NOT NULL REFERENCES task_definitions(task_code) ON DELETE RESTRICT,
  task_name_snapshot        TEXT NOT NULL,
  points_per_unit_snapshot  DECIMAL(10,2) NOT NULL,
  source_app                TEXT NOT NULL CHECK (source_app IN ('mycheck','stokis','mycustomer')),
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
CREATE INDEX IF NOT EXISTS idx_pl_person_shift ON point_ledger(person_id,shift_date);
CREATE INDEX IF NOT EXISTS idx_pl_branch_shift ON point_ledger(branch_id,shift_date);
CREATE INDEX IF NOT EXISTS idx_pl_idempotency ON point_ledger(idempotency_key);
ALTER TABLE point_ledger ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS point_ledger_read ON point_ledger;
CREATE POLICY point_ledger_read ON point_ledger FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS point_ledger_write ON point_ledger;
CREATE POLICY point_ledger_write ON point_ledger FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION myperformance_point_ledger_append_only()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'point_ledger is append-only; insert a reversal entry instead' USING ERRCODE = 'restrict_violation';
END;
$$;
DROP TRIGGER IF EXISTS trg_point_ledger_append_only ON point_ledger;
CREATE TRIGGER trg_point_ledger_append_only BEFORE UPDATE OR DELETE ON point_ledger FOR EACH ROW EXECUTE FUNCTION myperformance_point_ledger_append_only();

CREATE TABLE IF NOT EXISTS point_rollups (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id      UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  branch_id      UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  period_type    TEXT NOT NULL CHECK (period_type IN ('day','month','year','shift')),
  period_key     TEXT NOT NULL,
  total_points   NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_quantity NUMERIC(12,2) NOT NULL DEFAULT 0,
  event_count    INTEGER NOT NULL DEFAULT 0,
  computed_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (person_id,branch_id,period_type,period_key)
);
CREATE INDEX IF NOT EXISTS idx_point_rollups_person_period ON point_rollups(person_id,period_type,period_key);
ALTER TABLE point_rollups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS point_rollups_read ON point_rollups;
CREATE POLICY point_rollups_read ON point_rollups FOR SELECT TO authenticated USING (true);

COMMENT ON TABLE point_ledger IS 'Append-only points ledger. No UPDATE/DELETE; corrections via reversal entries.';
COMMENT ON TABLE point_logs IS 'Immutable point logs recorded per executed activity.';
