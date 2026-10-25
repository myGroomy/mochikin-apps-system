import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { MasterDataService, getMasterDataService } from '@mochikin/shared/master-data';

/**
 * MyCheck Integration Layer
 * Handles person_id mapping, branch isolation, and master data validation
 */

export class MyCheckIntegrationService {
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
      // Get person from master data
      const person = await this.masterDataService.getPersonById(personId);
      if (!person) {
        console.warn(`Person not found: ${personId}`);
        return false;
      }

      // Verify person is in correct branch
      if (person.branch_id !== branchId) {
        console.warn(`Branch mismatch: person ${personId} not in branch ${branchId}`);
        return false;
      }

      // Verify person is active
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
   * Get person details for context
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
   * Enforce branch isolation for queries
   * Returns filter to add to queries
   */
  getBranchIsolationFilter(branchId: string): { branch_id: string } {
    return { branch_id: branchId };
  }

  /**
   * Validate checklist creation:
   * - Person exists and is in correct branch
   * - Branch exists
   */
  async validateChecklistCreation(personId: string, branchId: string, checklistData: any): Promise<{ valid: boolean; error?: string }> {
    try {
      // Validate request context
      const contextValid = await this.validateRequestContext(personId, branchId);
      if (!contextValid) {
        return { valid: false, error: 'Invalid person or branch' };
      }

      // Validate branch exists
      const branch = await this.masterDataService.getBranchById(branchId);
      if (!branch) {
        return { valid: false, error: 'Branch not found' };
      }

      // Additional validations
      if (!checklistData.name) {
        return { valid: false, error: 'Checklist name required' };
      }

      return { valid: true };
    } catch (error) {
      console.error('Checklist validation error:', error);
      return { valid: false, error: 'Validation failed' };
    }
  }

  /**
   * Enrich checklist record with person/branch context
   */
  enrichChecklistRecord(checklistRecord: any, personId: string, branchId: string) {
    return {
      ...checklistRecord,
      person_id: personId,
      branch_id: branchId,
      created_by: personId,
      updated_by: personId,
    };
  }

  /**
   * Validate data before emitting event
   * Ensures all required master data references exist
   */
  async validateBeforeEvent(eventData: any, eventType: string, personId: string, branchId: string): Promise<boolean> {
    try {
      // Validate person/branch
      const contextValid = await this.validateRequestContext(personId, branchId);
      if (!contextValid) return false;

      // Event-specific validation
      switch (eventType) {
        case 'checklist.created':
        case 'checklist.updated':
          if (!eventData.checklist_id || !eventData.branch_id) {
            console.warn('Missing required fields for checklist event');
            return false;
          }
          break;

        case 'checklist.submitted':
          if (!eventData.checklist_id || !eventData.completed_at) {
            console.warn('Missing required fields for submission event');
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
   * Create audit log entry for MyCheck action
   */
  async logAction(action: string, personId: string, branchId: string, details: any) {
    try {
      const { error } = await this.supabase
        .from('master_data_audit_log')
        .insert([
          {
            table_name: 'checklist', // or applicable table
            record_id: details.record_id,
            action: 'UPDATE',
            changed_by: personId,
            new_values: details,
            record_identifier: details.name || 'checklist',
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
   * Get items available in branch
   * Used for checklist item selection
   */
  async getBranchItems(branchId: string) {
    try {
      // Get all active items (items are global, but can be filtered by branch preferences later)
      const items = await this.masterDataService.getItems({ is_active: true });

      return items || [];
    } catch (error) {
      console.error('Failed to get branch items:', error);
      return [];
    }
  }

  /**
   * Verify person has permission to access checklist
   */
  async canAccessChecklist(personId: string, branchId: string, checklistId: string): Promise<boolean> {
    try {
      // Verify person context
      const contextValid = await this.validateRequestContext(personId, branchId);
      if (!contextValid) return false;

      // In future, could add more granular permission checks
      // For now, person in branch can access all checklists in that branch
      return true;
    } catch (error) {
      console.error('Permission check error:', error);
      return false;
    }
  }
}

/**
 * Singleton instance
 */
let serviceInstance: MyCheckIntegrationService | null = null;

export function getMyCheckIntegrationService(supabaseClient: SupabaseClient): MyCheckIntegrationService {
  if (!serviceInstance) {
    serviceInstance = new MyCheckIntegrationService(supabaseClient);
  }
  return serviceInstance;
}
