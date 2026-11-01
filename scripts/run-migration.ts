import fs from "node:fs";
import path from "node:path";
import pg from "pg";

// Parse .env manually
function loadEnv() {
  const envPath = path.resolve(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return {};
  const content = fs.readFileSync(envPath, "utf-8");
  const env: Record<string, string> = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx !== -1) {
      const key = trimmed.slice(0, idx).trim();
      let val = trimmed.slice(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      env[key] = val;
    }
  }
  return env;
}

async function run() {
  const env = loadEnv();
  const connectionString = env.POSTGRES_URL_NON_POOLING || env.POSTGRES_URL;

  if (!connectionString) {
    console.error("❌ Error: POSTGRES_URL_NON_POOLING not found in .env");
    process.exit(1);
  }

  const migrationFile = path.resolve(process.cwd(), "supabase/migrations/011_mochikin_services_auth.sql");
  if (!fs.existsSync(migrationFile)) {
    console.error(`❌ Error: Migration file not found at ${migrationFile}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(migrationFile, "utf-8");

  console.log("==================================================");
  console.log("⚡ EXECUTING MIGRATION 011_mochikin_services_auth.sql");
  console.log("==================================================");

  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

  let cleanConnectionString = connectionString;
  try {
    const parsed = new URL(connectionString);
    parsed.searchParams.delete("sslmode");
    cleanConnectionString = parsed.toString();
  } catch {}

  const client = new pg.Client({
    connectionString: cleanConnectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log("✅ Connected to Supabase PostgreSQL database");

    // Execute migration in transaction
    await client.query("BEGIN;");
    await client.query(sql);
    await client.query("COMMIT;");
    console.log("✅ Migration 011 applied successfully");

    // Verify columns on people
    const { rows: columns } = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'people'
      ORDER BY ordinal_position;
    `);

    console.log("\n📋 Columns in table 'people':");
    for (const col of columns) {
      console.log(`   - ${col.column_name} (${col.data_type})`);
    }

    // Check users seeded/updated
    const { rows: users } = await client.query(`
      SELECT id, name, username, email, role, status, pin_hash IS NOT NULL as has_pin
      FROM people
      ORDER BY role, name;
    `);

    console.log("\n👥 People in database with auth status:");
    for (const u of users) {
      console.log(`   • @${u.username || "no-username"} (${u.name}) - Role: ${u.role} - Has PIN: ${u.has_pin}`);
    }

    console.log("\n🎉 Database migration 011 complete & verified!");
  } catch (error) {
    await client.query("ROLLBACK;").catch(() => {});
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
