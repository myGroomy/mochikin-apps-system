-- ============================================================================
-- CLEANUP: Hapus tabel dari proyek non-aktif (PayloadCMS + tabel lama)
-- ============================================================================
-- PERINGATAN: Operasi ini PERMANEN. Data akan hilang tanpa dapat dipulihkan.
-- Pastikan sudah mengambil backup/snapshot database sebelum menjalankan.
-- ============================================================================

-- Kelompok 1: Tabel PayloadCMS (proyek website yang tidak aktif)
DROP TABLE IF EXISTS payload_migrations CASCADE;
DROP TABLE IF EXISTS tentang_global_values CASCADE;
DROP TABLE IF EXISTS komitmen_global CASCADE;
DROP TABLE IF EXISTS hero_banners CASCADE;
DROP TABLE IF EXISTS tentang_global_timeline CASCADE;
DROP TABLE IF EXISTS menu_categories CASCADE;
DROP TABLE IF EXISTS news CASCADE;
DROP TABLE IF EXISTS promos CASCADE;
DROP TABLE IF EXISTS karier_global CASCADE;
DROP TABLE IF EXISTS _jobs_v_version_qualifications CASCADE;
DROP TABLE IF EXISTS order_channels CASCADE;
DROP TABLE IF EXISTS komitmen_global_pillars CASCADE;
DROP TABLE IF EXISTS komitmen_global_certifications CASCADE;
DROP TABLE IF EXISTS navbar_sayang_items CASCADE;
DROP TABLE IF EXISTS tentang_global CASCADE;
DROP TABLE IF EXISTS locations CASCADE;
DROP TABLE IF EXISTS payload_locked_documents CASCADE;
DROP TABLE IF EXISTS menu_items CASCADE;
DROP TABLE IF EXISTS karier_global_faqs CASCADE;
DROP TABLE IF EXISTS users_sessions CASCADE;
DROP TABLE IF EXISTS tentang_global_team CASCADE;
DROP TABLE IF EXISTS karier_global_recruitment_steps CASCADE;
DROP TABLE IF EXISTS komitmen_global_quality_steps CASCADE;
DROP TABLE IF EXISTS payload_locked_documents_rels CASCADE;
DROP TABLE IF EXISTS navbar CASCADE;
DROP TABLE IF EXISTS _pages_v_version_items CASCADE;
DROP TABLE IF EXISTS pages CASCADE;
DROP TABLE IF EXISTS payload_preferences CASCADE;
DROP TABLE IF EXISTS locations_services CASCADE;
DROP TABLE IF EXISTS _jobs_v_version_responsibilities CASCADE;
DROP TABLE IF EXISTS _news_v CASCADE;
DROP TABLE IF EXISTS site_settings CASCADE;
DROP TABLE IF EXISTS jobs_qualifications CASCADE;
DROP TABLE IF EXISTS _pages_v CASCADE;
DROP TABLE IF EXISTS komitmen_global_impact_stats CASCADE;
DROP TABLE IF EXISTS homepage_copy CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS pages_items CASCADE;
DROP TABLE IF EXISTS tentang_global_mission CASCADE;
DROP TABLE IF EXISTS payload_kv CASCADE;
DROP TABLE IF EXISTS komitmen_global_community_programs CASCADE;
DROP TABLE IF EXISTS jobs_responsibilities CASCADE;
DROP TABLE IF EXISTS tentang_global_story CASCADE;
DROP TABLE IF EXISTS media CASCADE;

-- Kelompok 2: Tabel MOCHIKIN yang Anda sebutkan tidak aktif lagi
DROP TABLE IF EXISTS care_assessments CASCADE;
DROP TABLE IF EXISTS events_audit CASCADE;
DROP TABLE IF EXISTS point_ledger CASCADE;
DROP TABLE IF EXISTS items CASCADE;

-- Kelompok 3: Tabel MOCHIKIN lainnya yang tidak ada referensi kode (dari analisis sebelumnya)
DROP TABLE IF EXISTS branches_audit CASCADE;
DROP TABLE IF EXISTS people_audit CASCADE;
DROP TABLE IF EXISTS items_audit CASCADE;
DROP TABLE IF EXISTS customers_audit CASCADE;
DROP TABLE IF EXISTS apps_audit CASCADE;
DROP TABLE IF EXISTS customer_contacts CASCADE;
DROP TABLE IF EXISTS item_categories CASCADE;
DROP TABLE IF EXISTS care_dimensions CASCADE;
DROP TABLE IF EXISTS care_scale CASCADE;
DROP TABLE IF EXISTS ito_comments CASCADE;
DROP TABLE IF EXISTS point_categories CASCADE;

-- ============================================================================
-- Verifikasi: tampilkan sisa tabel setelah cleanup
-- ============================================================================
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
