#!/usr/bin/env node

/**
 * F4.13 Migration Script
 * Removes duplicate user tables from individual apps
 * Maps existing users to master data people table
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const env = {
  SUPABASE_URL: process.env.SUPABASE_URL!,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY!,
};

if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

interface MigrationReport {
  timestamp: string;
  app: string;
  table: string;
  recordsProcessed: number;
  recordsMapped: number;
  recordsSkipped: number;
  errors: string[];
}

const reports: MigrationReport[] = [];

async function migrateAppUsers(appName: string, userTableName: string) {
  console.log(`\n🔄 Migrating ${appName}...`);

  const report: MigrationReport = {
    timestamp: new Date().toISOString(),
    app: appName,
    table: userTableName,
    recordsProcessed: 0,
    recordsMapped: 0,
    recordsSkipped: 0,
    errors: [],
  };

  try {
    // Fetch existing users from app table
    const { data: appUsers, error: fetchError } = await supabase
      .from(userTableName)
      .select('*');

    if (fetchError) {
      report.errors.push(`Failed to fetch users: ${fetchError.message}`);
      console.warn(`⚠️  Table ${userTableName} not found or inaccessible`);
      reports.push(report);
      return;
    }

    if (!appUsers || appUsers.length === 0) {
      console.log(`✅ No users found in ${userTableName}`);
      reports.push(report);
      return;
    }

    console.log(`📊 Found ${appUsers.length} users in ${userTableName}`);
    report.recordsProcessed = appUsers.length;

    // Map each user to master data people table
    for (const user of appUsers) {
      try {
        // Find matching person by email
        const { data: person, error: personError } = await supabase
          .from('people')
          .select('id')
          .eq('email', user.email || user.username)
          .single();

        if (personError || !person) {
          // Create new person in master data if not exists
          const { data: newPerson, error: createError } = await supabase
            .from('people')
            .insert([
              {
                name: user.name || user.username || 'Unknown',
                email: user.email || `${user.username}@migrated.local`,
                role: user.role || 'guest',
                status: 'active',
                branch_id: user.branch_id, // If app user had branch_id
              },
            ])
            .select()
            .single();

          if (createError) {
            report.errors.push(`Failed to create person for ${user.email}: ${createError.message}`);
            report.recordsSkipped++;
            console.warn(`⚠️  Failed to migrate ${user.email}`);
            continue;
          }

          console.log(`✅ Created person: ${user.email} → ${newPerson.id}`);
          report.recordsMapped++;
        } else {
          console.log(`✅ Mapped existing person: ${user.email} → ${person.id}`);
          report.recordsMapped++;
        }
      } catch (error: any) {
        report.errors.push(`Exception migrating user: ${error.message}`);
        report.recordsSkipped++;
      }
    }

    // Archive app user table (don't delete immediately for safety)
    const archiveTableName = `${userTableName}_archived`;

    console.log(`\n📦 Archiving ${userTableName} as ${archiveTableName}...`);

    // Note: Cannot directly rename in Supabase via API
    // Admin must manually archive or we create a marker
    const { error: archiveError } = await supabase
      .from('_app_migrations')
      .insert([
        {
          migration_date: new Date().toISOString(),
          app_name: appName,
          original_table: userTableName,
          archived_as: archiveTableName,
          status: 'pending_manual_archive',
          notes: `Table ${userTableName} can be manually renamed or deleted after verification`,
        },
      ]);

    if (archiveError) {
      console.warn(`⚠️  Could not log archive: ${archiveError.message}`);
    }

    console.log(`✅ Migration complete for ${appName}`);
    console.log(`   Processed: ${report.recordsProcessed}`);
    console.log(`   Mapped: ${report.recordsMapped}`);
    console.log(`   Skipped: ${report.recordsSkipped}`);

    if (report.errors.length > 0) {
      console.log(`   Errors: ${report.errors.length}`);
    }
  } catch (error: any) {
    report.errors.push(`Fatal error: ${error.message}`);
    console.error(`❌ Migration failed: ${error.message}`);
  }

  reports.push(report);
}

async function runMigrations() {
  console.log('🚀 Starting user migration from app tables to master data...\n');

  // Apps with user tables to migrate
  const appsTomigrate = [
    { app: 'mycheck', table: 'users' },
    { app: 'stokis', table: 'users' },
    { app: 'mycustomer', table: 'users' },
  ];

  for (const { app, table } of appsTomigrate) {
    await migrateAppUsers(app, table);
  }

  // Generate report
  console.log('\n\n📋 MIGRATION REPORT\n' + '='.repeat(50));

  let totalProcessed = 0;
  let totalMapped = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  for (const report of reports) {
    console.log(`\n${report.app} (${report.table})`);
    console.log(`  Processed: ${report.recordsProcessed}`);
    console.log(`  Mapped: ${report.recordsMapped}`);
    console.log(`  Skipped: ${report.recordsSkipped}`);

    if (report.errors.length > 0) {
      console.log(`  Errors:`);
      report.errors.slice(0, 3).forEach((e) => console.log(`    - ${e}`));
      if (report.errors.length > 3) {
        console.log(`    ... and ${report.errors.length - 3} more`);
      }
    }

    totalProcessed += report.recordsProcessed;
    totalMapped += report.recordsMapped;
    totalSkipped += report.recordsSkipped;
    totalErrors += report.errors.length;
  }

  console.log('\n' + '='.repeat(50));
  console.log(`SUMMARY`);
  console.log(`  Total processed: ${totalProcessed}`);
  console.log(`  Total mapped: ${totalMapped}`);
  console.log(`  Total skipped: ${totalSkipped}`);
  console.log(`  Total errors: ${totalErrors}`);

  // Save report
  const reportPath = path.join(process.cwd(), 'migration-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(reports, null, 2));
  console.log(`\n📄 Full report saved to: ${reportPath}`);

  if (totalErrors === 0 && totalMapped === totalProcessed) {
    console.log('\n✅ Migration completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Verify all users are in master data people table');
    console.log('2. Update app code to remove user table references');
    console.log('3. Manually archive or delete app user tables');
    console.log('4. Deploy updated apps');
    process.exit(0);
  } else {
    console.log('\n⚠️  Migration completed with errors or skipped records');
    console.log('Please review the report and resolve issues before archiving');
    process.exit(1);
  }
}

// Run migrations
runMigrations().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
