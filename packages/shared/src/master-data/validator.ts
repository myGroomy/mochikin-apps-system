import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Data Consistency Validator
 * Checks for orphaned records and data integrity issues
 */

export interface ValidationResult {
  passed: boolean;
  issues: ValidationIssue[];
  summary: {
    total_checks: number;
    failed_checks: number;
    warnings: number;
  };
}

export interface ValidationIssue {
  severity: 'error' | 'warning';
  table: string;
  issue: string;
  count: number;
  details?: any[];
}

export class DataConsistencyValidator {
  private supabase: SupabaseClient;

  constructor(supabaseClient: SupabaseClient) {
    this.supabase = supabaseClient;
  }

  /**
   * Run all consistency checks
   */
  async validateAll(): Promise<ValidationResult> {
    const issues: ValidationIssue[] = [];
    let checksRun = 0;

    console.log('🔍 Starting data consistency validation...');

    // Check 1: Orphaned checklists (person_id not in people table)
    checksRun++;
    const orphanedChecklists = await this.checkOrphanedChecklists();
    if (orphanedChecklists.count > 0) {
      issues.push({
        severity: 'error',
        table: 'checklists',
        issue: `Orphaned checklists (person_id not in people table): ${orphanedChecklists.count}`,
        count: orphanedChecklists.count,
      });
    }

    // Check 2: Orphaned stock opnates (person_id not in people table)
    checksRun++;
    const orphanedOpnates = await this.checkOrphanedStockOpnates();
    if (orphanedOpnates.count > 0) {
      issues.push({
        severity: 'error',
        table: 'stock_opname',
        issue: `Orphaned stock opnates (person_id not in people table): ${orphanedOpnates.count}`,
        count: orphanedOpnates.count,
      });
    }

    // Check 3: Orphaned customers (branch_id not in branches table)
    checksRun++;
    const orphanedCustomers = await this.checkOrphanedCustomers();
    if (orphanedCustomers.count > 0) {
      issues.push({
        severity: 'error',
        table: 'customers',
        issue: `Orphaned customers (branch_id not in branches table): ${orphanedCustomers.count}`,
        count: orphanedCustomers.count,
      });
    }

    // Check 4: Orphaned transactions (customer_id not in customers table)
    checksRun++;
    const orphanedTransactions = await this.checkOrphanedTransactions();
    if (orphanedTransactions.count > 0) {
      issues.push({
        severity: 'error',
        table: 'customer_transactions',
        issue: `Orphaned transactions (customer_id not in customers table): ${orphanedTransactions.count}`,
        count: orphanedTransactions.count,
      });
    }

    // Check 5: Branch mismatches (person's branch != actual branch)
    checksRun++;
    const branchMismatches = await this.checkBranchMismatches();
    if (branchMismatches.count > 0) {
      issues.push({
        severity: 'warning',
        table: 'people',
        issue: `Branch mismatches (people assigned to non-existent branches): ${branchMismatches.count}`,
        count: branchMismatches.count,
      });
    }

    // Check 6: Inactive users with recent activity
    checksRun++;
    const inactiveActivity = await this.checkInactiveUserActivity();
    if (inactiveActivity.count > 0) {
      issues.push({
        severity: 'warning',
        table: 'people',
        issue: `Inactive users with recent activity: ${inactiveActivity.count}`,
        count: inactiveActivity.count,
      });
    }

    // Check 7: Missing audit logs for critical operations
    checksRun++;
    const missingAuditLogs = await this.checkMissingAuditLogs();
    if (missingAuditLogs.count > 0) {
      issues.push({
        severity: 'warning',
        table: 'master_data_audit_log',
        issue: `Records without audit trail: ${missingAuditLogs.count}`,
        count: missingAuditLogs.count,
      });
    }

    const failedChecks = issues.filter((i) => i.severity === 'error').length;
    const warnings = issues.filter((i) => i.severity === 'warning').length;

    return {
      passed: failedChecks === 0,
      issues,
      summary: {
        total_checks: checksRun,
        failed_checks: failedChecks,
        warnings,
      },
    };
  }

  /**
   * Check for orphaned checklists
   */
  private async checkOrphanedChecklists() {
    try {
      const { data, error } = await this.supabase
        .from('checklists')
        .select('id, person_id')
        .textSearch('person_id', 'NOT EXISTS (SELECT 1 FROM people WHERE people.id = checklists.person_id)', {
          type: 'websearch',
        });

      if (error) {
        // Fallback: check manually
        const { data: checklists } = await this.supabase.from('checklists').select('person_id');
        const { data: people } = await this.supabase.from('people').select('id');

        const peopleIds = new Set((people || []).map((p: any) => p.id));
        const orphaned = (checklists || []).filter((c: any) => !peopleIds.has(c.person_id));

        return { count: orphaned.length, details: orphaned };
      }

      return { count: data?.length || 0, details: data };
    } catch (error) {
      console.error('Orphaned checklists check failed:', error);
      return { count: 0, details: [] };
    }
  }

