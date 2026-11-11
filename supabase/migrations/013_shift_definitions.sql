-- ============================================================================
-- Migration: 013_shift_definitions.sql
-- Module: Operational Shift Definitions & Scheduling
-- ============================================================================
-- Creates `shift_definitions` table to centrally store and manage work shifts
-- (Opening, Closing, Regular, Custom) across Mochikin-Services and downstream apps.
-- ============================================================================

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

-- Indexes for performance & lookups
CREATE INDEX IF NOT EXISTS idx_shift_definitions_active 
  ON shift_definitions (is_active) 
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_shift_definitions_branch 
  ON shift_definitions (branch_id) 
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_shift_definitions_start_hour 
  ON shift_definitions (start_hour) 
  WHERE deleted_at IS NULL;

-- Enable RLS
ALTER TABLE shift_definitions ENABLE ROW LEVEL SECURITY;

-- Allow read access for authenticated and anonymous users
CREATE POLICY "Allow public read shift_definitions"
  ON shift_definitions
  FOR SELECT
  USING (deleted_at IS NULL);

-- Allow full access for service_role
CREATE POLICY "Allow full access for service role on shift_definitions"
  ON shift_definitions
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Seed default system shifts if not exists
INSERT INTO shift_definitions (
  id,
  name,
  short_name,
  type,
  start_hour,
  end_hour,
  time_display,
  tagline,
  branch_id,
  is_active,
  is_system_default,
  created_at
) VALUES 
(
  'opening',
  'Shift Pagi (Opening)',
  'Opening',
  'opening',
  7,
  15,
  '07:00 - 15:00 WIB',
  'Persiapan outlet, buka kasir, stock opname awal, dan SOP pagi.',
  NULL,
  true,
  true,
  now()
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
  NULL,
  true,
  true,
  now()
),
(
  'regular',
  'Shift Fleksibel (Regular)',
  'Regular',
  'regular',
  9,
  17,
  '09:00 - 17:00 WIB',
  'Jam operasional fleksibel untuk staf pendukung atau tim logistik.',
  NULL,
  false,
  false,
  now()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  short_name = EXCLUDED.short_name,
  type = EXCLUDED.type,
  start_hour = EXCLUDED.start_hour,
  end_hour = EXCLUDED.end_hour,
  time_display = EXCLUDED.time_display,
  tagline = EXCLUDED.tagline,
  is_system_default = EXCLUDED.is_system_default,
  updated_at = now();

COMMENT ON TABLE shift_definitions IS 'Master definition for store operational shifts (opening, closing, regular).';
