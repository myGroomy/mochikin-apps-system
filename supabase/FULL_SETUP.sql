-- ============================================================================
-- MOCHIKIN-APPS  CONSOLIDATED FULL DATABASE SETUP SCRIPT (SUPABASE / POSTGRES)
-- ============================================================================
-- File: supabase/FULL_SETUP.sql
-- Digunakan untuk setup database baru (Fresh Install) hanya dalam 1 kali eksekusi
-- di Supabase SQL Editor.
-- Mendukung:
--   1. Central Gateway & SSO Identity (Mochikin-Service)
--   2. Performance & Points Engine, CARE Scorecard, ITO (MyPerformance)
--   3. Master Data Hub (Branches, People, Customers, Items, Apps Registry)
--   4. Reporting & Activity Logs (Stokis & Cross-App Points Log)
-- ============================================================================

-- 0. EKSTENSI POSTGRESQL
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. MASTER DATA: CABANG / OUTLET (BRANCHES)
-- ============================================================================
CREATE TABLE IF NOT EXISTS branches (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT NOT NULL,
  code              TEXT UNIQUE NOT NULL,          -- e.g. "BJ01", "CBG01BDG"
  description       TEXT,
  city              TEXT NOT NULL,
  address           TEXT,
  phone             TEXT,
  parent_branch_id  UUID REFERENCES branches(id) ON DELETE SET NULL,
  settings          JSONB NOT NULL DEFAULT '{}'::jsonb,
  status            TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'closed')),
  created_by        UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by        UUID,
  updated_at        TIMESTAMPTZ,
  deleted_at        TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_branches_code ON branches(code);
CREATE INDEX IF NOT EXISTS idx_branches_status ON branches(status);
CREATE INDEX IF NOT EXISTS idx_branches_city ON branches(city);

-- ============================================================================
-- 2. MASTER DATA: PENGGUNA & STAF (PEOPLE)
-- ============================================================================
CREATE TABLE IF NOT EXISTS people (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  email           TEXT UNIQUE NOT NULL,
  username        VARCHAR(50) UNIQUE,
  phone           TEXT,
  pin_hash        TEXT, -- format: salt$scrypt_hash untuk PIN login
  role            TEXT NOT NULL CHECK (role IN ('super_admin', 'role_admin', 'branch_manager', 'staff', 'guest')),
  branch_id       UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  failed_attempts INT NOT NULL DEFAULT 0,
  locked_until    TIMESTAMPTZ,
  last_login_at   TIMESTAMPTZ,
  created_by      UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by      UUID,
  updated_at      TIMESTAMPTZ,
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_people_email ON people(email);
CREATE INDEX IF NOT EXISTS idx_people_username_lower ON people(LOWER(username));
CREATE INDEX IF NOT EXISTS idx_people_branch_id ON people(branch_id);
CREATE INDEX IF NOT EXISTS idx_people_role ON people(role);
CREATE INDEX IF NOT EXISTS idx_people_status ON people(status);

-- Multi-Branch Membership
CREATE TABLE IF NOT EXISTS branch_members (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id    UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  person_id    UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  branch_role  TEXT CHECK (branch_role IN ('manager', 'staff', 'observer')),
  is_active    BOOLEAN NOT NULL DEFAULT true,
  assigned_by  UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  assigned_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  removed_at   TIMESTAMPTZ,
  UNIQUE (branch_id, person_id)
);

-- ============================================================================
-- 3. APP LAUNCHER & REGISTRY (MOCHIKIN SERVICES)
-- ============================================================================
CREATE TABLE IF NOT EXISTS apps (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT UNIQUE NOT NULL,        -- 'mochikin-service', 'stokis', 'mycheck', 'myperformance', 'mycustomer'
  title         TEXT NOT NULL,
  version       TEXT NOT NULL DEFAULT '1.0.0',
  category      TEXT NOT NULL DEFAULT 'operational' CHECK (category IN ('core', 'operational', 'analytical')),
  description   TEXT,
  icon_url      TEXT,
  url           TEXT NOT NULL,               -- e.g. 'http://localhost:3002'
  target_url    TEXT,                        -- override url dari admin panel
  repository    TEXT,
  status        TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'beta')),
  is_active     BOOLEAN NOT NULL DEFAULT true,
  requires_sso  BOOLEAN NOT NULL DEFAULT true,
  port          INTEGER,
  config        JSONB DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),
  created_by    TEXT,
  updated_by    TEXT
);

CREATE INDEX IF NOT EXISTS idx_apps_name ON apps(name);
CREATE INDEX IF NOT EXISTS idx_apps_status ON apps(status);

-- ============================================================================
-- 4. MASTER DATA: PELANGGAN & PRODUK (CUSTOMERS & ITEMS)
-- ============================================================================
CREATE TABLE IF NOT EXISTS customers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  phone           TEXT,
  email           TEXT,
  branch_id       UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blacklisted')),
  loyalty_tier    TEXT DEFAULT 'regular',
  total_spend     NUMERIC(15,2) DEFAULT 0,
  created_by      UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code            TEXT UNIQUE NOT NULL,
  name            TEXT NOT NULL,
  category        TEXT NOT NULL,
  unit            TEXT NOT NULL DEFAULT 'pcs',
  base_price      NUMERIC(15,2) DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_by      UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ
);

