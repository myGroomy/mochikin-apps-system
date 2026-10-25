import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { MasterDataService, getMasterDataService } from '@mochikin/shared/master-data';

/**
 * Stokis (Stock Opname) Integration Layer
 * Handles person_id mapping, branch-scoped inventory, and validation
 */

export class StokisIntegrationService {
  private masterDataService: MasterDataService;
  private supabase: SupabaseClient;

  constructor(supabaseClient: SupabaseClient) {
    this.supabase = supabaseClient;
    this.masterDataService = getMasterDataService(supabaseClient);
  }

  /**
   * Validate request context: person_id, branch_id from JWT
   */
  async validateRequestContext(personId: string, branchId: string): Promise<boolean> {
    try {
      const person = await this.masterDataService.getPersonById(personId);
      if (!person) {
        console.warn(`Person not found: ${personId}`);
        return false;
      }

      if (person.branch_id !== branchId) {
        console.warn(`Branch mismatch: person ${personId} not in branch ${branchId}`);
        return false;
      }

      if (person.status !== 'active') {
        console.warn(`Person inactive: ${personId}`);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Request context validation error:', error);
      return false;
    }
  }

  /**
   * Get person details
   */
  async getPersonContext(personId: string) {
    try {
      const person = await this.masterDataService.getPersonById(personId);
      if (!person) return null;

      return {
        person_id: person.id,
        name: person.name,
        email: person.email,
        branch_id: person.branch_id,
        role: person.role,
      };
    } catch (error) {
      console.error('Failed to get person context:', error);
      return null;
    }
  }

  /**
   * Get branch inventory items
   * Used for stock opname form
   */
  async getBranchInventoryItems(branchId: string) {
    try {
      // Get all active items (global catalog)
      const items = await this.masterDataService.getItems({ is_active: true });

      // In future, could filter by branch-specific item lists
      return items || [];
    } catch (error) {
      console.error('Failed to get inventory items:', error);
      return [];
    }
  }

  /**
   * Validate stock opname creation
   */
  async validateStockOpnameCreation(
    personId: string,
    branchId: string,
    opnameData: any
  ): Promise<{ valid: boolean; error?: string }> {
    try {
      // Validate context
      const contextValid = await this.validateRequestContext(personId, branchId);
      if (!contextValid) {
        return { valid: false, error: 'Invalid person or branch' };
      }

      // Validate branch exists
      const branch = await this.masterDataService.getBranchById(branchId);
      if (!branch) {
        return { valid: false, error: 'Branch not found' };
      }

      // Validate required fields
      if (!opnameData.date || !opnameData.items || opnameData.items.length === 0) {
        return { valid: false, error: 'Missing date or items' };
      }

      // Validate items exist in master data
      for (const item of opnameData.items) {
        const masterItem = await this.masterDataService.getItemById(item.item_id);
        if (!masterItem) {
          return { valid: false, error: `Item not found: ${item.item_id}` };
        }
      }

      return { valid: true };
    } catch (error) {
      console.error('Stock opname validation error:', error);
      return { valid: false, error: 'Validation failed' };
    }
  }

  /**
   * Enrich stock opname record
   */
  enrichStockOpnameRecord(opnameRecord: any, personId: string, branchId: string) {
    return {
      ...opnameRecord,
      person_id: personId,
      branch_id: branchId,
      created_by: personId,
      updated_by: personId,
      opname_date: opnameRecord.date || new Date().toISOString(),
    };
  }

  /**
   * Validate before emitting event
   * Ensures person_id, branch_id, and item references are valid
   */
  async validateBeforeEvent(
    eventData: any,
    eventType: string,
    personId: string,
    branchId: string
  ): Promise<boolean> {
    try {
      // Validate context
      const contextValid = await this.validateRequestContext(personId, branchId);
      if (!contextValid) return false;

      // Event-specific validation
      switch (eventType) {
        case 'stock_opname.created':
        case 'stock_opname.updated':
          if (!eventData.opname_id || !eventData.branch_id) {
            console.warn('Missing required fields for stock opname event');
            return false;
          }
          break;

        case 'stock_opname.submitted':
          if (!eventData.opname_id || !eventData.person_id) {
            console.warn('Missing required fields for submission event');
            return false;
          }
          // Verify person_id matches
          if (eventData.person_id !== personId) {
            console.warn('Person mismatch in event');
            return false;
          }
          break;

        case 'inventory.adjustment':
          if (!eventData.item_id || !eventData.quantity_change) {
            console.warn('Missing required fields for inventory adjustment event');
            return false;
          }
          // Validate item exists
          const item = await this.masterDataService.getItemById(eventData.item_id);
          if (!item) {
            console.warn(`Item not found: ${eventData.item_id}`);
            return false;
          }
          break;

        default:
          console.warn(`Unknown event type: ${eventType}`);
          return false;
      }

      return true;
    } catch (error) {
      console.error('Event validation error:', error);
      return false;
    }
  }

  /**
   * Create audit log entry
   */
  async logAction(action: string, personId: string, branchId: string, details: any) {
    try {
      const { error } = await this.supabase
        .from('master_data_audit_log')
        .insert([
          {
            table_name: 'stock_opname',
            record_id: details.record_id,
            action: 'UPDATE',
            changed_by: personId,
            new_values: details,
            record_identifier: details.name || 'stock_opname',
          },
        ]);

      if (error) {
        console.warn('Failed to log action:', error);
      }
    } catch (error) {
      console.error('Audit log error:', error);
    }
  }

  /**
   * Verify person can access branch inventory
   */
  async canAccessBranchInventory(personId: string, branchId: string): Promise<boolean> {
    try {
      const contextValid = await this.validateRequestContext(personId, branchId);
      return contextValid;
    } catch (error) {
      console.error('Permission check error:', error);
      return false;
    }
  }

  /**
   * Get current inventory state for branch
   * Aggregates from stock opname records
   */
  async getCurrentInventory(branchId: string) {
    try {
      // Get latest opname results
      const { data, error } = await this.supabase
        .from('stock_opname')
        .select('items')
        .eq('branch_id', branchId)
        .order('opname_date', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) {
        console.warn('No inventory data found');
        return [];
      }

      return data.items || [];
    } catch (error) {
      console.error('Failed to get current inventory:', error);
      return [];
    }
  }
}

/**
 * Singleton instance
 */
let serviceInstance: StokisIntegrationService | null = null;

export function getStokisIntegrationService(supabaseClient: SupabaseClient): StokisIntegrationService {
  if (!serviceInstance) {
    serviceInstance = new StokisIntegrationService(supabaseClient);
  }
  return serviceInstance;
}
