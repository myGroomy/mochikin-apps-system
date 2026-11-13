-- ============================================================================
-- CLEANUP DATA: Hapus semua data dummy kecuali Admin User + Cabang Bandung
-- ============================================================================
-- PERINGATAN: Operasi ini PERMANEN. Semua data akan hilang kecuali yang disebutkan di bawah.
-- Pastikan sudah mengambil backup/snapshot database sebelum menjalankan.
-- ============================================================================

-- Data yang DIPERTAHANKAN:
-- 1. Admin users (role_admin di Bandung):
--    - 1babd0b1-c940-4bc0-894c-aae8fea8f869 (Admin Mochikin)
--    - 8a67ef36-3b28-47fd-8cb6-4c09d96dc1aa (Dea)
-- 2. Cabang Bandung:
--    - dbd72db3-9cb9-4879-982a-4f3deacbd144 (Bandung, CBG01BDG)

-- ============================================================================
-- STEP 0: Nonaktifkan trigger audit (mencegah error field "code" pada people)
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_people_audit ON people;
DROP TRIGGER IF EXISTS trigger_branches_audit ON branches;
DROP TRIGGER IF EXISTS trigger_customers_audit ON customers;

DROP FUNCTION IF EXISTS log_master_data_change();

-- ============================================================================
-- STEP 1: Hapus semua data dari tabel anak (child tables) terlebih dahulu
-- untuk menghindari constraint foreign key
-- ============================================================================

DELETE FROM care_scores;
DELETE FROM ito_issues;
DELETE FROM point_rollups;
DELETE FROM customers;
DELETE FROM branch_members;
DELETE FROM master_data_audit_log;
DELETE FROM task_definitions;
DELETE FROM apps;
DELETE FROM roles;

-- Hapus sisa tabel PayloadCMS yang masih ada
DELETE FROM jobs;
DELETE FROM payload_preferences_rels;
DELETE FROM karier_global_benefits;

-- ============================================================================
-- STEP 2: Hapus people yang BUKAN admin (sisakan admin + Bandung)
-- ============================================================================

DELETE FROM people 
WHERE id NOT IN (
  '1babd0b1-c940-4bc0-894c-aae8fea8f869',  -- Admin Mochikin (role_admin, Bandung)
  '8a67ef36-3b28-47fd-8cb6-4c09d96dc1aa'   -- Dea (role_admin, Bandung)
);

-- ============================================================================
-- STEP 3: Hapus cabang selain Bandung
-- ============================================================================

DELETE FROM branches 
WHERE id != 'dbd72db3-9cb9-4879-982a-4f3deacbd144';

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

-- Tampilkan detail people yang tersisa
SELECT id, name, email, role, branch_id, username FROM people ORDER BY role, name;

-- Tampilkan detail branches yang tersisa
SELECT id, name, code, city, status FROM branches ORDER BY name;
