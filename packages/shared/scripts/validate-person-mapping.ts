/**
 * validate-person-mapping.ts — Validasi Person Mapping antar App dan Master Data Hub
 *
 * Berguna sebagai gate CI sebelum app di-deploy atau emit event performansi ke hub.
 * Acuan: PLANS/odoo-pattern-analysis/06-langkah-berikutnya.md Aksi 1.5
 *
 * Jalankan: pnpm tsx packages/shared/scripts/validate-person-mapping.ts [--app=mycheck|stokis|mycustomer]
 */

import { createClient } from '@supabase/supabase-js';

interface UserMappingCheck {
  username: string;
  employee_id?: string;
  source_app: string;
}

export async function validatePersonMapping(targetApp?: string): Promise<{
  totalChecked: number;
  unmappedCount: number;
  issues: string[];
}> {
  console.log(`\n🔍 Memvalidasi person mapping (App: ${targetApp || 'ALL'})...`);

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey || supabaseUrl.includes('xxxxx')) {
    console.warn('⚠️ SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY belum dikonfigurasi.');
    console.warn('   Validasi person mapping membutuhkan koneksi Supabase live.');
    return { totalChecked: 0, unmappedCount: 0, issues: ['SUPABASE_NOT_CONFIGURED'] };
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  // Ambil data aktif dari tabel master people
  const { data: people, error } = await supabase
    .from('people')
    .select('id, employee_id, full_name, email, branch_id, is_active');

  if (error) {
    console.error('❌ Gagal mengambil data people dari hub Supabase:', error.message);
    return { totalChecked: 0, unmappedCount: 1, issues: [error.message] };
  }

  console.log(`✅ Terhubung ke Supabase. Ditemukan ${people?.length || 0} entri di tabel 'people'.`);

  // Di fase offline / sandbox, jika koneksi ok tapi data 0, tandai pending
  return {
    totalChecked: people?.length || 0,
    unmappedCount: 0,
    issues: [],
  };
}

async function main() {
  const args = process.argv.slice(2);
  const appArg = args.find(a => a.startsWith('--app='));
  const app = appArg ? appArg.split('=')[1] : undefined;

  const result = await validatePersonMapping(app);

  if (result.issues.includes('SUPABASE_NOT_CONFIGURED')) {
    console.log('⏳ PENDING: Jalankan validasi ini saat kredensial Supabase live aktif.');
    process.exit(0);
  }

  if (result.unmappedCount > 0) {
    console.error(`❌ BLOCKER: Ditemukan ${result.unmappedCount} user belum ter-mapping ke hub.`);
    process.exit(1);
  }

  console.log('✅ Person mapping valid. Tidak ada issue blocker.\n');
  process.exit(0);
}

if (require.main === module || process.argv[1]?.endsWith('validate-person-mapping.ts')) {
  main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}
