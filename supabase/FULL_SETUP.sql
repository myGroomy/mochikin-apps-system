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
    ('Dea', 'dea@mochikin.id', 'dea', '454e002c7677b015de99c5c7a3039223$22b9a453bc77dbe1417a2bc1e0ec3f3891a9a5727a1a726b2d819600780f8043', 'role_admin', v_bandung_id, 'active', v_sys_id)
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
