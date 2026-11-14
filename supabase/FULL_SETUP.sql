-- ============================================================================
-- MOCHIKIN-APPS — UNIFIED MASTER DATABASE SCHEMA (SUPABASE / POSTGRESQL)
-- ============================================================================
-- File: supabase/FULL_SETUP.sql
-- Architecture: Single Centralized PostgreSQL Database for All 5 Ecosystem Apps:
--   1. MyService     (Central Gateway, SSO, Multi-Branch & Identity)
--   2. MyPerformance (Points Engine, Immutable Ledger, Daily/Monthly Rollups, CARE 360)
--   3. MyCheck       (SOP Checklist, Shift Instances, Entries, Handovers, Incidents)
--   4. Stokis        (Stock Opname, Mutasi Stok, Ambang Batas Kritis)
--   5. MyCustomer    (CRM Pelanggan, Order Transaksi, Loyalty Rewards, WhatsApp Logs)
-- ============================================================================

-- ============================================================================
-- 0. EKSTENSI POSTGRESQL
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 0.1 PEMBERSIHAN TABEL & VIEW STARTER / TEMPLATE LAMA (JIKA ADA)
-- ============================================================================
-- 1. Bersihkan seluruh VIEW di schema public (termasuk jika branches/shift_definitions sebelumnya berupa view)
DO $$
DECLARE
  r RECORD;
  v_table TEXT;
BEGIN
  -- Drop seluruh view di schema public
  FOR r IN (
    SELECT table_name 
    FROM information_schema.views 
    WHERE table_schema = 'public'
  ) LOOP
    EXECUTE format('DROP VIEW IF EXISTS public.%I CASCADE;', r.table_name);
  END LOOP;

  -- Drop seluruh materialized view di schema public
  FOR r IN (
    SELECT matviewname 
    FROM pg_matviews 
    WHERE schemaname = 'public'
  ) LOOP
    EXECUTE format('DROP MATERIALIZED VIEW IF EXISTS public.%I CASCADE;', r.matviewname);
  END LOOP;

  -- Drop tabel-tabel starter / template lama jika ada
  FOR v_table IN SELECT unnest(ARRAY[
    'shift_participants',
    'shift_sessions',
    'user_active_context',
    'user_branches',
    'point_rules',
    'app_access',
    'areas',
    'organizations',
    'audit_log',
    'profiles',
    'roles',
    'point_items',
    'point_categories',
    'point_config'
  ]) LOOP
    EXECUTE format('DROP TABLE IF EXISTS public.%I CASCADE;', v_table);
  END LOOP;
END;
$$;
-- ============================================================================
-- 1. CORE & IDENTITY: CABANG, PENGGUNA, MULTI-BRANCH, APPS & BRAND
-- ============================================================================