-- ============================================================================
-- 5. PERFORMANCE ENGINE: TASK DEFINITIONS & POINT LEDGER
-- ============================================================================
CREATE TABLE IF NOT EXISTS task_definitions (
  task_code        TEXT PRIMARY KEY,
  name             TEXT NOT NULL,
  app_id           TEXT NOT NULL CHECK (app_id IN ('mycheck', 'stokis', 'mycustomer', 'mochikin-service')),
  category         CHAR(1) CHECK (category IN ('M', 'T') OR category IS NULL),
  level_role       TEXT CHECK (level_role IN ('Manajer', 'SPV', 'Staf') OR level_role IS NULL),
  points_per_unit  NUMERIC(6, 2) NOT NULL CHECK (points_per_unit >= 0),
  unit_output      TEXT,
  is_active        BOOLEAN NOT NULL DEFAULT true,
  valid_from       DATE NOT NULL DEFAULT '2026-01-01',
  valid_to         DATE
);

CREATE TABLE IF NOT EXISTS point_ledger (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id                UUID NOT NULL REFERENCES people(id) ON DELETE RESTRICT,
  branch_id                UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  task_code                TEXT NOT NULL REFERENCES task_definitions(task_code) ON DELETE RESTRICT,
  task_name_snapshot       TEXT NOT NULL,
  points_per_unit_snapshot NUMERIC(6, 2) NOT NULL,
  source_app               TEXT NOT NULL,
  event_id                 TEXT NOT NULL,
  idempotency_key          TEXT NOT NULL UNIQUE,
  quantity                 NUMERIC(10, 2) NOT NULL CHECK (quantity > 0),
  points                   NUMERIC(10, 2) NOT NULL,
  shift_date               DATE NOT NULL,
  occurred_at              TIMESTAMPTZ NOT NULL,
  meta                     JSONB,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pl_person_shift ON point_ledger(person_id, shift_date);
CREATE INDEX IF NOT EXISTS idx_pl_branch_shift ON point_ledger(branch_id, shift_date);
CREATE INDEX IF NOT EXISTS idx_pl_idempotency ON point_ledger(idempotency_key);

CREATE TABLE IF NOT EXISTS point_rollups (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id      UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  branch_id      UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  period_type    TEXT NOT NULL CHECK (period_type IN ('day', 'month', 'year', 'shift')),
  period_key     TEXT NOT NULL,
  total_points   NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_quantity NUMERIC(12, 2) NOT NULL DEFAULT 0,
  event_count    INTEGER NOT NULL DEFAULT 0,
  computed_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (person_id, branch_id, period_type, period_key)
);

-- ============================================================================
-- 6. SCORECARD CARE & ITO (ISSUES TO OPERATIONAL)
-- ============================================================================
CREATE TABLE IF NOT EXISTS care_dimensions (
  dimension_code TEXT PRIMARY KEY,
  name           TEXT NOT NULL,
  description    TEXT,
  weight         NUMERIC(4, 2) NOT NULL DEFAULT 0.25,
  sort_order     INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS care_scale (
  scale_value INTEGER PRIMARY KEY CHECK (scale_value BETWEEN 1 AND 5),
  label       TEXT NOT NULL,
  description TEXT
);

CREATE TABLE IF NOT EXISTS scorecard_sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_key    TEXT NOT NULL,
  evaluator_id  UUID NOT NULL REFERENCES people(id),
  evaluated_id  UUID NOT NULL REFERENCES people(id),
  branch_id     UUID NOT NULL REFERENCES branches(id),
  status        TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'finalized')),
  score_total   NUMERIC(5, 2) DEFAULT 0,
  submitted_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS scorecard_questions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id     UUID REFERENCES scorecard_sessions(id) ON DELETE CASCADE,
  dimension_code TEXT REFERENCES care_dimensions(dimension_code),
  question_text  TEXT NOT NULL,
  max_points     NUMERIC(5, 2) DEFAULT 10,
  sort_order     INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS scorecard_responses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID NOT NULL REFERENCES scorecard_sessions(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES scorecard_questions(id) ON DELETE CASCADE,
  score       NUMERIC(5, 2) NOT NULL DEFAULT 0,
  comments    TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ito_issues (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID REFERENCES scorecard_sessions(id),
  reporter_id     UUID NOT NULL REFERENCES people(id),
  assignee_id     UUID REFERENCES people(id),
  dimension_code  TEXT REFERENCES care_dimensions(dimension_code),
  title           TEXT NOT NULL,
  description     TEXT,
  status          TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority        TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  resolution_note TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at     TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS ito_comments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id   UUID NOT NULL REFERENCES ito_issues(id) ON DELETE CASCADE,
  author_id  UUID NOT NULL REFERENCES people(id),
  comment    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 7. CROSS-APP REPORTING & CENTRAL POINT LOGS
-- ============================================================================
CREATE TABLE IF NOT EXISTS reports (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id           TEXT NOT NULL,
  branch_id        UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  source_report_id TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'draft',
  total_points     NUMERIC(10, 2) DEFAULT 0,
  metadata         JSONB DEFAULT '{}'::jsonb,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (app_id, source_report_id)
);

CREATE TABLE IF NOT EXISTS report_contributors (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id        UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  user_id          TEXT NOT NULL,
  items_completed  INTEGER DEFAULT 0,
  points_earned    NUMERIC(10, 2) DEFAULT 0,
  share_percentage NUMERIC(5, 2) DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS point_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id          TEXT NOT NULL,
  user_id         TEXT NOT NULL,
  branch_id       UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  activity_type   TEXT NOT NULL,
  points_earned   NUMERIC(10, 2) NOT NULL DEFAULT 0,
  points_original NUMERIC(10, 2) NOT NULL DEFAULT 0,
  report_id       UUID REFERENCES reports(id) ON DELETE SET NULL,
  metadata        JSONB DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_point_logs_app_user ON point_logs(app_id, user_id);
CREATE INDEX IF NOT EXISTS idx_point_logs_branch ON point_logs(branch_id);

CREATE TABLE IF NOT EXISTS point_items (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id     TEXT NOT NULL,
  name       TEXT NOT NULL,
  points     NUMERIC(6, 2) NOT NULL DEFAULT 1.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 8. AUDIT LOGGING
-- ============================================================================
CREATE TABLE IF NOT EXISTS master_data_audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name  TEXT NOT NULL,
  record_id   UUID NOT NULL,
  action      TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  changed_by  UUID NOT NULL,
  old_values  JSONB,
  new_values  JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 8B. POINT MASTER CHANGES AUDIT (APPEND-ONLY)
-- ============================================================================
CREATE TABLE IF NOT EXISTS point_master_changes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id       TEXT NOT NULL CHECK (app_id IN ('mycheck', 'stokis', 'mycustomer')),
  entity_type  TEXT NOT NULL CHECK (entity_type IN ('checklist_item', 'incident_category', 'master_item', 'branch_config')),
  entity_ref   TEXT NOT NULL,
  entity_label TEXT,
  old_points   NUMERIC(8,2),
  new_points   NUMERIC(8,2) NOT NULL,
  action       TEXT NOT NULL CHECK (action IN ('set', 'reset', 'bulk_split')),
  reason       TEXT,
  changed_by   TEXT NOT NULL,
  changed_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_point_master_changes_lookup 
  ON point_master_changes (app_id, entity_type, entity_ref, changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_point_master_changes_app 
  ON point_master_changes (app_id, changed_at DESC);


-- ============================================================================
-- 8C. CENTRALIZED POINT PLATFORM (FREE TIER OPTIMIZED)
-- ============================================================================
CREATE TABLE IF NOT EXISTS ref_app (
  app_id     VARCHAR(16) PRIMARY KEY,
  app_name   VARCHAR(64) NOT NULL,
  is_active  BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO ref_app (app_id, app_name) VALUES
  ('mycheck', 'MyCheck Operational & Shift Checklist'),
  ('stokis', 'Stokis Inventory & Stock Opname'),
  ('mycustomer', 'MyCustomer CRM & POS')
ON CONFLICT (app_id) DO UPDATE SET
  app_name = EXCLUDED.app_name,
  is_active = EXCLUDED.is_active;

CREATE TABLE IF NOT EXISTS dim_item (
  item_id        SERIAL PRIMARY KEY,
  app_id         VARCHAR(16) NOT NULL REFERENCES ref_app(app_id) ON DELETE RESTRICT,
  item_code      VARCHAR(32) NOT NULL,
  item_name      VARCHAR(100) NOT NULL,
  default_weight NUMERIC(6,2) NOT NULL DEFAULT 1.00 CHECK (default_weight >= 0),
  tier           VARCHAR(16) DEFAULT 'standard',
  is_active      BOOLEAN NOT NULL DEFAULT true,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (app_id, item_code)
);

CREATE INDEX IF NOT EXISTS idx_dim_item_lookup ON dim_item (app_id, is_active);

CREATE TABLE IF NOT EXISTS idempotency_registry (
  idempotency_key  VARCHAR(128) PRIMARY KEY,
  event_id         UUID NOT NULL,
  app_id           VARCHAR(16) NOT NULL REFERENCES ref_app(app_id) ON DELETE RESTRICT,
  response_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_idem_created ON idempotency_registry (created_at DESC);

CREATE TABLE IF NOT EXISTS point_config (
  config_key   VARCHAR(64) PRIMARY KEY,
  config_value NUMERIC(10,2) NOT NULL,
  description  TEXT,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO point_config (config_key, config_value, description) VALUES 
  ('monthly_points_target', 1044.00, 'Target poin bulanan standar staf'),
  ('effective_hours_month', 173.00, 'Target jam kerja efektif bulanan'),
  ('daily_points_ceiling', 50.00, 'Plafon perolehan poin harian staf (kelebihan dipotong & ditandai)'),
  ('stokis_max_session_points', 8.00, 'Plafon maksimum poin per satu sesi SO fisik (80 menit)'),
  ('mycheck_shift_base_points', 2.00, 'Bobot dasar shift MyCheck'),
  ('mycustomer_wa_daily_limit', 15.00, 'Batas maksimum reward chat WA per staf per hari'),
  ('incident_reward_points', 1.50, 'Reward keterbukaan pelapor insiden'),
  ('incident_max_daily_reward', 3.00, 'Batas maksimum reward insiden per hari per staf'),
  ('audit_correction_window_days', 90.00, 'Jendela batas waktu audit koreksi saldo (hari)')
ON CONFLICT (config_key) DO UPDATE SET
  config_value = EXCLUDED.config_value,
  description = EXCLUDED.description,
  updated_at = now();

CREATE TABLE IF NOT EXISTS point_event (
  event_id          UUID DEFAULT gen_random_uuid(),
  app_id            VARCHAR(16) NOT NULL REFERENCES ref_app(app_id) ON DELETE RESTRICT,
  task_code         VARCHAR(32) NOT NULL,
  person_id         UUID NOT NULL REFERENCES people(id) ON DELETE RESTRICT,
  branch_id         UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  shift_date        DATE NOT NULL,
  occurred_at       TIMESTAMPTZ NOT NULL,
  points            NUMERIC(8,2) NOT NULL,
  kind              VARCHAR(12) NOT NULL CHECK (kind IN ('earn', 'reversal', 'adjustment')),
  reverses_event_id UUID,
  actor_id          UUID REFERENCES people(id) ON DELETE RESTRICT,
  reason            TEXT,
  session_ref       VARCHAR(64),
  idempotency_key   VARCHAR(128) NOT NULL,
  meta              JSONB DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, shift_date)
) PARTITION BY RANGE (shift_date);

CREATE INDEX IF NOT EXISTS idx_point_event_person_date ON point_event (person_id, shift_date);
CREATE INDEX IF NOT EXISTS idx_point_event_branch_date ON point_event (branch_id, shift_date);
CREATE INDEX IF NOT EXISTS idx_point_event_reversal_ref ON point_event (reverses_event_id) WHERE kind = 'reversal';

CREATE TABLE IF NOT EXISTS point_event_line (
  line_id          BIGSERIAL,
  event_id         UUID NOT NULL,
  shift_date       DATE NOT NULL,
  item_id          INTEGER NOT NULL REFERENCES dim_item(item_id) ON DELETE RESTRICT,
  qty              NUMERIC(8,2) NOT NULL DEFAULT 1.00 CHECK (qty > 0),
  weight_snapshot  NUMERIC(6,2) NOT NULL CHECK (weight_snapshot >= 0),
  points           NUMERIC(8,2) NOT NULL,
  kind             VARCHAR(12) NOT NULL DEFAULT 'earn' CHECK (kind IN ('earn', 'reversal')),
  reverses_line_id BIGINT,
  line_ref         VARCHAR(64),
  PRIMARY KEY (line_id, shift_date),
  FOREIGN KEY (event_id, shift_date) REFERENCES point_event(event_id, shift_date) ON DELETE RESTRICT
) PARTITION BY RANGE (shift_date);

CREATE INDEX IF NOT EXISTS idx_point_line_event ON point_event_line (event_id, shift_date);
CREATE INDEX IF NOT EXISTS idx_point_line_item ON point_event_line (item_id);

CREATE OR REPLACE FUNCTION trg_point_platform_prevent_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Operasi UPDATE dan DELETE dilarang pada tabel transaksi point_event dan point_event_line. Gunakan entri reversal.'
    USING ERRCODE = 'restrict_violation';
END;
$$;

DROP TRIGGER IF EXISTS trg_point_event_parent_immutable ON point_event;
CREATE TRIGGER trg_point_event_parent_immutable
  BEFORE UPDATE OR DELETE ON point_event
  FOR EACH ROW EXECUTE FUNCTION trg_point_platform_prevent_mutation();

DROP TRIGGER IF EXISTS trg_point_line_parent_immutable ON point_event_line;
CREATE TRIGGER trg_point_line_parent_immutable
  BEFORE UPDATE OR DELETE ON point_event_line
  FOR EACH ROW EXECUTE FUNCTION trg_point_platform_prevent_mutation();

CREATE OR REPLACE FUNCTION create_point_partition(p_year INT, p_month INT)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  v_part_name TEXT;
  v_start_date DATE;
  v_end_date DATE;
  v_event_table TEXT;
  v_line_table TEXT;
BEGIN
  v_start_date := make_date(p_year, p_month, 1);
  v_end_date := v_start_date + INTERVAL '1 month';
  v_part_name := to_char(v_start_date, 'YYYY_MM');
  v_event_table := 'point_event_' || v_part_name;
  v_line_table := 'point_event_line_' || v_part_name;

  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS %I PARTITION OF point_event FOR VALUES FROM (%L) TO (%L);',
    v_event_table, v_start_date, v_end_date
  );

  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS %I PARTITION OF point_event_line FOR VALUES FROM (%L) TO (%L);',
    v_line_table, v_start_date, v_end_date
  );

  EXECUTE format('DROP TRIGGER IF EXISTS trg_immutable_header ON %I;', v_event_table);
  EXECUTE format(
    'CREATE TRIGGER trg_immutable_header BEFORE UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION trg_point_platform_prevent_mutation();',
    v_event_table
  );

  EXECUTE format('DROP TRIGGER IF EXISTS trg_immutable_line ON %I;', v_line_table);
  EXECUTE format(
    'CREATE TRIGGER trg_immutable_line BEFORE UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION trg_point_platform_prevent_mutation();',
    v_line_table
  );
END;
$$;

DO $$
DECLARE
  m INT;
BEGIN
  FOR m IN 1..12 LOOP
    PERFORM create_point_partition(2026, m);
  END LOOP;
END;
$$;

CREATE TABLE IF NOT EXISTS point_daily (
  person_id    UUID NOT NULL REFERENCES people(id) ON DELETE RESTRICT,
  branch_id    UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  app_id       VARCHAR(16) NOT NULL REFERENCES ref_app(app_id) ON DELETE RESTRICT,
  date_key     DATE NOT NULL,
  total_points NUMERIC(10,2) NOT NULL DEFAULT 0,
  event_count  SMALLINT NOT NULL DEFAULT 0,
  is_capped    BOOLEAN NOT NULL DEFAULT false,
  computed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (person_id, branch_id, app_id, date_key)
);

CREATE INDEX IF NOT EXISTS idx_point_daily_date ON point_daily (date_key);

CREATE TABLE IF NOT EXISTS point_monthly (
  person_id    UUID NOT NULL REFERENCES people(id) ON DELETE RESTRICT,
  branch_id    UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  app_id       VARCHAR(16) NOT NULL REFERENCES ref_app(app_id) ON DELETE RESTRICT,
  month_key    CHAR(7) NOT NULL,
  total_points NUMERIC(10,2) NOT NULL DEFAULT 0,
  event_count  INTEGER NOT NULL DEFAULT 0,
  computed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (person_id, branch_id, app_id, month_key)
);

CREATE INDEX IF NOT EXISTS idx_point_monthly_month ON point_monthly (month_key);

CREATE OR REPLACE FUNCTION refresh_point_daily(p_date DATE)
RETURNS INTEGER LANGUAGE plpgsql AS $$
DECLARE
  v_count INTEGER := 0;
  v_ceiling NUMERIC(10,2) := 50.00;
BEGIN
  SELECT config_value INTO v_ceiling FROM point_config WHERE config_key = 'daily_points_ceiling';
  IF v_ceiling IS NULL THEN v_ceiling := 50.00; END IF;

  WITH raw_agg AS (
    SELECT
      person_id,
      branch_id,
      app_id,
      shift_date AS date_key,
      COALESCE(SUM(points), 0) AS raw_points,
      COUNT(*)::SMALLINT AS events
    FROM point_event
    WHERE shift_date = p_date
    GROUP BY person_id, branch_id, app_id, shift_date
  ),
  day_totals AS (
    SELECT
      person_id,
      SUM(raw_points) AS day_total
    FROM raw_agg
    GROUP BY person_id
  )
  INSERT INTO point_daily (person_id, branch_id, app_id, date_key, total_points, event_count, is_capped, computed_at)
  SELECT
    r.person_id,
    r.branch_id,
    r.app_id,
    r.date_key,
    CASE 
      WHEN dt.day_total > v_ceiling AND dt.day_total > 0 THEN 
        ROUND((r.raw_points / dt.day_total) * v_ceiling, 2)
      ELSE r.raw_points
    END AS total_points,
    r.events,
    (dt.day_total > v_ceiling) AS is_capped,
    now()
  FROM raw_agg r
  JOIN day_totals dt ON r.person_id = dt.person_id
  ON CONFLICT (person_id, branch_id, app_id, date_key) DO UPDATE SET
    total_points = EXCLUDED.total_points,
    event_count = EXCLUDED.event_count,
    is_capped = EXCLUDED.is_capped,
    computed_at = now();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION refresh_point_monthly(p_month CHAR(7))
RETURNS INTEGER LANGUAGE plpgsql AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  WITH daily_agg AS (
    SELECT
      person_id,
      branch_id,
      app_id,
      p_month AS month_key,
      COALESCE(SUM(total_points), 0) AS month_points,
      COALESCE(SUM(event_count), 0)::INTEGER AS total_events
    FROM point_daily
    WHERE to_char(date_key, 'YYYY-MM') = p_month
    GROUP BY person_id, branch_id, app_id
  )
  INSERT INTO point_monthly (person_id, branch_id, app_id, month_key, total_points, event_count, computed_at)
  SELECT
    person_id,
    branch_id,
    app_id,
    month_key,
    month_points,
    total_events,
    now()
  FROM daily_agg
  ON CONFLICT (person_id, branch_id, app_id, month_key) DO UPDATE SET
    total_points = EXCLUDED.total_points,
    event_count = EXCLUDED.event_count,
    computed_at = now();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION get_point_platform_storage_stats()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_bytes BIGINT;
  v_res JSONB;
BEGIN
  v_bytes := pg_database_size(current_database());
  SELECT jsonb_build_object(
    'size_bytes', v_bytes,
    'size_mb', round((v_bytes::numeric / (1024 * 1024)), 2),
    'size_pretty', pg_size_pretty(v_bytes),
    'target_max_mb', 250.00,
    'free_tier_cap_mb', 500.00,
    'warning_threshold_mb', 150.00,
    'usage_percent_of_target', round(((v_bytes::numeric / (1024 * 1024)) / 250.00) * 100, 2),
    'is_warning', ((v_bytes::numeric / (1024 * 1024)) >= 150.00)
  ) INTO v_res;
  RETURN v_res;
END;
$$;

COMMENT ON TABLE point_ledger IS 'DEPRECATED: Replaced by point_event (partitioned) in Point Platform v2. Kept for audit trail and rollback safety.';
COMMENT ON TABLE point_logs IS 'DEPRECATED: Replaced by point_event and point_event_line in Point Platform v2. Kept for historical reference.';
COMMENT ON TABLE report_contributors IS 'DEPRECATED: Aggregation now handled via point_daily and point_monthly rollups.';
COMMENT ON TABLE report_audits IS 'DEPRECATED: Replaced by point_event reversal entries with actor_id and reason audit tracking.';
COMMENT ON TABLE point_items IS 'DEPRECATED: Replaced by dim_item with tier and calibrated default_weight.';
COMMENT ON TABLE point_categories IS 'DEPRECATED: Categorization now managed dynamically in dim_item and point_config.';

-- ----------------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) FOR POINT PLATFORM TABLES
-- ----------------------------------------------------------------------------
ALTER TABLE ref_app ENABLE ROW LEVEL SECURITY;
ALTER TABLE dim_item ENABLE ROW LEVEL SECURITY;
ALTER TABLE idempotency_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_event ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_event_line ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_monthly ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'ref_app_read' AND tablename = 'ref_app') THEN
    CREATE POLICY ref_app_read ON ref_app FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'dim_item_read' AND tablename = 'dim_item') THEN
    CREATE POLICY dim_item_read ON dim_item FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'idempotency_registry_read' AND tablename = 'idempotency_registry') THEN
    CREATE POLICY idempotency_registry_read ON idempotency_registry FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'point_config_read' AND tablename = 'point_config') THEN
    CREATE POLICY point_config_read ON point_config FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'point_event_read' AND tablename = 'point_event') THEN
    CREATE POLICY point_event_read ON point_event FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'point_event_line_read' AND tablename = 'point_event_line') THEN
    CREATE POLICY point_event_line_read ON point_event_line FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'point_daily_read' AND tablename = 'point_daily') THEN
    CREATE POLICY point_daily_read ON point_daily FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'point_monthly_read' AND tablename = 'point_monthly') THEN
    CREATE POLICY point_monthly_read ON point_monthly FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'dim_item_write' AND tablename = 'dim_item') THEN
    CREATE POLICY dim_item_write ON dim_item FOR ALL TO authenticated USING (
      auth.jwt() ->> 'role' IN ('admin', 'super_admin', 'role_admin') OR auth.role() = 'service_role'
    ) WITH CHECK (
      auth.jwt() ->> 'role' IN ('admin', 'super_admin', 'role_admin') OR auth.role() = 'service_role'
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'point_config_write' AND tablename = 'point_config') THEN
    CREATE POLICY point_config_write ON point_config FOR ALL TO authenticated USING (
      auth.jwt() ->> 'role' IN ('admin', 'super_admin', 'role_admin') OR auth.role() = 'service_role'
    ) WITH CHECK (
      auth.jwt() ->> 'role' IN ('admin', 'super_admin', 'role_admin') OR auth.role() = 'service_role'
    );
  END IF;
