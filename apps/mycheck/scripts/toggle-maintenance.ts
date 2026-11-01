// scripts/toggle-maintenance.ts
// Utility CLI script untuk menyalakan/mematikan mode maintenance di Google Sheet Settings_Global.
//
// Penggunaan:
//   tsx --env-file=.env scripts/toggle-maintenance.ts off
//   tsx --env-file=.env scripts/toggle-maintenance.ts on

import { listGlobalSettings, writeGlobalSettings } from '../lib/google/settings-admin';
import { resetMaintenanceCache } from '../lib/maintenance';

async function main() {
  const arg = (process.argv[2] ?? 'off').toLowerCase();
  const targetValue = arg === 'on' || arg === 'true' || arg === '1' ? 'TRUE' : 'FALSE';

  console.log(`Mengubah maintenance_mode ke: ${targetValue}...`);

  const settings = await listGlobalSettings();
  const row = settings.find((s) => s.key === 'maintenance_mode');

  if (!row) {
    console.error('❌ Kunci "maintenance_mode" tidak ditemukan di sheet Settings_Global.');
    process.exit(1);
  }

  await writeGlobalSettings([{ rowNumber: row.rowNumber, value: targetValue }]);
  resetMaintenanceCache();

  console.log(`✅ Berhasil! Mode maintenance di Settings_Global sekarang bernilai: ${targetValue}`);
}

main().catch((err) => {
  console.error('❌ Gagal mengubah maintenance mode:', err);
  process.exit(1);
});
