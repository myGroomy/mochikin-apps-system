-- ============================================================================
-- CLEANUP: Hapus tabel yang tidak terpakai oleh aplikasi
-- ============================================================================
-- Dijalankan di Supabase SQL Editor atau via psql
-- Tabel berikut tidak ada referensi di manapun di kode aplikasi (ts/tsx/js)
-- ============================================================================

-- 1. Audit tables (tidak ada kode yang mereferensinya)
DROP TABLE IF EXISTS branches_audit CASCADE;
DROP TABLE IF EXISTS people_audit CASCADE;
DROP TABLE IF EXISTS items_audit CASCADE;
DROP TABLE IF EXISTS customers_audit CASCADE;
DROP TABLE IF EXISTS apps_audit CASCADE;

-- 2. CRM / contact tables (tidak ada kode yang mereferensinya)
DROP TABLE IF EXISTS customer_contacts CASCADE;

-- 3. Master data tables (tidak ada kode yang mereferensinya)
DROP TABLE IF EXISTS item_categories CASCADE;

-- 4. CARE Scorecard tables (tidak ada kode yang mereferensinya)
DROP TABLE IF EXISTS care_dimensions CASCADE;
DROP TABLE IF EXISTS care_scale CASCADE;

-- 5. ITO (Issues To Operational) tables (tidak ada kode yang mereferensinya)
DROP TABLE IF EXISTS ito_comments CASCADE;

-- 6. Point system tables (tidak ada kode yang mereferensinya)
DROP TABLE IF EXISTS point_categories CASCADE;

-- Verifikasi: tabel yang tersisa setelah cleanup
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
