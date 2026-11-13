-- ============================================================================
-- Migration: 016_point_platform_schema.sql
-- Module: Centralized Point Platform (Supabase Free Tier Optimized)
-- PRD: Unified Point Platform Architecture
-- Depends: 004_people_table.sql, 005_branches_table.sql
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. REFERENCE TABLES
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- 2. DIMENSION ITEMS (SYNCED FROM MASTER_ITEM / CATALOG)
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- 3. GLOBAL IDEMPOTENCY REGISTRY (NON-PARTITIONED FOR GLOBAL O(1) UNIQUENESS)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS idempotency_registry (
  idempotency_key  VARCHAR(128) PRIMARY KEY,
  event_id         UUID NOT NULL,
  app_id           VARCHAR(16) NOT NULL REFERENCES ref_app(app_id) ON DELETE RESTRICT,
  response_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_idem_created ON idempotency_registry (created_at DESC);

-- ----------------------------------------------------------------------------
-- 4. POINT CONFIGURATION (CENTRAL DYNAMIC BUSINESS RULES)
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- 5. POINT EVENT (HEADER TABLE - PARTITIONED BY RANGE ON shift_date)
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- 6. POINT EVENT LINE (ITEM-LEVEL TABLE - PARTITIONED BY RANGE ON shift_date)
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- 7. APPEND-ONLY FUNCTION (PREVENTS UPDATE/DELETE ON TRANSACTIONS)
-- ----------------------------------------------------------------------------
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
-- ----------------------------------------------------------------------------
-- 8. AUTOMATIC PARTITION CREATION FUNCTION
-- ----------------------------------------------------------------------------
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

  -- Create header partition
  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS %I PARTITION OF point_event FOR VALUES FROM (%L) TO (%L);',
    v_event_table, v_start_date, v_end_date
  );

  -- Create line partition
  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS %I PARTITION OF point_event_line FOR VALUES FROM (%L) TO (%L);',
    v_line_table, v_start_date, v_end_date
  );

  -- Attach append-only triggers to partitions
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

-- Pre-create partitions for 2026 (12 months)
DO $$
DECLARE
  m INT;
BEGIN
  FOR m IN 1..12 LOOP
    PERFORM create_point_partition(2026, m);
  END LOOP;
END;
$$;

-- ----------------------------------------------------------------------------
-- 9. PERMANENT ROLLUP TABLES (WITH app_id IN PRIMARY KEY)
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- 10. IDEMPOTENT ROLLUP REFRESH FUNCTIONS
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- 11. ROW LEVEL SECURITY (RLS) POLICIES
-- ----------------------------------------------------------------------------
ALTER TABLE ref_app ENABLE ROW LEVEL SECURITY;
ALTER TABLE dim_item ENABLE ROW LEVEL SECURITY;
ALTER TABLE idempotency_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_event ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_event_line ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_monthly ENABLE ROW LEVEL SECURITY;

-- Read policies for authenticated users
CREATE POLICY ref_app_read ON ref_app FOR SELECT TO authenticated USING (true);
CREATE POLICY dim_item_read ON dim_item FOR SELECT TO authenticated USING (true);
CREATE POLICY idempotency_registry_read ON idempotency_registry FOR SELECT TO authenticated USING (true);
CREATE POLICY point_config_read ON point_config FOR SELECT TO authenticated USING (true);
CREATE POLICY point_event_read ON point_event FOR SELECT TO authenticated USING (true);
CREATE POLICY point_event_line_read ON point_event_line FOR SELECT TO authenticated USING (true);
CREATE POLICY point_daily_read ON point_daily FOR SELECT TO authenticated USING (true);
CREATE POLICY point_monthly_read ON point_monthly FOR SELECT TO authenticated USING (true);

-- Direct client INSERT is blocked for regular users; writes must use service_role / ingress endpoints
CREATE POLICY dim_item_write ON dim_item FOR ALL TO authenticated USING (
  auth.jwt() ->> 'role' IN ('admin', 'super_admin', 'role_admin') OR auth.role() = 'service_role'
) WITH CHECK (
  auth.jwt() ->> 'role' IN ('admin', 'super_admin', 'role_admin') OR auth.role() = 'service_role'
);

CREATE POLICY point_config_write ON point_config FOR ALL TO authenticated USING (
  auth.jwt() ->> 'role' IN ('admin', 'super_admin', 'role_admin') OR auth.role() = 'service_role'
) WITH CHECK (
  auth.jwt() ->> 'role' IN ('admin', 'super_admin', 'role_admin') OR auth.role() = 'service_role'
);
