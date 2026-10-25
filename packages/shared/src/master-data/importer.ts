import { SheetsClient } from '@mochikin/shared/sheets';
import { getMasterDataService, type CreatePeople, type CreateBranch, type CreateItem, type CreateCustomer } from '@mochikin/shared/master-data';
import { createClient } from '@supabase/supabase-js';
import { validateEnv } from '@mochikin/shared/env';

/**
 * Data Import Workflow
 * Sync master data from Google Sheets to Supabase
 * Supports: Branches, People, Items, Customers
 */

export interface ImportResult {
  table: string;
  imported: number;
  skipped: number;
  errors: Array<{
    row: number;
    error: string;
  }>;
}

export class MasterDataImporter {
  private sheetsClient: SheetsClient;
  private masterDataService: ReturnType<typeof getMasterDataService>;
  private systemUserId: string; // UUID of system admin for audit trail

  constructor(sheetsClient: SheetsClient, supabaseClient: ReturnType<typeof createClient>, systemUserId: string) {
    this.sheetsClient = sheetsClient;
    this.masterDataService = getMasterDataService(supabaseClient);
    this.systemUserId = systemUserId;
  }

  // ============================================================================
  // BRANCHES IMPORT
  // ============================================================================

  async importBranches(spreadsheetId: string, sheetName: string = 'Daftar_Cabang'): Promise<ImportResult> {
    const result: ImportResult = {
      table: 'branches',
      imported: 0,
      skipped: 0,
      errors: [],
    };

    try {
      const rows = await this.sheetsClient.readRows(spreadsheetId, `${sheetName}!A2:G`);

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNum = i + 2;

        try {
          // Expected columns: code, name, city, address, phone, status, description
          const branch: CreateBranch = {
            code: row[0]?.trim(),
            name: row[1]?.trim(),
            city: row[2]?.trim(),
            address: row[3]?.trim() || undefined,
            phone: row[4]?.trim() || undefined,
            status: (row[5]?.toLowerCase() === 'inactive' ? 'inactive' : 'active') as any,
            description: row[6]?.trim() || undefined,
            created_by: this.systemUserId,
            settings: {},
          };

          // Validate required fields
          if (!branch.code || !branch.name || !branch.city) {
            throw new Error('Missing required fields: code, name, or city');
          }

          // Check if branch already exists (by code)
          const existing = await this.masterDataService.getBranches();
          if (existing.some((b: { code: string }) => b.code === branch.code)) {
            result.skipped++;
            continue;
          }

          await this.masterDataService.createBranch(branch, this.systemUserId);
          result.imported++;
        } catch (error) {
          result.errors.push({
            row: rowNum,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    } catch (error) {
      result.errors.push({
        row: 1,
        error: error instanceof Error ? error.message : 'Failed to read sheet',
      });
    }

    return result;
  }

  // ============================================================================
  // PEOPLE IMPORT
  // ============================================================================

  async importPeople(spreadsheetId: string, sheetName: string = 'Users'): Promise<ImportResult> {
    const result: ImportResult = {
      table: 'people',
      imported: 0,
      skipped: 0,
      errors: [],
    };

    try {
      const rows = await this.sheetsClient.readRows(spreadsheetId, `${sheetName}!A2:F`);

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNum = i + 2;

        try {
          // Expected columns: email, name, branch_code, role, phone, status
          const email = row[0]?.trim();
          const name = row[1]?.trim();
          const branchCode = row[2]?.trim();
          const role = row[3]?.toLowerCase().trim();
          const phone = row[4]?.trim();
          const status = row[5]?.toLowerCase().trim();

          // Validate
          if (!email || !name || !branchCode || !role) {
            throw new Error('Missing required fields');
          }

          // Get branch by code
          const branches = await this.masterDataService.getBranches();
          const branch = branches.find((b: { code: string }) => b.code === branchCode);
          if (!branch) {
            throw new Error(`Branch not found: ${branchCode}`);
          }

          // Validate role
          const validRoles = ['super_admin', 'branch_manager', 'staff', 'guest'];
          if (!validRoles.includes(role)) {
            throw new Error(`Invalid role: ${role}`);
          }

          const person: CreatePeople = {
            email,
            name,
            branch_id: branch.id,
            role: role as any,
            phone: phone || undefined,
            status: (status === 'inactive' ? 'inactive' : 'active') as any,
            created_by: this.systemUserId,
          };

          await this.masterDataService.createPerson(person, this.systemUserId);
          result.imported++;
        } catch (error) {
          result.errors.push({
            row: rowNum,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    } catch (error) {
      result.errors.push({
        row: 1,
        error: error instanceof Error ? error.message : 'Failed to read sheet',
      });
    }

    return result;
  }

  // ============================================================================
  // ITEMS IMPORT
  // ============================================================================

  async importItems(spreadsheetId: string, sheetName: string = 'Items'): Promise<ImportResult> {
    const result: ImportResult = {
      table: 'items',
      imported: 0,
      skipped: 0,
      errors: [],
    };

    try {
      const rows = await this.sheetsClient.readRows(spreadsheetId, `${sheetName}!A2:J`);

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNum = i + 2;

        try {
          // Expected: sku, name, category, price_retail, price_cost, unit, stock_qty, barcode, is_active
          const sku = row[0]?.trim();
          const name = row[1]?.trim();
          const category = row[2]?.trim();
          const priceRetail = parseFloat(row[3]);
          const priceCost = row[4] ? parseFloat(row[4]) : undefined;
          const unit = row[5]?.trim() || 'pcs';
          const stockQty = row[6] ? parseInt(row[6]) : 0;
          const barcode = row[7]?.trim();
          const isActive = row[8] ? row[8].toLowerCase() !== 'no' : true;

          if (!sku || !name || !category || isNaN(priceRetail)) {
            throw new Error('Missing required fields');
          }

          // Get category (create if not exists)
          let categories = await this.masterDataService.getItems();
          // Note: Would need a method to get categories - simplified here

          const item: CreateItem = {
            sku,
            name,
            category_id: 'dummy-uuid', // TODO: implement category lookup/create
            price_retail: priceRetail,
            price_cost: priceCost,
            unit,
            stock_qty: stockQty,
            barcode: barcode || undefined,
            is_active: isActive,
            is_taxable: (false) as boolean,
            created_by: this.systemUserId,
          };

          // Skip for now - would need full category implementation
          result.skipped++;
        } catch (error) {
          result.errors.push({
            row: rowNum,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    } catch (error) {
      result.errors.push({
        row: 1,
        error: error instanceof Error ? error.message : 'Failed to read sheet',
      });
    }

    return result;
  }

  // ============================================================================
  // CUSTOMERS IMPORT
  // ============================================================================

  async importCustomers(spreadsheetId: string, sheetName: string = 'Customers'): Promise<ImportResult> {
    const result: ImportResult = {
      table: 'customers',
      imported: 0,
      skipped: 0,
      errors: [],
    };

    try {
      const rows = await this.sheetsClient.readRows(spreadsheetId, `${sheetName}!A2:H`);

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNum = i + 2;

        try {
          // Expected: name, email, phone, branch_code, city, customer_type, status
          const name = row[0]?.trim();
          const email = row[1]?.trim();
          const phone = row[2]?.trim();
          const branchCode = row[3]?.trim();
          const city = row[4]?.trim();
          const customerType = row[5]?.toLowerCase().trim();
          const status = row[6]?.toLowerCase().trim();

          if (!name || !branchCode) {
            throw new Error('Missing required fields: name or branch_code');
          }

          // Get branch
          const branches = await this.masterDataService.getBranches();
          const branch = branches.find((b: { code: string }) => b.code === branchCode);
          if (!branch) {
            throw new Error(`Branch not found: ${branchCode}`);
          }

          const customer: CreateCustomer = {
            name,
            email: email || undefined,
            phone: phone || undefined,
            branch_id: branch.id,
            city: city || undefined,
            customer_type: (customerType as any) || undefined,
            status: (status === 'inactive' ? 'inactive' : 'active') as any,
            created_by: this.systemUserId,
            do_not_contact: false,
          };

          await this.masterDataService.createCustomer(customer, this.systemUserId);
          result.imported++;
        } catch (error) {
          result.errors.push({
            row: rowNum,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    } catch (error) {
      result.errors.push({
        row: 1,
        error: error instanceof Error ? error.message : 'Failed to read sheet',
      });
    }

    return result;
  }

  // ============================================================================
  // BULK IMPORT
  // ============================================================================

  async importAll(spreadsheetId: string): Promise<ImportResult[]> {
    const results: ImportResult[] = [];

    console.log('Starting master data import...');

    // Order matters: branches first, then people & customers (which reference branches)
    results.push(await this.importBranches(spreadsheetId));
    console.log(`✅ Branches: ${results[0].imported} imported, ${results[0].skipped} skipped`);

    results.push(await this.importPeople(spreadsheetId));
    console.log(`✅ People: ${results[1].imported} imported, ${results[1].skipped} skipped`);

    results.push(await this.importItems(spreadsheetId));
    console.log(`✅ Items: ${results[2].imported} imported, ${results[2].skipped} skipped`);

    results.push(await this.importCustomers(spreadsheetId));
    console.log(`✅ Customers: ${results[3].imported} imported, ${results[3].skipped} skipped`);

    return results;
  }
}