END;
$$;
-- ============================================================================
-- 9. SEED DATA DEFAULT (BRANCHES, APPS, USERS, TASK CATALOG)
-- ============================================================================
-- SEED DATA AWAL (Idempoten & Realistis untuk Operasional Cabang)
-- ============================================================================
DO $$
DECLARE
  v_sys_id UUID := '00000000-0000-0000-0000-000000000001';
  v_bandung_id UUID;
  v_cimahi_id UUID;
  v_bekasi_id UUID;
  v_default_pin_hash TEXT := '376e923be61491b5ddfa26ff4affd13f$35274584d2b39bde7a9acfa796e1739d045b3d5d9b6c1e0bca3cc282cd1a02a0'; -- PIN: 1234
BEGIN
  -- 1. Seed 3 Cabang Utama: Bandung, Cimahi, Bekasi
  -- Bandung (BDG / Setiabudi)
  IF NOT EXISTS (SELECT 1 FROM branches WHERE code = 'BDG' OR code = 'CBGBDG01') THEN
    INSERT INTO branches (id, name, code, city, description, created_by)
    VALUES (gen_random_uuid(), 'Mochikin Bandung (Setiabudi)', 'BDG', 'Bandung', 'Outlet Utama Bandung - Jl. Dr. Setiabudi No. 88', v_sys_id)
    RETURNING id INTO v_bandung_id;
  ELSE
    SELECT id INTO v_bandung_id FROM branches WHERE code = 'BDG' OR code = 'CBGBDG01' LIMIT 1;
  END IF;

  -- Cimahi (CMH)
  IF NOT EXISTS (SELECT 1 FROM branches WHERE code = 'CMH' OR code = 'CBGCMH02') THEN
    INSERT INTO branches (id, name, code, city, description, created_by)
    VALUES (gen_random_uuid(), 'Mochikin Cimahi', 'CMH', 'Cimahi', 'Outlet Cabang Cimahi - Jl. Ria No. 6', v_sys_id)
    RETURNING id INTO v_cimahi_id;
  ELSE
    SELECT id INTO v_cimahi_id FROM branches WHERE code = 'CMH' OR code = 'CBGCMH02' LIMIT 1;
  END IF;

  -- Bekasi (BKS)
  IF NOT EXISTS (SELECT 1 FROM branches WHERE code = 'BKS' OR code = 'CBGBSK03') THEN
    INSERT INTO branches (id, name, code, city, description, created_by)
    VALUES (gen_random_uuid(), 'Mochikin Bekasi', 'BKS', 'Bekasi', 'Outlet Cabang Bekasi - Jl. Ahmad Yani No. 45', v_sys_id)
    RETURNING id INTO v_bekasi_id;
  ELSE
    SELECT id INTO v_bekasi_id FROM branches WHERE code = 'BKS' OR code = 'CBGBSK03' LIMIT 1;
  END IF;

  -- 2. Bersihkan Akun Dummy Lama (jika ada)
  UPDATE people SET status = 'inactive', deleted_at = now(), username = '_deleted_' || username WHERE username IN ('crew', 'viewer', 'admin', 'budi', 'dimas', 'siti');

  -- 3. Seed Akun Resmi (Sesuai Registry Stokis & MyCheck)
  -- dea: Admin Pusat
  INSERT INTO people (name, email, username, pin_hash, role, branch_id, status, created_by)
  VALUES
    ('Dea', 'dea@mochikin.id', 'dea', 'f3747bcfc410be0515008d5fd5bea06b$d8039a26210769ef02e8c085b11ed9d2c06985def11d0fdd2305979486fdfbeb', 'role_admin', v_bandung_id, 'active', v_sys_id)
  ON CONFLICT (username) DO UPDATE SET
    name = EXCLUDED.name,
    pin_hash = EXCLUDED.pin_hash,
    role = EXCLUDED.role,
    status = 'active';

  -- Cabang Bandung (BDG)
  INSERT INTO people (name, email, username, pin_hash, role, branch_id, status, created_by)
  VALUES
    ('Candra', 'candra@mochikin.id', 'candra', '28902af8396acff1d23057dd5d02a93c$d14ba6ac6f4f457191e49683c79d41597836b41908b6a649978d4103e30ae2dc', 'branch_manager', v_bandung_id, 'active', v_sys_id),
    ('Luthfia', 'luthfia@mochikin.id', 'luthfia', '893a31523dc1e207e779acfa2df039c0$df45e10293189b043d7eac9e27f1320a383fd9e69882b204f52fc047b0d37a95', 'staff', v_bandung_id, 'active', v_sys_id),
    ('Nurul Hilma', 'nurul.hilma@mochikin.id', 'Nurul Hilma', '4b6d74d27684faa778c2281de380bf25$cc03a602c53f3e6fe2e348f4dd61f1698fcdd90465db3202809a7db0226e81c8', 'staff', v_bandung_id, 'active', v_sys_id)
  ON CONFLICT (username) DO UPDATE SET
    name = EXCLUDED.name,
    pin_hash = EXCLUDED.pin_hash,
    branch_id = v_bandung_id,
    role = EXCLUDED.role,
    status = 'active';

  -- Cabang Cimahi (CMH)
  INSERT INTO people (name, email, username, pin_hash, role, branch_id, status, created_by)
  VALUES
    ('Prita', 'prita@mochikin.id', 'prita', 'b5117f1876d8f8f2afd7fd8412b5f77d$1d8f2e5f70f51727ea5942944ff26becee581ea3c9b97092d70c6412dfb8a682', 'branch_manager', v_cimahi_id, 'active', v_sys_id),
    ('Rifah', 'rifah@mochikin.id', 'rifah', '1e4f0ab19ea4e5b2f2dda50ba8e00697$f810d1ca8231269e03047a78d40573a821a0b0376a4ea64e1843b37f35e9d835', 'staff', v_cimahi_id, 'active', v_sys_id)
  ON CONFLICT (username) DO UPDATE SET
    name = EXCLUDED.name,
    pin_hash = EXCLUDED.pin_hash,
    branch_id = v_cimahi_id,
    role = EXCLUDED.role,
    status = 'active';

  -- Cabang Bekasi (BKS)
  INSERT INTO people (name, email, username, pin_hash, role, branch_id, status, created_by)
  VALUES
    ('Sabat', 'sabat@mochikin.id', 'sabat', '7c53f7728d623dcc9daf3e05343de153$fe4226861c793200468fa28265bbaa8c4cde412c54b100d3e2575da6c3ee5071', 'branch_manager', v_bekasi_id, 'active', v_sys_id),
    ('Alisha', 'alisha@mochikin.id', 'alisha', '567aad9762c2f811efc4ba7c107ab06d$5199c8c0cd45cd09dfe17af7f8edd7d4460f0d4cdf9bc6a4bd55f716165e1c9d', 'staff', v_bekasi_id, 'active', v_sys_id),
    ('Taufik Alwan', 'taufik@mochikin.id', 'taufik', '816cc43f6e5e83c78461d4982f43aa45$c4f72328abaa993a1c6b28c6e6f76bb5566c9f0076bbfcc5a5df67f539141f8c', 'staff', v_bekasi_id, 'active', v_sys_id)
  ON CONFLICT (username) DO UPDATE SET
    name = EXCLUDED.name,
    pin_hash = EXCLUDED.pin_hash,
    branch_id = v_bekasi_id,
    role = EXCLUDED.role,
    status = 'active';

  -- 3. Seed Apps in Launcher Catalog
  INSERT INTO apps (name, title, category, description, url, port, status, is_active, requires_sso)
  VALUES
    ('stokis', 'Stokis', 'operational', 'Sistem Stock Opname Multi Cabang & Laporan XLSX', 'http://localhost:3002', 3002, 'active', true, true),
    ('mycheck', 'MyCheck', 'operational', 'Manajemen Checklist SOP Shift, Handover & Incident', 'http://localhost:3001', 3001, 'active', true, true),
    ('myperformance', 'MyPerformance', 'analytical', 'Modul Performansi Poin Harian & CARE Scorecard', 'http://localhost:3004', 3004, 'active', true, true),
    ('mycustomer', 'MyCustomer', 'operational', 'Sistem CRM, Loyalty Pelanggan & POS Multi Cabang', 'http://localhost:3003', 3003, 'active', true, true)
  ON CONFLICT (name) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    url = EXCLUDED.url,
    port = EXCLUDED.port;

  -- 4. Seed Task Definitions Catalog for Performance Engine
  INSERT INTO task_definitions (task_code, name, app_id, category, level_role, points_per_unit, unit_output, valid_from)
  VALUES
    ('MYCHECK_HADIR',       'Hadir Tepat Waktu',          'mycheck',    'T', 'Staf', 1.00, 'shift',   '2026-01-01'),
    ('MYCHECK_SHIFT_CLOSE', 'Tutup Shift',                'mycheck',    'T', 'SPV',  2.00, 'shift',   '2026-01-01'),
    ('MYCHECK_INCIDENT',    'Laporan Insiden',            'mycheck',    'T', 'Staf', 1.50, 'laporan', '2026-01-01'),
    ('STOKIS_OPNAME',       'Opname Stok',                'stokis',     'T', 'Staf', 3.00, 'sesi',    '2026-01-01'),
    ('STOKIS_MUTASI',       'Mutasi Barang',              'stokis',     'T', 'Staf', 1.00, 'item',    '2026-01-01'),
    ('MYCUST_TIKET',        'Penanganan Tiket Pelanggan', 'mycustomer', 'T', 'Staf', 2.00, 'tiket',   '2026-01-01'),
    ('MYCUST_ORDER',        'Proses Order',               'mycustomer', 'T', 'Staf', 0.50, 'order',   '2026-01-01'),
    ('MYCUST_WA',           'Follow-Up WhatsApp Pelanggan','mycustomer', 'T', 'Staf', 1.00, 'pesan',   '2026-01-01')
  ON CONFLICT (task_code) DO NOTHING;

  -- 5. Seed CARE Scorecard Dimensions
  INSERT INTO care_dimensions (dimension_code, name, description, weight, sort_order)
  VALUES
    ('C', 'Collaboration', 'Kemampuan bekerjasama dalam tim dan saling membantu tugas operasional', 0.25, 1),
    ('A', 'Accountability', 'Tanggung jawab atas penyelesaian pekerjaan dan keandalan operasional', 0.25, 2),
    ('R', 'Respect', 'Sikap saling menghargai, komunikasi sopan, dan menjaga integritas', 0.25, 3),
    ('E', 'Excellence', 'Kualitas hasil kerja, kerapian SOP, dan orientasi kepuasan pelanggan', 0.25, 4)
  ON CONFLICT (dimension_code) DO NOTHING;

  -- 6. Seed CARE Scale
  INSERT INTO care_scale (scale_value, label, description)
  VALUES
    (1, 'Sangat Kurang', 'Perlu perbaikan mendasar dan pembinaan intensif'),
    (2, 'Kurang', 'Belum memenuhi standar minimum operasional gerai'),
    (3, 'Cukup', 'Memenuhi standar ekspektasi tugas harian'),
    (4, 'Baik', 'Melebihi standar dan menunjukkan inisiatif konsisten'),
    (5, 'Sangat Baik', 'Teladan bagi rekan tim dan memiliki komitmen tinggi')
  ON CONFLICT (scale_value) DO NOTHING;

END $$;
