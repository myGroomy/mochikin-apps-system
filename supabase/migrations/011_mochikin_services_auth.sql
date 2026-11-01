-- ============================================================================
-- Migration: 011_mochikin_services_auth.sql
-- Module: Mochikin-Services Central Identity & Gateway Authentication
-- ============================================================================
-- Adds authentication credentials and lock fields directly to the `people` table
-- so that Mochikin-Services does not require Google Sheets or external identity silos.
-- ============================================================================

-- 1. Alter table people to add auth & security fields
ALTER TABLE people
  ADD COLUMN IF NOT EXISTS username VARCHAR(50) UNIQUE,
  ADD COLUMN IF NOT EXISTS pin_hash TEXT,
  ADD COLUMN IF NOT EXISTS failed_attempts INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

-- 2. Indexes for sub-10ms lookup during login
CREATE INDEX IF NOT EXISTS idx_people_username_lower
  ON people (LOWER(username));

CREATE INDEX IF NOT EXISTS idx_people_auth_active
  ON people (email, username)
  WHERE status = 'active';

-- 3. Document new columns
COMMENT ON COLUMN people.username IS 'Alphanumeric login identifier (e.g. admin, crew_cibiru, emp_001)';
COMMENT ON COLUMN people.pin_hash IS 'Cryptographic hash: salt$scrypt_hash for numeric PIN or password';
COMMENT ON COLUMN people.failed_attempts IS 'Consecutive failed login counter for brute-force prevention';
COMMENT ON COLUMN people.locked_until IS 'Timestamp until which the account is temporarily locked (lockout policy)';
COMMENT ON COLUMN people.last_login_at IS 'Timestamp of the most recent successful login via Mochikin-Services';

-- 4. Seed default branch and demo users if none exist (for local dev / testing)
DO $$
DECLARE
  v_system_user UUID := '00000000-0000-0000-0000-000000000001';
  v_branch_id UUID;
  v_default_pin_hash TEXT := '376e923be61491b5ddfa26ff4affd13f$35274584d2b39bde7a9acfa796e1739d045b3d5d9b6c1e0bca3cc282cd1a02a0'; -- PIN: 1234
BEGIN
  -- Ensure a default outlet branch exists
  IF NOT EXISTS (SELECT 1 FROM branches WHERE code = 'BJ01') THEN
    INSERT INTO branches (id, name, code, city, description, created_by)
    VALUES (
      gen_random_uuid(),
      'Mochikin Cibiru',
      'BJ01',
      'Bandung',
      'Outlet Cibiru - Cabang Utama',
      v_system_user
    )
    RETURNING id INTO v_branch_id;
  ELSE
    SELECT id INTO v_branch_id FROM branches WHERE code = 'BJ01' LIMIT 1;
  END IF;

  -- Ensure demo admin user exists with PIN 1234
  IF NOT EXISTS (SELECT 1 FROM people WHERE username = 'admin' OR email = 'admin@mochikin.id') THEN
    INSERT INTO people (
      name,
      email,
      username,
      pin_hash,
      role,
      branch_id,
      status,
      created_by
    ) VALUES (
      'Admin Mochikin',
      'admin@mochikin.id',
      'admin',
      v_default_pin_hash,
      'role_admin',
      v_branch_id,
      'active',
      v_system_user
    );
  ELSE
    UPDATE people
    SET username = COALESCE(username, 'admin'),
        pin_hash = COALESCE(pin_hash, v_default_pin_hash)
    WHERE email = 'admin@mochikin.id' OR username = 'admin';
  END IF;

  -- Ensure demo crew/staff user exists with PIN 1234
  IF NOT EXISTS (SELECT 1 FROM people WHERE username = 'crew' OR email = 'crew@mochikin.id') THEN
    INSERT INTO people (
      name,
      email,
      username,
      pin_hash,
      role,
      branch_id,
      status,
      created_by
    ) VALUES (
      'Petugas Kasir Cibiru',
      'crew@mochikin.id',
      'crew',
      v_default_pin_hash,
      'staff',
      v_branch_id,
      'active',
      v_system_user
    );
  ELSE
    UPDATE people
    SET username = COALESCE(username, 'crew'),
        pin_hash = COALESCE(pin_hash, v_default_pin_hash)
    WHERE email = 'crew@mochikin.id' OR username = 'crew';
  END IF;

  -- Ensure demo viewer user exists with PIN 1234
  IF NOT EXISTS (SELECT 1 FROM people WHERE username = 'viewer' OR email = 'viewer@mochikin.id') THEN
    INSERT INTO people (
      name,
      email,
      username,
      pin_hash,
      role,
      branch_id,
      status,
      created_by
    ) VALUES (
      'Viewer Training',
      'viewer@mochikin.id',
      'viewer',
      v_default_pin_hash,
      'guest',
      v_branch_id,
      'active',
      v_system_user
    );
  ELSE
    UPDATE people
    SET username = COALESCE(username, 'viewer'),
        pin_hash = COALESCE(pin_hash, v_default_pin_hash)
    WHERE email = 'viewer@mochikin.id' OR username = 'viewer';
  END IF;

  -- 5. Auto-assign default usernames and PIN 1234 to any existing employees without PIN
  UPDATE people
  SET username = LOWER(REGEXP_REPLACE(SPLIT_PART(name, ' ', 1), '[^a-zA-Z0-9]', '', 'g')),
      pin_hash = COALESCE(pin_hash, v_default_pin_hash)
  WHERE username IS NULL;

END $$;
