-- ============================================================================
-- Migration: 014_brand_profile_and_localhost_apps.sql
-- Module: SaaS Brand Profile, Custom Themes, and Localhost App Defaults
-- ============================================================================

-- 1. Create brand_profiles table for SaaS multi-branding
CREATE TABLE IF NOT EXISTS brand_profiles (
  id TEXT PRIMARY KEY DEFAULT 'default',
  brand_name VARCHAR(100) NOT NULL DEFAULT 'Mochikin',
  tagline TEXT DEFAULT 'Street Snack & Modern Food Services',
  logo_url TEXT,
  themes JSONB DEFAULT '{
    "service": "gold",
    "mystokis": "blue",
    "mycustomer": "navy",
    "mycheck": "black",
    "myperformance": "olive"
  }'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by TEXT
);

-- RLS for brand_profiles
ALTER TABLE brand_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read brand_profiles" ON brand_profiles;
CREATE POLICY "Allow public read brand_profiles"
  ON brand_profiles
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow full access service_role on brand_profiles" ON brand_profiles;
CREATE POLICY "Allow full access service_role on brand_profiles"
  ON brand_profiles
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Seed default brand profile
INSERT INTO brand_profiles (id, brand_name, tagline, themes, is_active)
VALUES (
  'default',
  'Mochikin',
  'Street Snack & Modern Food Services',
  '{
    "service": "gold",
    "mystokis": "blue",
    "mycustomer": "navy",
    "mycheck": "black",
    "myperformance": "olive"
  }'::jsonb,
  true
)
ON CONFLICT (id) DO UPDATE SET
  brand_name = COALESCE(NULLIF(brand_profiles.brand_name, ''), EXCLUDED.brand_name),
  tagline = COALESCE(NULLIF(brand_profiles.tagline, ''), EXCLUDED.tagline),
  updated_at = now();

-- 2. Seed / Update apps table with default localhost URLs for seamless local dev & staging
-- MyStokis: Port 3002
-- MyCheck: Port 3001
-- MyCustomer: Port 3003
-- MyPerformance: Port 3004

-- Upsert MyStokis (rebranded from Stokis)
INSERT INTO apps (id, name, title, version, category, description, url, status, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'mystokis',
  'MyStokis',
  '1.0.0',
  'operational',
  'Manajemen stok, bahan baku & Stock Opname harian.',
  'http://localhost:3002',
  'active',
  now(),
  now()
)
ON CONFLICT (name) DO UPDATE SET
  title = 'MyStokis',
  url = 'http://localhost:3002',
  updated_at = now();

-- Also ensure legacy 'stokis' identifier links to 3002 if present
INSERT INTO apps (id, name, title, version, category, description, url, status, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'stokis',
  'MyStokis',
  '1.0.0',
  'operational',
  'Manajemen stok, bahan baku & Stock Opname harian.',
  'http://localhost:3002',
  'active',
  now(),
  now()
)
ON CONFLICT (name) DO UPDATE SET
  title = 'MyStokis',
  url = 'http://localhost:3002',
  updated_at = now();

-- Upsert MyCheck
INSERT INTO apps (id, name, title, version, category, description, url, status, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'mycheck',
  'MyCheck',
  '1.0.0',
  'operational',
  'Checklist operasional shift, SOP outlet & pelaporan insiden.',
  'http://localhost:3001',
  'active',
  now(),
  now()
)
ON CONFLICT (name) DO UPDATE SET
  title = 'MyCheck',
  url = 'http://localhost:3001',
  updated_at = now();

-- Upsert MyCustomer
INSERT INTO apps (id, name, title, version, category, description, url, status, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'mycustomer',
  'MyCustomer',
  '1.0.0',
  'analytical',
  'Database pelanggan, analitik retensi & WhatsApp CRM.',
  'http://localhost:3003',
  'active',
  now(),
  now()
)
ON CONFLICT (name) DO UPDATE SET
  title = 'MyCustomer',
  url = 'http://localhost:3003',
  updated_at = now();

-- Upsert MyPerformance
INSERT INTO apps (id, name, title, version, category, description, url, status, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'myperformance',
  'MyPerformance',
  '1.0.0',
  'analytical',
  'Pusat akumulasi poin, scorecard 360 & leaderboard kru.',
  'http://localhost:3004',
  'active',
  now(),
  now()
)
ON CONFLICT (name) DO UPDATE SET
  title = 'MyPerformance',
  url = 'http://localhost:3004',
  updated_at = now();
