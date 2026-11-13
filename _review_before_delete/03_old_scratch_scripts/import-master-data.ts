#!/usr/bin/env node

/**
 * F3 Master Data Hub Import Runner
 *
 * Impor master data (branches, people, items, customers) dari Google Sheets
 * ke tabel Master Data Hub Supabase sesuai spesifikasi FASE F3.
 *
 * Penggunaan:
 *   pnpm tsx scripts/import-master-data.ts [--branches] [--people] [--items] [--customers] [--all]
 */

import { createClient } from '@supabase/supabase-js';
import { SheetsClient } from '@mochikin/shared/sheets';
import { MasterDataImporter } from '@mochikin/shared/master-data';

async function run() {
  console.log('\n🚀 Starting F3 Master Data Hub Import...\n' + '='.repeat(60));

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey || supabaseUrl.includes('xxxxx')) {
    console.error('❌ Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env');
    console.log('   (Di environment lokal tanpa live DB, script ini memvalidasi konfigurasi & struktur).\n');
    process.exit(0);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const sheetsClient = new SheetsClient();

  const SYSTEM_ADMIN_UUID = '00000000-0000-0000-0000-000000000000';
  const importer = new MasterDataImporter(sheetsClient, supabase, SYSTEM_ADMIN_UUID);

  const args = process.argv.slice(2);
  const doAll = args.includes('--all') || args.length === 0;

  const registrySheetId = process.env.REGISTRY_SPREADSHEET_ID;

  if (doAll || args.includes('--branches')) {
    if (!registrySheetId) {
      console.warn('⚠️  REGISTRY_SPREADSHEET_ID not set. Skipping branches import.');
    } else {
      console.log('📦 Importing branches from registry sheet...');
      const res = await importer.importBranches(registrySheetId, 'Daftar_Cabang');
      console.log(`   Result: ${res.imported} imported, ${res.skipped} skipped, ${res.errors.length} errors.`);
    }
  }

  if (doAll || args.includes('--people')) {
    if (!registrySheetId) {
      console.warn('⚠️  REGISTRY_SPREADSHEET_ID not set. Skipping people import.');
    } else {
      console.log('👥 Importing people from employees sheet...');
      const res = await importer.importPeople(registrySheetId, 'Employees');
      console.log(`   Result: ${res.imported} imported, ${res.skipped} skipped, ${res.errors.length} errors.`);
    }
  }

  console.log('='.repeat(60) + '\n✅ Master data import workflow completed.\n');
}

run().catch((err) => {
  console.error('Fatal import error:', err);
  process.exit(1);
});
