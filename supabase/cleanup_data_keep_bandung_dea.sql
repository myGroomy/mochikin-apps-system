-- ============================================================================
-- CLEANUP DATA: Hanya cabang Bandung + Admin Dea (PIN 778899) yang dipertahankan
-- ============================================================================
-- PERINGATAN: Operasi ini PERMANEN. Semua data akan hilang kecuali:
--   1. Cabang Bandung (id: dbd72db3-9cb9-4879-982a-4f3deacbd144)
--   2. User admin Dea (id: 8a67ef36-3b28-47fd-8cb6-4c09d96dc1aa)
-- NOTE: Tabel 'items' sudah tidak ada (dihapus cleanup sebelumnya), jadi tidak ada data items yang dipertahankan.
-- ============================================================================

-- ============================================================================
-- STEP 0: Nonaktifkan trigger audit (mencegah error field "code")
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_people_audit ON people;
DROP TRIGGER IF EXISTS trigger_branches_audit ON branches;
DROP TRIGGER IF EXISTS trigger_customers_audit ON customers;

DROP FUNCTION IF EXISTS log_master_data_change();

-- ============================================================================
-- STEP 1: Hapus semua data dari tabel anak (child tables)
-- ============================================================================

-- Tabel yang ada dalam database saat ini (17 tabel)
DELETE FROM ito_issues;
DELETE FROM care_scores;
DELETE FROM point_rollups;
DELETE FROM customers;
DELETE FROM branch_members;
DELETE FROM master_data_audit_log;
DELETE FROM task_definitions;
DELETE FROM apps;
DELETE FROM roles;

-- Tabel PayloadCMS sisa (jika masih ada)
DELETE FROM jobs;
DELETE FROM payload_preferences_rels;
DELETE FROM karier_global_benefits;

-- ============================================================================
-- STEP 2: Hapus cabang selain Bandung
-- ============================================================================

DELETE FROM branches 
WHERE id != 'dbd72db3-9cb9-4879-982a-4f3deacbd144';

-- ============================================================================
-- STEP 3: Hapus user selain admin Dea
-- ============================================================================

DELETE FROM people 
WHERE id != '8a67ef36-3b28-47fd-8cb6-4c09d96dc1aa';

-- ============================================================================
-- STEP 4: Pastikan Dea terhubung ke cabang Bandung dan role_admin
-- pin_hash diatur NULL — set PIN 778899 melalui aplikasi atau migration terpisah
-- ============================================================================

UPDATE people 
SET 
  branch_id = 'dbd72db3-9cb9-4879-982a-4f3deacbd144',
  role = 'role_admin',
  status = 'active',
  username = 'dea',
  email = 'dea@mochikin.id',
  name = 'Dea',
  pin_hash = NULL,  -- <-- Set PIN 778899 melalui aplikasi (scrypt hash tidak dapat dibuat di SQL langsung)
  failed_attempts = 0,
  locked_until = NULL,
  last_login_at = NULL
WHERE id = '8a67ef36-3b28-47fd-8cb6-4c09d96dc1aa';

-- ============================================================================
-- Verifikasi: tampilkan data yang tersisa
-- ============================================================================

SELECT 'people' as tabel, count(*) as jumlah FROM people
UNION ALL SELECT 'branches', count(*) FROM branches
UNION ALL SELECT 'care_scores', count(*) FROM care_scores
UNION ALL SELECT 'ito_issues', count(*) FROM ito_issues
UNION ALL SELECT 'point_rollups', count(*) FROM point_rollups
UNION ALL SELECT 'customers', count(*) FROM customers
UNION ALL SELECT 'branch_members', count(*) FROM branch_members
UNION ALL SELECT 'master_data_audit_log', count(*) FROM master_data_audit_log
UNION ALL SELECT 'task_definitions', count(*) FROM task_definitions
UNION ALL SELECT 'apps', count(*) FROM apps
UNION ALL SELECT 'roles', count(*) FROM roles;

-- Detail people yang tersisa
SELECT id, name, email, role, branch_id, username, pin_hash IS NOT NULL as has_pin FROM people;

-- Detail branches yang tersisa
SELECT id, name, code, city, status FROM branches;