-- 1.1 Master Cabang / Outlet
CREATE TABLE IF NOT EXISTS branches (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT NOT NULL,
  code              TEXT UNIQUE NOT NULL,          -- e.g. "CBG01BDG"
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
ALTER TABLE branches ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS city TEXT DEFAULT 'Bandung';
ALTER TABLE branches ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS parent_branch_id UUID REFERENCES branches(id) ON DELETE SET NULL;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS settings JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE branches ADD COLUMN IF NOT EXISTS created_by UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE branches ADD COLUMN IF NOT EXISTS updated_by UUID;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_branches_code ON branches(code);
CREATE INDEX IF NOT EXISTS idx_branches_status ON branches(status);
CREATE INDEX IF NOT EXISTS idx_branches_city ON branches(city);
-- 1.2 Master Staf / Pengguna (People)
CREATE TABLE IF NOT EXISTS people (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  email           TEXT UNIQUE NOT NULL,
  username        VARCHAR(50) UNIQUE,
  phone           TEXT,
  pin_hash        TEXT, -- Format: salt$scrypt_hash untuk PIN autentikasi
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

ALTER TABLE people ADD COLUMN IF NOT EXISTS username VARCHAR(50);
ALTER TABLE people ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE people ADD COLUMN IF NOT EXISTS pin_hash TEXT;
ALTER TABLE people ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'staff';
ALTER TABLE people ADD COLUMN IF NOT EXISTS branch_id UUID;
ALTER TABLE people ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE people ADD COLUMN IF NOT EXISTS failed_attempts INT NOT NULL DEFAULT 0;
ALTER TABLE people ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ;
ALTER TABLE people ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
ALTER TABLE people ADD COLUMN IF NOT EXISTS created_by UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE people ADD COLUMN IF NOT EXISTS updated_by UUID;
ALTER TABLE people ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
ALTER TABLE people ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_people_email ON people(email);
CREATE INDEX IF NOT EXISTS idx_people_username_lower ON people(LOWER(username));
CREATE INDEX IF NOT EXISTS idx_people_branch_id ON people(branch_id);
CREATE INDEX IF NOT EXISTS idx_people_role ON people(role);
CREATE INDEX IF NOT EXISTS idx_people_status ON people(status);

-- 1.3 Multi-Branch Penugasan Staf (Branch Members)
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

CREATE INDEX IF NOT EXISTS idx_branch_members_person ON branch_members(person_id);
CREATE INDEX IF NOT EXISTS idx_branch_members_branch ON branch_members(branch_id);
-- 1.4 Master Shift Operasional (General Shift Definitions)
CREATE TABLE IF NOT EXISTS shift_definitions (
  id                TEXT PRIMARY KEY,
  name              VARCHAR(100) NOT NULL,
  short_name        VARCHAR(50) NOT NULL,
  type              VARCHAR(50) NOT NULL DEFAULT 'regular',
  start_hour        INT NOT NULL CHECK (start_hour >= 0 AND start_hour <= 23),
  end_hour          INT NOT NULL CHECK (end_hour >= 0 AND end_hour <= 23),
  time_display      VARCHAR(50),
  tagline           TEXT,
  branch_id         UUID REFERENCES branches(id) ON DELETE SET NULL,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  is_system_default BOOLEAN NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ
);

ALTER TABLE shift_definitions ADD COLUMN IF NOT EXISTS short_name VARCHAR(50);
ALTER TABLE shift_definitions ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'regular';
ALTER TABLE shift_definitions ADD COLUMN IF NOT EXISTS start_hour INT;
ALTER TABLE shift_definitions ADD COLUMN IF NOT EXISTS end_hour INT;
ALTER TABLE shift_definitions ADD COLUMN IF NOT EXISTS time_display VARCHAR(50);
ALTER TABLE shift_definitions ADD COLUMN IF NOT EXISTS tagline TEXT;
ALTER TABLE shift_definitions ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id) ON DELETE SET NULL;
ALTER TABLE shift_definitions ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE shift_definitions ADD COLUMN IF NOT EXISTS is_system_default BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE shift_definitions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_shift_definitions_active ON shift_definitions(is_active) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_shift_definitions_branch ON shift_definitions(branch_id) WHERE deleted_at IS NULL;

-- 1.5 Registry Aplikasi Ekosistem (Launcher Catalog)
CREATE TABLE IF NOT EXISTS apps (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT UNIQUE NOT NULL,
  title         TEXT NOT NULL,
  version       TEXT NOT NULL DEFAULT '1.0.0',
  category      TEXT NOT NULL DEFAULT 'operational' CHECK (category IN ('core', 'operational', 'analytical')),
  description   TEXT,
  icon_url      TEXT,
  url           TEXT NOT NULL,
  target_url    TEXT,
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

ALTER TABLE apps ADD COLUMN IF NOT EXISTS target_url TEXT;
ALTER TABLE apps ADD COLUMN IF NOT EXISTS port INTEGER;
ALTER TABLE apps ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE apps ADD COLUMN IF NOT EXISTS requires_sso BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_apps_name ON apps(name);
-- 1.6 Brand Profile & SaaS Visual Theme
CREATE TABLE IF NOT EXISTS brand_profiles (
  id          TEXT PRIMARY KEY,
  brand_name  VARCHAR(100) NOT NULL,
  tagline     VARCHAR(255) NOT NULL,
  logo_url    TEXT,
  themes      JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by  TEXT
);

-- ============================================================================
-- 2. MYPERFORMANCE & POINTS PLATFORM (LEDGER, EVENT PARTITIONING, ROLLUPS & CARE)
-- ============================================================================

CREATE TABLE IF NOT EXISTS ref_app (
  app_id      VARCHAR(32) PRIMARY KEY,
  app_name    VARCHAR(64) NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS dim_item (
  item_id        SERIAL PRIMARY KEY,
  app_id         VARCHAR(32) NOT NULL REFERENCES ref_app(app_id),
  item_code      VARCHAR(64) NOT NULL,
  item_name      VARCHAR(128) NOT NULL,
  default_weight NUMERIC(6, 2) NOT NULL DEFAULT 1.00,
  tier           VARCHAR(32) DEFAULT 'standard',
  is_active      BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_dim_item_app_code UNIQUE (app_id, item_code)
);

CREATE TABLE IF NOT EXISTS task_definitions (
  task_code        TEXT PRIMARY KEY,
  name             TEXT NOT NULL,
  app_id           TEXT NOT NULL,
  category         CHAR(1) CHECK (category IN ('M', 'T') OR category IS NULL),
  level_role       TEXT CHECK (level_role IN ('Manajer', 'SPV', 'Staf') OR level_role IS NULL),
  points_per_unit  NUMERIC(6, 2) NOT NULL CHECK (points_per_unit >= 0),
  unit_output      TEXT,
  is_active        BOOLEAN NOT NULL DEFAULT true,
  valid_from       DATE NOT NULL DEFAULT '2026-01-01',
  valid_to         DATE,
  created_by       TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS idempotency_registry (
  idempotency_key VARCHAR(128) PRIMARY KEY,
  app_id          VARCHAR(32) NOT NULL,
  first_seen_at   TIMESTAMPTZ NOT NULL DEFAULT now()
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

CREATE OR REPLACE FUNCTION myperformance_point_ledger_append_only()
RETURNS trigger LANGUAGE plpgsql AS $$
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

-- Partitioned point_event & point_event_line
CREATE TABLE IF NOT EXISTS point_event (
  event_id        BIGSERIAL,
  app_id          VARCHAR(32) NOT NULL,
  task_code       VARCHAR(64) NOT NULL,
  person_id       UUID NOT NULL REFERENCES people(id) ON DELETE RESTRICT,
  branch_id       UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  shift_date      DATE NOT NULL,
  occurred_at     TIMESTAMPTZ NOT NULL,
  points          NUMERIC(8, 2) NOT NULL,
  kind            VARCHAR(16) NOT NULL CHECK (kind IN ('earn', 'reversal', 'adjustment')),
  idempotency_key VARCHAR(128) NOT NULL,
  session_ref     VARCHAR(128),
  actor_id        UUID REFERENCES people(id),
  meta            JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, shift_date)
) PARTITION BY RANGE (shift_date);

CREATE TABLE IF NOT EXISTS point_event_line (
  line_id         BIGSERIAL,
  event_id        BIGINT NOT NULL,
  shift_date      DATE NOT NULL,
  item_id         INTEGER NOT NULL REFERENCES dim_item(item_id),
  points          NUMERIC(8, 2) NOT NULL,
  quantity        NUMERIC(10, 2) NOT NULL DEFAULT 1.00,
  line_order      SMALLINT NOT NULL DEFAULT 1,
  meta            JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (line_id, shift_date)
) PARTITION BY RANGE (shift_date);

CREATE TABLE IF NOT EXISTS point_daily (
  person_id    UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  branch_id    UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  app_id       VARCHAR(32) NOT NULL,
  date_key     DATE NOT NULL,
  total_points NUMERIC(8, 2) NOT NULL DEFAULT 0.00,
  event_count  INTEGER NOT NULL DEFAULT 0,
  is_capped    BOOLEAN NOT NULL DEFAULT false,
  computed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (person_id, date_key, app_id)
);

CREATE TABLE IF NOT EXISTS point_monthly (
  person_id    UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  branch_id    UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  app_id       VARCHAR(32) NOT NULL,
  month_key    CHAR(7) NOT NULL,
  total_points NUMERIC(8, 2) NOT NULL DEFAULT 0.00,
  event_count  INTEGER NOT NULL DEFAULT 0,
  computed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (person_id, month_key, app_id)
);

CREATE TABLE IF NOT EXISTS point_rollups (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id      UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  branch_id      UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  period_type    TEXT NOT NULL CHECK (period_type IN ('daily', 'monthly')),
  period_key     TEXT NOT NULL,
  source_app     TEXT NOT NULL,
  total_points   NUMERIC(10, 2) NOT NULL DEFAULT 0,
  total_tasks    INT NOT NULL DEFAULT 0,
  last_updated   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (person_id, period_type, period_key, source_app)
);

-- Point Platform Partition Generator & Functions
CREATE OR REPLACE FUNCTION trg_point_platform_prevent_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Operasi UPDATE dan DELETE dilarang pada tabel transaksi point_event dan point_event_line. Gunakan entri reversal.'
    USING ERRCODE = 'restrict_violation';
END;
$$;

CREATE OR REPLACE FUNCTION create_point_partition(p_year INT, p_month INT)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  v_part_name TEXT;
  v_start_date TEXT;
  v_end_date TEXT;
  v_event_table TEXT;
  v_line_table TEXT;
BEGIN
  v_part_name := format('%s_%s', p_year, lpad(p_month::text, 2, '0'));
  v_start_date := format('%s-%s-01', p_year, lpad(p_month::text, 2, '0'));
  v_end_date := (v_start_date::date + interval '1 month')::date::text;
  v_event_table := format('point_event_%s', v_part_name);
  v_line_table := format('point_event_line_%s', v_part_name);

  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS %I PARTITION OF point_event FOR VALUES FROM (%L) TO (%L);',
    v_event_table, v_start_date, v_end_date
  );
  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS %I PARTITION OF point_event_line FOR VALUES FROM (%L) TO (%L);',
    v_line_table, v_start_date, v_end_date
  );

  EXECUTE format(
    'CREATE INDEX IF NOT EXISTS idx_%s_lookup ON %I(person_id, branch_id, shift_date);',
    v_event_table, v_event_table
  );
  EXECUTE format(
    'CREATE UNIQUE INDEX IF NOT EXISTS uq_%s_idempotency ON %I(idempotency_key);',
    v_event_table, v_event_table
  );
  EXECUTE format(
    'CREATE INDEX IF NOT EXISTS idx_%s_event_ref ON %I(event_id, shift_date);',
    v_line_table, v_line_table
  );

  BEGIN
    EXECUTE format(
      'CREATE TRIGGER trg_immutable_header BEFORE UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION trg_point_platform_prevent_mutation();',
      v_event_table
    );
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    EXECUTE format(
      'CREATE TRIGGER trg_immutable_line BEFORE UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION trg_point_platform_prevent_mutation();',
      v_line_table
    );
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END;
$$;

-- Pre-create partitions for 2026
DO $$
BEGIN
  FOR m IN 1..12 LOOP
    PERFORM create_point_partition(2026, m);
  END LOOP;
END;
$$;

-- Rollup daily & monthly calculation functions
CREATE OR REPLACE FUNCTION refresh_point_daily(p_date DATE)
RETURNS INTEGER LANGUAGE plpgsql AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  INSERT INTO point_daily (person_id, branch_id, app_id, date_key, total_points, event_count, is_capped, computed_at)
  SELECT
    person_id,
    branch_id,
    app_id,
    shift_date AS date_key,
    LEAST(COALESCE(SUM(points), 0.00), 50.00) AS total_points,
    COUNT(*)::INT AS event_count,
    (COALESCE(SUM(points), 0.00) > 50.00) AS is_capped,
    now() AS computed_at
  FROM point_event
  WHERE shift_date = p_date
  GROUP BY person_id, branch_id, app_id, shift_date
  ON CONFLICT (person_id, date_key, app_id) DO UPDATE SET
    total_points = EXCLUDED.total_points,
    event_count  = EXCLUDED.event_count,
    is_capped    = EXCLUDED.is_capped,
    computed_at  = now();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION refresh_point_monthly(p_month CHAR(7))
RETURNS INTEGER LANGUAGE plpgsql AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  INSERT INTO point_monthly (person_id, branch_id, app_id, month_key, total_points, event_count, computed_at)
  SELECT
    person_id,
    branch_id,
    app_id,
    p_month AS month_key,
    COALESCE(SUM(total_points), 0.00) AS total_points,
    COALESCE(SUM(event_count), 0)::INT AS event_count,
    now() AS computed_at
  FROM point_daily
  WHERE to_char(date_key, 'YYYY-MM') = p_month
  GROUP BY person_id, branch_id, app_id
  ON CONFLICT (person_id, month_key, app_id) DO UPDATE SET
    total_points = EXCLUDED.total_points,
    event_count  = EXCLUDED.event_count,
    computed_at  = now();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION get_point_platform_storage_stats()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT json_build_object(
    'total_events', (SELECT COUNT(*) FROM point_event),
    'total_lines', (SELECT COUNT(*) FROM point_event_line),
    'total_daily', (SELECT COUNT(*) FROM point_daily),
    'total_monthly', (SELECT COUNT(*) FROM point_monthly),
    'checked_at', now()
  ) INTO v_result;
  RETURN v_result;
END;
$$;

-- CARE 360 Scorecards Tables
CREATE TABLE IF NOT EXISTS care_dimensions (
  id VARCHAR(32) PRIMARY KEY,
  name VARCHAR(64) NOT NULL,
  weight NUMERIC(4, 2) NOT NULL DEFAULT 0.20
);

CREATE TABLE IF NOT EXISTS care_settings (
  key VARCHAR(64) PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS care_periods (
  period_key VARCHAR(7) PRIMARY KEY,
  is_closed BOOLEAN NOT NULL DEFAULT false,
  closed_at TIMESTAMPTZ,
  closed_by UUID REFERENCES people(id)
);

CREATE TABLE IF NOT EXISTS care_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_key VARCHAR(7) NOT NULL,
  branch_id UUID NOT NULL REFERENCES branches(id),
  submitted_by UUID NOT NULL REFERENCES people(id),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS care_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES care_submissions(id) ON DELETE CASCADE,
  assessor_id UUID NOT NULL REFERENCES people(id),
  assessed_id UUID NOT NULL REFERENCES people(id),
  branch_id UUID NOT NULL REFERENCES branches(id),
  score NUMERIC(5, 2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS care_assessments_rp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES care_assessments(id) ON DELETE CASCADE,
  dimension_id VARCHAR(32) NOT NULL REFERENCES care_dimensions(id),
  score NUMERIC(5, 2) NOT NULL
);

CREATE TABLE IF NOT EXISTS care_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_key VARCHAR(7) NOT NULL,
  person_id UUID NOT NULL REFERENCES people(id),
  branch_id UUID NOT NULL REFERENCES branches(id),
  final_score NUMERIC(5, 2) NOT NULL,
  rank INT,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (period_key, person_id)
);

CREATE TABLE IF NOT EXISTS care_complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id),
  customer_name VARCHAR(100),
  description TEXT NOT NULL,
  reported_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS care_followups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id UUID NOT NULL REFERENCES care_complaints(id) ON DELETE CASCADE,
  notes TEXT NOT NULL,
  handled_by UUID NOT NULL REFERENCES people(id),
  handled_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS care_ito_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id),
  title VARCHAR(150) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'open',
  reported_by UUID NOT NULL REFERENCES people(id),
  reported_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ito_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id),
  title VARCHAR(150) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'open',
  reported_by UUID NOT NULL REFERENCES people(id),
  reported_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 3. UNIFIED MODUL MYCHECK: SOP, CHECKLIST, SHIFTS, HANDOVERS & INCIDENTS
