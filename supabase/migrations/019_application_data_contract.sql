-- Additive application data contract for the FULL_SETUP schema.
-- Safe to apply to an existing database; this migration does not drop data.

BEGIN;

CREATE TABLE IF NOT EXISTS point_master_changes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id       TEXT NOT NULL CHECK (app_id IN ('mycheck', 'stokis', 'mycustomer')),
  entity_type  TEXT NOT NULL CHECK (entity_type IN ('checklist_item', 'incident_category', 'master_item', 'branch_config')),
  entity_ref   TEXT NOT NULL,
  entity_label TEXT,
  old_points   NUMERIC(8, 2),
  new_points   NUMERIC(8, 2) NOT NULL,
  action       TEXT NOT NULL CHECK (action IN ('set', 'reset', 'bulk_split')),
  reason       TEXT,
  changed_by   TEXT NOT NULL,
  changed_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_point_master_changes_lookup
  ON point_master_changes (app_id, entity_type, entity_ref, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_point_master_changes_app
  ON point_master_changes (app_id, changed_at DESC);

CREATE OR REPLACE FUNCTION point_master_changes_prevent_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'point_master_changes is append-only; UPDATE and DELETE operations are prohibited'
    USING ERRCODE = 'restrict_violation';
END;
$$;

DROP TRIGGER IF EXISTS trg_point_master_changes_append_only ON point_master_changes;
CREATE TRIGGER trg_point_master_changes_append_only
  BEFORE UPDATE OR DELETE ON point_master_changes
  FOR EACH ROW EXECUTE FUNCTION point_master_changes_prevent_mutation();
ALTER TABLE point_master_changes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS point_master_changes_admin_read ON point_master_changes;
CREATE POLICY point_master_changes_admin_read ON point_master_changes FOR SELECT
  USING (auth.jwt() ->> 'role' IN ('admin', 'super_admin', 'owner') OR auth.role() = 'service_role');
DROP POLICY IF EXISTS point_master_changes_admin_insert ON point_master_changes;
CREATE POLICY point_master_changes_admin_insert ON point_master_changes FOR INSERT
  WITH CHECK (auth.jwt() ->> 'role' IN ('admin', 'super_admin', 'owner') OR auth.role() = 'service_role');

CREATE TABLE IF NOT EXISTS app_reports (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id       VARCHAR(32) NOT NULL REFERENCES ref_app(app_id),
  branch_id    UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  source_ref   TEXT NOT NULL,
  period_label TEXT,
  period_start TIMESTAMPTZ,
  period_end   TIMESTAMPTZ,
  status       TEXT NOT NULL DEFAULT 'draft',
  total_points NUMERIC(10, 2) NOT NULL DEFAULT 0,
  metadata     JSONB NOT NULL DEFAULT '{}'::jsonb,
  summary      JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by   UUID REFERENCES people(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (app_id, source_ref)
);

CREATE INDEX IF NOT EXISTS idx_app_reports_branch_period
  ON app_reports (branch_id, period_start DESC);
CREATE INDEX IF NOT EXISTS idx_app_reports_app_status
  ON app_reports (app_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS app_report_audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id   UUID NOT NULL REFERENCES app_reports(id) ON DELETE RESTRICT,
  actor_id    UUID REFERENCES people(id) ON DELETE SET NULL,
  actor_label TEXT NOT NULL,
  action      TEXT NOT NULL,
  details     JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_app_report_audit_report
  ON app_report_audit_log (report_id, created_at);

CREATE OR REPLACE FUNCTION app_report_audit_log_prevent_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'app_report_audit_log is append-only'
    USING ERRCODE = 'restrict_violation';
END;
$$;

DROP TRIGGER IF EXISTS trg_app_report_audit_log_append_only ON app_report_audit_log;
CREATE TRIGGER trg_app_report_audit_log_append_only
  BEFORE UPDATE OR DELETE ON app_report_audit_log
  FOR EACH ROW EXECUTE FUNCTION app_report_audit_log_prevent_mutation();

CREATE TABLE IF NOT EXISTS mycust_transactions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id      UUID NOT NULL REFERENCES mycust_customers(id) ON DELETE RESTRICT,
  branch_id        UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  person_id        UUID NOT NULL REFERENCES people(id) ON DELETE RESTRICT,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('sale', 'return', 'payment', 'credit')),
  amount           NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
  description      TEXT,
  reference_no     TEXT,
  recorded_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mycust_transactions_customer
  ON mycust_transactions (customer_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_mycust_transactions_branch
  ON mycust_transactions (branch_id, recorded_at DESC);

CREATE TABLE IF NOT EXISTS mycustomer_branch_settings (
  branch_id             UUID PRIMARY KEY REFERENCES branches(id) ON DELETE CASCADE,
  repeat_customer_point BOOLEAN NOT NULL DEFAULT true,
  repeat_wa_point       BOOLEAN NOT NULL DEFAULT true,
  points_per_wa         NUMERIC(10, 2) NOT NULL DEFAULT 1.00,
  updated_by            UUID REFERENCES people(id) ON DELETE SET NULL,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE app_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_report_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE mycust_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mycustomer_branch_settings ENABLE ROW LEVEL SECURITY;

COMMIT;