  /**
   * Check for orphaned stock opnates
   */
  private async checkOrphanedStockOpnates() {
    try {
      const { data: opnates } = await this.supabase.from('stock_opname').select('id, person_id');
      const { data: people } = await this.supabase.from('people').select('id');

      const peopleIds = new Set((people || []).map((p: any) => p.id));
      const orphaned = (opnates || []).filter((o: any) => !peopleIds.has(o.person_id));

      return { count: orphaned.length, details: orphaned };
    } catch (error) {
      console.error('Orphaned opnates check failed:', error);
      return { count: 0, details: [] };
    }
  }

  /**
   * Check for orphaned customers
   */
  private async checkOrphanedCustomers() {
    try {
      const { data: customers } = await this.supabase.from('customers').select('id, branch_id');
      const { data: branches } = await this.supabase.from('branches').select('id');

      const branchIds = new Set((branches || []).map((b: any) => b.id));
      const orphaned = (customers || []).filter((c: any) => !branchIds.has(c.branch_id));

      return { count: orphaned.length, details: orphaned };
    } catch (error) {
      console.error('Orphaned customers check failed:', error);
      return { count: 0, details: [] };
    }
  }

  /**
   * Check for orphaned transactions
   */
  private async checkOrphanedTransactions() {
    try {
      const { data: transactions } = await this.supabase.from('customer_transactions').select('id, customer_id');
      const { data: customers } = await this.supabase.from('customers').select('id');

      const customerIds = new Set((customers || []).map((c: any) => c.id));
      const orphaned = (transactions || []).filter((t: any) => !customerIds.has(t.customer_id));

      return { count: orphaned.length, details: orphaned };
    } catch (error) {
      console.error('Orphaned transactions check failed:', error);
      return { count: 0, details: [] };
    }
  }

  /**
   * Check for branch mismatches
   */
  private async checkBranchMismatches() {
    try {
      const { data: people } = await this.supabase.from('people').select('id, branch_id');
      const { data: branches } = await this.supabase.from('branches').select('id');

      const branchIds = new Set((branches || []).map((b: any) => b.id));
      const mismatches = (people || []).filter((p: any) => p.branch_id && !branchIds.has(p.branch_id));

      return { count: mismatches.length, details: mismatches };
    } catch (error) {
      console.error('Branch mismatch check failed:', error);
      return { count: 0, details: [] };
    }
  }

  /**
   * Check for inactive users with recent activity
   */
  private async checkInactiveUserActivity() {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const { data: inactive } = await this.supabase
        .from('people')
        .select('id, name, status, updated_at')
        .eq('status', 'inactive')
        .gte('updated_at', thirtyDaysAgo);

      return { count: inactive?.length || 0, details: inactive };
    } catch (error) {
      console.error('Inactive user activity check failed:', error);
      return { count: 0, details: [] };
    }
  }

  /**
   * Check for missing audit logs
   */
  private async checkMissingAuditLogs() {
    try {
      const { data: checklists } = await this.supabase
        .from('checklists')
        .select('id, created_at')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      const { data: auditLogs } = await this.supabase
        .from('master_data_audit_log')
        .select('record_id')
        .eq('table_name', 'checklist');

      const auditedIds = new Set((auditLogs || []).map((a: any) => a.record_id));
      const missing = (checklists || []).filter((c: any) => !auditedIds.has(c.id));

      return { count: missing.length, details: missing };
    } catch (error) {
      console.error('Missing audit logs check failed:', error);
      return { count: 0, details: [] };
    }
  }

  /**
   * Generate remediation report
   */
  async generateRemediationReport(result: ValidationResult): Promise<string> {
    let report = '📋 DATA CONSISTENCY REPORT\n';
    report += `Generated: ${new Date().toISOString()}\n\n`;

    report += `Summary:\n`;
    report += `  ✓ Total Checks: ${result.summary.total_checks}\n`;
    report += `  ✗ Failed: ${result.summary.failed_checks}\n`;
    report += `  ⚠ Warnings: ${result.summary.warnings}\n`;
    report += `  Status: ${result.passed ? '✅ PASSED' : '❌ FAILED'}\n\n`;

    if (result.issues.length === 0) {
      report += 'No issues found.\n';
    } else {
      report += 'Issues Found:\n';
      for (const issue of result.issues) {
        const icon = issue.severity === 'error' ? '❌' : '⚠️';
        report += `\n${icon} [${issue.table.toUpperCase()}]\n`;
        report += `   Issue: ${issue.issue}\n`;
        if (issue.details && issue.details.length > 0 && issue.details.length <= 5) {
          report += `   Details: ${JSON.stringify(issue.details[0])}\n`;
        }
      }
    }

    return report;
  }
}

/**
 * Singleton instance
 */
let validatorInstance: DataConsistencyValidator | null = null;

export function getDataConsistencyValidator(supabaseClient: SupabaseClient): DataConsistencyValidator {
  if (!validatorInstance) {
    validatorInstance = new DataConsistencyValidator(supabaseClient);
  }
  return validatorInstance;
}