-- ============================================================================

-- 3.1 Template Shift Definition per Cabang / Global
CREATE TABLE IF NOT EXISTS mycheck_shift_definitions (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id          UUID REFERENCES branches(id) ON DELETE CASCADE, -- NULL = template global
  name               TEXT NOT NULL,                                  -- e.g. "Shift Pagi (Opening)"
  start_time         TIME NOT NULL,                                  -- "07:00"
  end_time           TIME NOT NULL,                                  -- "15:00"
  crosses_midnight   BOOLEAN NOT NULL DEFAULT false,
  sort_order         INT NOT NULL DEFAULT 1,
  is_active          BOOLEAN NOT NULL DEFAULT true,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mc_shift_def_branch ON mycheck_shift_definitions(branch_id);

-- 3.2 Kategori SOP per Shift (Opening, Bar, Kitchen, Kasir, Closing)
CREATE TABLE IF NOT EXISTS mycheck_sop_categories (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_definition_id UUID NOT NULL REFERENCES mycheck_shift_definitions(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  color               VARCHAR(32) DEFAULT '#059669',                 -- Warna chip filter UI
  sort_order          INT NOT NULL DEFAULT 1,
  is_active           BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mc_cat_shift ON mycheck_sop_categories(shift_definition_id);

-- 3.3 Item Tugas Checklist SOP
CREATE TABLE IF NOT EXISTS mycheck_checklist_points (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id    UUID NOT NULL REFERENCES mycheck_sop_categories(id) ON DELETE CASCADE,
  point_text     TEXT NOT NULL,
  input_types    TEXT[] NOT NULL DEFAULT '{"boolean"}',              -- boolean, number, text, photo, radio
  options        TEXT[],                                             -- opsi radio bila ada
  weight_points  NUMERIC(6, 2) NOT NULL DEFAULT 1.00,
  is_required    BOOLEAN NOT NULL DEFAULT true,
  sort_order     INT NOT NULL DEFAULT 1,
  is_active      BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mc_points_cat ON mycheck_checklist_points(category_id);

-- 3.4 Definisi Form Serah Terima Antar-Shift (Handover Fields)
CREATE TABLE IF NOT EXISTS mycheck_handover_fields (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_definition_id UUID NOT NULL REFERENCES mycheck_shift_definitions(id) ON DELETE CASCADE,
  field_name          TEXT NOT NULL,
  field_type          TEXT NOT NULL DEFAULT 'text',                  -- text, number, boolean, photo
  is_required         BOOLEAN NOT NULL DEFAULT false,
  sort_order          INT NOT NULL DEFAULT 1,
  is_active           BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mc_ho_fields_shift ON mycheck_handover_fields(shift_definition_id);

-- 3.5 Shift Instance Operasional Harian
CREATE TABLE IF NOT EXISTS mycheck_shift_instances (
  id                   TEXT PRIMARY KEY,                             -- e.g. "SI_ZZYTKST79JHA2WSXSK7DNFN8PW"
  branch_id            UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  shift_definition_id  UUID NOT NULL REFERENCES mycheck_shift_definitions(id) ON DELETE RESTRICT,
  shift_date           DATE NOT NULL,
  status               TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'force_closed', 'void')),
  pj_user_id           UUID NOT NULL REFERENCES people(id) ON DELETE RESTRICT,
  opened_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at            TIMESTAMPTZ,
  opened_outside_hours BOOLEAN NOT NULL DEFAULT false,
  closed_outside_hours BOOLEAN NOT NULL DEFAULT false,
  template_snapshot    JSONB,                                        -- snapshot struktur SOP saat shift dibuka
  is_test              BOOLEAN NOT NULL DEFAULT false,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mc_instances_branch_date ON mycheck_shift_instances(branch_id, shift_date);
CREATE INDEX IF NOT EXISTS idx_mc_instances_status ON mycheck_shift_instances(status);

-- 3.6 Jawaban Checklist Aktual (Entries)
CREATE TABLE IF NOT EXISTS mycheck_entries (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_instance_id  TEXT NOT NULL REFERENCES mycheck_shift_instances(id) ON DELETE CASCADE,
  point_id           UUID REFERENCES mycheck_checklist_points(id) ON DELETE SET NULL,
  point_text_snap    TEXT NOT NULL,
  input_type         TEXT NOT NULL,
  value_boolean      BOOLEAN,
  value_number       NUMERIC(12, 2),
  value_text         TEXT,
  photo_url          TEXT,
  notes              TEXT,
  filled_by_user_id  UUID NOT NULL REFERENCES people(id) ON DELETE RESTRICT,
  filled_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mc_entries_instance ON mycheck_entries(shift_instance_id);

-- 3.7 Serah Terima Aktual (Handovers)
CREATE TABLE IF NOT EXISTS mycheck_handovers (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_instance_id     TEXT NOT NULL REFERENCES mycheck_shift_instances(id) ON DELETE CASCADE,
  from_user_id          UUID NOT NULL REFERENCES people(id) ON DELETE RESTRICT,
  field_values          JSONB NOT NULL DEFAULT '{}'::jsonb,
  notes                 TEXT,
  submitted_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  acknowledged_by_id    UUID REFERENCES people(id) ON DELETE SET NULL,
  acknowledged_at       TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_mc_handovers_instance ON mycheck_handovers(shift_instance_id);

-- 3.8 Insiden Operasional Selama Shift (Incidents)
CREATE TABLE IF NOT EXISTS mycheck_incidents (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id          UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  shift_instance_id  TEXT REFERENCES mycheck_shift_instances(id) ON DELETE SET NULL,
  category           TEXT NOT NULL,
  title              TEXT NOT NULL,
  description        TEXT NOT NULL,
  severity           TEXT NOT NULL DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status             TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved')),
  photo_urls         TEXT[],
  reported_by_id     UUID NOT NULL REFERENCES people(id) ON DELETE RESTRICT,
  reported_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_by_id     UUID REFERENCES people(id) ON DELETE SET NULL,
  resolved_at        TIMESTAMPTZ,
  resolution_notes   TEXT
);

CREATE INDEX IF NOT EXISTS idx_mc_incidents_branch ON mycheck_incidents(branch_id, status);

-- 3.9 Notifikasi Internal MyCheck
CREATE TABLE IF NOT EXISTS mycheck_notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  branch_id   UUID REFERENCES branches(id) ON DELETE CASCADE,
  type        VARCHAR(64) NOT NULL,
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  link        TEXT,
  is_read     BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mc_notif_user ON mycheck_notifications(user_id, is_read);

-- ============================================================================
-- 4. UNIFIED MODUL STOKIS: MASTER BARANG, OPNAME, AMBANG BATAS & MUTASI
-- ============================================================================

-- 4.1 Master Barang Stock Opname
CREATE TABLE IF NOT EXISTS stokis_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code            TEXT UNIQUE NOT NULL,                              -- e.g. "AYAM_POTONG", "TEPUNG_PREMIX"
  name            TEXT NOT NULL,
  category        TEXT NOT NULL,                                     -- e.g. "Bahan Baku", "Bahan Penolong", "Kemasan"
  unit            TEXT NOT NULL DEFAULT 'kg',                        -- kg, gram, pcs, liter, pack
  default_weight  NUMERIC(6, 2) NOT NULL DEFAULT 1.00,
  tier            VARCHAR(32) DEFAULT 'standard',
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stokis_items_code ON stokis_items(code);
CREATE INDEX IF NOT EXISTS idx_stokis_items_active ON stokis_items(is_active);

-- 4.2 Ambang Batas Stok Kritis per Cabang (Thresholds)
CREATE TABLE IF NOT EXISTS stokis_branch_thresholds (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id     UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  item_id       UUID NOT NULL REFERENCES stokis_items(id) ON DELETE CASCADE,
  min_stock     NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  warning_level NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (branch_id, item_id)
);

CREATE INDEX IF NOT EXISTS idx_stokis_thresh_branch ON stokis_branch_thresholds(branch_id);

-- 4.3 Sesi Stock Opname
CREATE TABLE IF NOT EXISTS stokis_opnames (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id       UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  opname_date     DATE NOT NULL,
  shift_type      VARCHAR(32) NOT NULL DEFAULT 'closing',            -- opening, closing, custom
  status          VARCHAR(32) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'verified')),
  notes           TEXT,
  submitted_by_id UUID NOT NULL REFERENCES people(id) ON DELETE RESTRICT,
  submitted_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  verified_by_id  UUID REFERENCES people(id) ON DELETE SET NULL,
  verified_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_stokis_opnames_branch_date ON stokis_opnames(branch_id, opname_date);

-- 4.4 Baris Detail Stock Opname per Barang
CREATE TABLE IF NOT EXISTS stokis_opname_lines (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opname_id       UUID NOT NULL REFERENCES stokis_opnames(id) ON DELETE CASCADE,
  item_id         UUID NOT NULL REFERENCES stokis_items(id) ON DELETE RESTRICT,
  system_stock    NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  physical_stock  NUMERIC(12, 2) NOT NULL,
  difference      NUMERIC(12, 2) GENERATED ALWAYS AS (physical_stock - system_stock) STORED,
  unit            TEXT NOT NULL,
  notes           TEXT,
  photo_url       TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stokis_lines_opname ON stokis_opname_lines(opname_id);

-- 4.5 Log Mutasi Stok Fisik (Masuk, Keluar, Waste, Transfer)
CREATE TABLE IF NOT EXISTS stokis_mutations (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id      UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  item_id        UUID NOT NULL REFERENCES stokis_items(id) ON DELETE RESTRICT,
  mutation_type  TEXT NOT NULL CHECK (mutation_type IN ('in', 'out', 'transfer', 'waste', 'adjustment')),
  quantity       NUMERIC(12, 2) NOT NULL CHECK (quantity > 0),
  unit           TEXT NOT NULL,
  reference_doc  TEXT,
  notes          TEXT,
  created_by_id  UUID NOT NULL REFERENCES people(id) ON DELETE RESTRICT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stokis_mutations_branch ON stokis_mutations(branch_id, created_at);

-- ============================================================================
-- 5. UNIFIED MODUL MYCUSTOMER: CRM, ORDERS, LOYALTY & INTERAKSI
-- ============================================================================

-- 5.1 Master Pelanggan (CRM Customers)
CREATE TABLE IF NOT EXISTS mycust_customers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id       UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  name            TEXT NOT NULL,
  phone           VARCHAR(32) NOT NULL,                              -- Nomor WA normalisasi E.164
  email           TEXT,
  address         TEXT,
  loyalty_points  INTEGER NOT NULL DEFAULT 0 CHECK (loyalty_points >= 0),
  total_orders    INTEGER NOT NULL DEFAULT 0,
  total_spend     NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blacklisted')),
  registered_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_order_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_mycust_customers_phone ON mycust_customers(phone);
CREATE INDEX IF NOT EXISTS idx_mycust_customers_branch ON mycust_customers(branch_id);

-- 5.2 Transaksi Order Pelanggan
CREATE TABLE IF NOT EXISTS mycust_orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id       UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  customer_id     UUID NOT NULL REFERENCES mycust_customers(id) ON DELETE RESTRICT,
  order_number    VARCHAR(64) UNIQUE NOT NULL,
  order_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  total_amount    NUMERIC(15, 2) NOT NULL CHECK (total_amount >= 0),
  discount_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  payment_method  TEXT NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash', 'qris', 'debit', 'transfer', 'point')),
  status          TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'cancelled')),
  cashier_id      UUID NOT NULL REFERENCES people(id) ON DELETE RESTRICT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mycust_orders_branch_date ON mycust_orders(branch_id, order_date);
CREATE INDEX IF NOT EXISTS idx_mycust_orders_cust ON mycust_orders(customer_id);

-- 5.3 Detail Item Pesanan (Order Items)
CREATE TABLE IF NOT EXISTS mycust_order_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    UUID NOT NULL REFERENCES mycust_orders(id) ON DELETE CASCADE,
  item_name   TEXT NOT NULL,
  quantity    INTEGER NOT NULL CHECK (quantity > 0),
  unit_price  NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0),
  subtotal    NUMERIC(12, 2) NOT NULL CHECK (subtotal >= 0)
);

CREATE INDEX IF NOT EXISTS idx_mycust_order_items_order ON mycust_order_items(order_id);

-- 5.4 Log Loyalty Rewards (Poin Pelanggan)
CREATE TABLE IF NOT EXISTS mycust_loyalty_logs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id    UUID NOT NULL REFERENCES mycust_customers(id) ON DELETE CASCADE,
  order_id       UUID REFERENCES mycust_orders(id) ON DELETE SET NULL,
  points_change  INTEGER NOT NULL,                                   -- +10 earn, -50 redeem, -10 reversal
  kind           TEXT NOT NULL CHECK (kind IN ('earn', 'redeem', 'adjustment', 'reversal')),
  description    TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mycust_loyalty_cust ON mycust_loyalty_logs(customer_id);

-- 5.5 Catatan Interaksi / WhatsApp CRM Logs
CREATE TABLE IF NOT EXISTS mycust_interactions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id       UUID NOT NULL REFERENCES mycust_customers(id) ON DELETE CASCADE,
  branch_id         UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  interaction_type  TEXT NOT NULL CHECK (interaction_type IN ('wa_message', 'feedback', 'complaint', 'promo_blast')),
  notes             TEXT NOT NULL,
  staff_id          UUID NOT NULL REFERENCES people(id) ON DELETE RESTRICT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mycust_interactions_cust ON mycust_interactions(customer_id);

-- ============================================================================
-- 6. DATA AWAL RESMI & SEED DEFAULT (FRESH CLEAN INSTALL)
-- ============================================================================

-- 6.1 Cabang Utama (CBG01BDG)
INSERT INTO branches (id, name, code, description, city, address, status, created_by)
VALUES (
  'dbd72db3-9cb9-4879-982a-4f3deacbd144',
  'Mochikin Bandung (Setiabudi)',
  'CBG01BDG',
  'Outlet Utama & Pusat Pelatihan Operasional',
  'Bandung',
  'Jl. Dr. Setiabudi No. 120, Bandung',
  'active',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  city = EXCLUDED.city,
  status = 'active';

-- 6.2 Akun Pengguna Resmi: Dea (Admin) & Taufik (Staff)
-- PIN dea: 778899 | PIN taufik: 123456
INSERT INTO people (id, name, email, username, pin_hash, role, branch_id, status, created_by)
VALUES 
(
  '8a67ef36-3b28-47fd-8cb6-4c09d96dc1aa',
  'Dea',
  'dea@mochikin.id',
  'dea',
  'f3747bcfc410be0515008d5fd5bea06b$d8039a26210769ef02e8c085b11ed9d2c06985def11d0fdd2305979486fdfbeb',
  'role_admin',
  'dbd72db3-9cb9-4879-982a-4f3deacbd144',
  'active',
  '00000000-0000-0000-0000-000000000001'
),
(
  '11ae2974-1a7c-4486-b6df-050c59ca8ce1',
  'Taufik Alwan',
  'taufik@mochikin.id',
  'taufik',
  'cd7d8791793bdf536ed3ecd8e79f2116$dc2caa1b5fd0def10c4713a5ee56a348c79ae92a81a4e6b451cbe832143469ab',
  'staff',
  'dbd72db3-9cb9-4879-982a-4f3deacbd144',
  'active',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (email) DO UPDATE SET
  username = EXCLUDED.username,
  pin_hash = EXCLUDED.pin_hash,
  role = EXCLUDED.role,
  branch_id = EXCLUDED.branch_id,
  status = 'active',
  deleted_at = NULL;

-- 6.3 Penugasan Multi-Branch Akun Resmi
INSERT INTO branch_members (branch_id, person_id, branch_role, is_active, assigned_by)
VALUES 
('dbd72db3-9cb9-4879-982a-4f3deacbd144', '8a67ef36-3b28-47fd-8cb6-4c09d96dc1aa', 'manager', true, '8a67ef36-3b28-47fd-8cb6-4c09d96dc1aa'),
('dbd72db3-9cb9-4879-982a-4f3deacbd144', '11ae2974-1a7c-4486-b6df-050c59ca8ce1', 'staff', true, '8a67ef36-3b28-47fd-8cb6-4c09d96dc1aa')
ON CONFLICT (branch_id, person_id) DO UPDATE SET is_active = true;

-- 6.4 Katalog Shift Operasional Bawaan
INSERT INTO shift_definitions (id, name, short_name, type, start_hour, end_hour, time_display, tagline, is_active, is_system_default)
VALUES 
(
  'opening',
  'Shift Pagi (Opening)',
  'Opening',
  'opening',
  7,
  15,
  '07:00 - 15:00 WIB',
  'Persiapan outlet, buka kasir, stock opname awal, dan SOP pagi.',
  true,
  true
),
(
  'closing',
  'Shift Sore (Closing)',
  'Closing',
  'closing',
  15,
  23,
  '15:00 - 23:00 WIB',
  'Operasional sore, closing kasir, stock opname akhir, dan serah terima.',
  true,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  is_active = true,
  deleted_at = NULL;

-- 6.5 Katalog 5 Aplikasi Ekosistem di Portal MyService
INSERT INTO apps (name, title, version, category, description, url, target_url, port, status, is_active, requires_sso)
VALUES
(
  'myservice',
  'MyService Portal',
  '1.0.0',
  'core',
  'Pusat autentikasi staf, launcher SSO, dan portal manajemen cabang.',
  'http://localhost:3000',
  'http://localhost:3000',
  3000,
  'active',
  true,
  false
),
(
  'mycheck',
  'MyCheck SOP',
  '1.0.0',
  'operational',
  'Checklist SOP digital, handover shift harian, dan pelaporan insiden.',
  'http://localhost:3001',
  'http://localhost:3001',
  3001,
  'active',
  true,
  true
),
(
  'stokis',
  'Stokis Opname',
  '1.0.0',
  'operational',
  'Pencatatan opname stok harian, threshold bahan baku, dan integrasi gudang.',
  'http://localhost:3002',
  'http://localhost:3002',
  3002,
  'active',
  true,
  true
),
(
  'mycustomer',
  'MyCustomer CRM',
  '1.0.0',
  'operational',
  'Database pelanggan gerai, histori pesanan, dan loyalty rewards.',
  'http://localhost:3003',
  'http://localhost:3003',
  3003,
  'active',
  true,
  true
),
(
  'myperformance',
  'MyPerformance Engine',
  '1.0.0',
  'analytical',
  'Buku besar poin terverifikasi, scorecard kinerja 360, dan leaderboard.',
  'http://localhost:3004',
  'http://localhost:3004',
  3004,
  'active',
  true,
  true
) ON CONFLICT (name) DO UPDATE SET
  title = EXCLUDED.title,
  port = EXCLUDED.port,
  status = 'active',
  is_active = true;

-- 6.6 Brand Profile SaaS Bawaan
INSERT INTO brand_profiles (id, brand_name, tagline, themes, is_active)
VALUES (
  'default',
  'Mochikin',
  'Street Snack & Modern Food Services',
  '{"service": "#d97706", "mycheck": "#059669", "mystokis": "#2563eb", "mycustomer": "#0284c7", "myperformance": "#4d662c"}'::jsonb,
  true
) ON CONFLICT (id) DO UPDATE SET
  brand_name = EXCLUDED.brand_name,
  tagline = EXCLUDED.tagline,
  themes = EXCLUDED.themes;

-- 6.7 Referensi App dan Master Task Definitions
INSERT INTO ref_app (app_id, app_name, is_active)
VALUES
('mycheck', 'MyCheck Operational & Shift Checklist', true),
('stokis', 'Stokis Inventory & Stock Opname', true),
('mycustomer', 'MyCustomer CRM & POS', true),
('myperformance', 'MyPerformance Engine & Leaderboard', true)
ON CONFLICT (app_id) DO NOTHING;

INSERT INTO task_definitions (task_code, name, app_id, category, level_role, points_per_unit, unit_output, is_active, valid_from)
VALUES
('MYCHECK_HADIR', 'Hadir Tepat Waktu', 'mycheck', 'T', 'Staf', 1.00, 'shift', true, '2026-01-01'),
('MYCHECK_SHIFT_CLOSE', 'Tutup Shift', 'mycheck', 'T', 'SPV', 2.00, 'shift', true, '2026-01-01'),
('MYCHECK_INCIDENT', 'Laporan Insiden', 'mycheck', 'T', 'Staf', 1.50, 'laporan', true, '2026-01-01'),
('STOKIS_OPNAME', 'Opname Stok', 'stokis', 'T', 'Staf', 2.00, 'sesi', true, '2026-01-01'),
('STOKIS_MUTASI', 'Mutasi Stok Masuk/Keluar', 'stokis', 'T', 'Staf', 0.50, 'dokumen', true, '2026-01-01'),
('MYCUST_ORDER', 'Input Order Transaksi', 'mycustomer', 'M', 'Staf', 0.50, 'order', true, '2026-01-01'),
('MYCUST_WA', 'Broadcast/Followup WhatsApp', 'mycustomer', 'T', 'Staf', 0.25, 'chat', true, '2026-01-01')
ON CONFLICT (task_code) DO NOTHING;

-- 6.8 Default Stokis Master Items
INSERT INTO stokis_items (code, name, category, unit, default_weight, tier, is_active)
VALUES
('AYAM_POTONG', 'Daging Ayam Fillet', 'Bahan Baku', 'kg', 1.00, 'tier_1', true),
('TEPUNG_PREMIX', 'Tepung Bumbu Premix', 'Bahan Baku', 'kg', 0.80, 'tier_1', true),
('MINYAK_GORENG', 'Minyak Goreng Sawit', 'Bahan Baku', 'liter', 0.50, 'tier_2', true),
('BUMBU_TABUR', 'Bumbu Tabur Aneka Rasa', 'Bahan Penolong', 'pack', 0.30, 'tier_3', true),
('KEMASAN_BOX', 'Packaging Paper Box M', 'Kemasan', 'pcs', 0.10, 'tier_3', true)
ON CONFLICT (code) DO NOTHING;

INSERT INTO dim_item (app_id, item_code, item_name, default_weight, tier, is_active)
VALUES
('stokis', 'AYAM_POTONG', 'Daging Ayam Fillet', 1.00, 'tier_1', true),
('stokis', 'TEPUNG_PREMIX', 'Tepung Bumbu Premix', 0.80, 'tier_1', true),
('stokis', 'MINYAK_GORENG', 'Minyak Goreng Sawit', 0.50, 'tier_2', true),
('stokis', 'BUMBU_TABUR', 'Bumbu Tabur Aneka Rasa', 0.30, 'tier_3', true),
('stokis', 'KEMASAN_BOX', 'Packaging Paper Box M', 0.10, 'tier_3', true)
ON CONFLICT (app_id, item_code) DO NOTHING;
