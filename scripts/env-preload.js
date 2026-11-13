const path = require('path');
const fs = require('fs');

function loadEnvFile(relPath) {
  const fullPath = path.resolve(__dirname, relPath);
  if (!fs.existsSync(fullPath)) return;
  const lines = fs.readFileSync(fullPath, 'utf8').split('\n');
  for (const line of lines) {
    const match = line.match(/^([A-Za-z0-9_]+)\s*=\s*(.*)$/);
    if (match) {
      const key = match[1];
      if (!process.env[key]) {
        let val = match[2].trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        process.env[key] = val;
      }
    }
  }
}

loadEnvFile('../.env');
loadEnvFile('../apps/mycheck/.env.local');
loadEnvFile('../apps/stokis/.env.local');
loadEnvFile('../apps/myperformance/.env.local');
loadEnvFile('../apps/mycustomer/.env.local');
