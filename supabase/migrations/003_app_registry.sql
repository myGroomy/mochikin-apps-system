-- 003_app_registry.sql
-- App Registry table for MOCHIKIN-APPS launcher

CREATE TABLE IF NOT EXISTS apps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  version TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('core', 'operational', 'analytical')),
  description TEXT,
  icon_url TEXT,
  url TEXT NOT NULL,
  repository TEXT,
  depends TEXT[] DEFAULT ARRAY[]::TEXT[],
  provides TEXT[] DEFAULT ARRAY[]::TEXT[],
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'beta')),
  config JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by TEXT,
  updated_by TEXT
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_apps_name ON apps(name);
CREATE INDEX IF NOT EXISTS idx_apps_category ON apps(category);
CREATE INDEX IF NOT EXISTS idx_apps_status ON apps(status);

-- RLS Policies
ALTER TABLE apps ENABLE ROW LEVEL SECURITY;

-- Anyone can read active apps
DROP POLICY IF EXISTS "anyone_read_active_apps" ON apps;
CREATE POLICY "anyone_read_active_apps" ON apps
  FOR SELECT
  USING (status = 'active');

-- Admin can manage all apps
DROP POLICY IF EXISTS "admin_manage_apps" ON apps;
CREATE POLICY "admin_manage_apps" ON apps
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'role_admin');

-- Audit log for app registry changes
CREATE TABLE IF NOT EXISTS apps_audit (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  app_id UUID REFERENCES apps(id) ON DELETE CASCADE,
  operation TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
  changed_by TEXT,
  changed_at TIMESTAMP DEFAULT NOW(),
  old_values JSONB,
  new_values JSONB
);

CREATE INDEX IF NOT EXISTS idx_apps_audit_app ON apps_audit(app_id);
CREATE INDEX IF NOT EXISTS idx_apps_audit_date ON apps_audit(changed_at);
