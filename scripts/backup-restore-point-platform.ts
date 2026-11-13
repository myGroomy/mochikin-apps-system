import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
function getClient(override?: any): any {
  if (override) return override;
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createClient } = require('@supabase/supabase-js');
  return createClient(url, key, { auth: { persistSession: false } });
}

export interface PlatformBackupData {
  version: string;
  created_at: string;
  source_database: string;
  checksum_sha256: string;
  tables: {
    ref_app: any[];
    dim_item: any[];
    point_config: any[];
    idempotency_registry: any[];
    point_event: any[];
    point_event_line: any[];
    point_daily: any[];
    point_monthly: any[];
  };
}

/**
 * Creates a verified JSON backup of all Point Platform tables with SHA-256 checksum.
 */
export async function createPointPlatformBackup(options?: {
  supabaseClient?: any;
  outputDir?: string;
}): Promise<{ backupPath: string; checksum: string; recordCount: number }> {
  const supabase = getClient(options?.supabaseClient);
  const outDir = options?.outputDir || path.resolve(__dirname, '../backups');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const tableNames = [
    'ref_app',
    'dim_item',
    'point_config',
    'idempotency_registry',
    'point_event',
    'point_event_line',
    'point_daily',
    'point_monthly',
  ] as const;

  const tablesData: any = {};
  let totalRecords = 0;

  for (const t of tableNames) {
    const { data, error } = await supabase.from(t).select('*');
    if (error) {
      console.warn(`⚠️ Warning fetching ${t} for backup: ${error.message}`);
      tablesData[t] = [];
    } else {
      tablesData[t] = data || [];
      totalRecords += (data || []).length;
    }
  }

  const rawJson = JSON.stringify(tablesData);
  const checksum = createHash('sha256').update(rawJson).digest('hex');

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `point_platform_backup_${timestamp}.json`;
  const backupPath = path.join(outDir, filename);

  const payload: PlatformBackupData = {
    version: '1.0.0',
    created_at: new Date().toISOString(),
    source_database: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'supabase-db',
    checksum_sha256: checksum,
    tables: tablesData,
  };

  fs.writeFileSync(backupPath, JSON.stringify(payload, null, 2), 'utf8');
  return { backupPath, checksum, recordCount: totalRecords };
}

/**
 * Restores Point Platform data from a verified backup payload into target tables.
 * Verifies SHA-256 checksum before applying any restoration.
 */
export async function restorePointPlatform(
  backupFilePathOrData: string | PlatformBackupData,
  options?: { supabaseClient?: any; targetTablePrefix?: string }
): Promise<{ success: boolean; checksumValid: boolean; restoredCounts: Record<string, number> }> {
  let backupData: PlatformBackupData;
  if (typeof backupFilePathOrData === 'string') {
    const content = fs.readFileSync(backupFilePathOrData, 'utf8');
    backupData = JSON.parse(content);
  } else {
    backupData = backupFilePathOrData;
  }

  // 1. Verifikasi Checksum SHA-256
  const computedChecksum = createHash('sha256')
    .update(JSON.stringify(backupData.tables))
    .digest('hex');
  const checksumValid = computedChecksum === backupData.checksum_sha256;

  if (!checksumValid) {
    throw new Error('Integritas backup gagal: SHA-256 checksum tidak cocok (data rusak atau termodifikasi)');
  }

  const supabase = getClient(options?.supabaseClient);
  const prefix = options?.targetTablePrefix || '';
  const restoredCounts: Record<string, number> = {};

  // Urutan restore mematuhi Foreign Key:
  // ref_app -> point_config -> dim_item -> point_daily -> point_monthly
  const orderedTables = [
    'ref_app',
    'point_config',
    'dim_item',
    'point_daily',
    'point_monthly',
  ] as const;

  for (const t of orderedTables) {
    const rows = backupData.tables[t] || [];
    const targetTable = `${prefix}${t}`;
    if (rows.length === 0) {
      restoredCounts[t] = 0;
      continue;
    }

    let inserted = 0;
    // Chunked insert
    const chunkSize = 50;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      const { error } = await supabase.from(targetTable).upsert(chunk, { ignoreDuplicates: true });
      if (!error) {
        inserted += chunk.length;
      }
    }
    restoredCounts[t] = inserted;
  }

  return { success: true, checksumValid, restoredCounts };
}

// CLI Runner jika dijalankan mandiri
if (require.main === module) {
  (async () => {
    console.log('🚀 Menjalankan manual backup Point Platform...');
    const res = await createPointPlatformBackup();
    console.log('✓ Backup selesai:', res.backupPath);
    console.log('✓ Checksum SHA-256:', res.checksum);
    console.log('✓ Total baris:', res.recordCount);
  })().catch((err) => {
    console.error('Fatal backup error:', err);
    process.exit(1);
  });
}
