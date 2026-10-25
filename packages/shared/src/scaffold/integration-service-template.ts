/**
 * F5.4 Integration Service Template
 * Boilerplate for [AppName]IntegrationService in new apps
 */

export const INTEGRATION_SERVICE_TEMPLATE = `import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { MasterDataService, getMasterDataService } from '@mochikin/shared/master-data';

/**
 * [AppName] Integration Layer
 * Handles person_id mapping, branch isolation, and master data validation
 */

export class [AppName]IntegrationService {
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
        console.warn(\`Person not found: \${personId}\`);
        return false;
      }

      if (person.branch_id !== branchId) {
        console.warn(\`Branch mismatch: person \${personId} not in branch \${branchId}\`);
        return false;
      }

      if (person.status !== 'active') {
        console.warn(\`Person inactive: \${personId}\`);
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
   * Validate resource creation:
   * - Person exists and is in correct branch
   * - Branch exists
   */
  async validateCreation(
    personId: string,
    branchId: string,
    resourceData: any
  ): Promise<{ valid: boolean; error?: string }> {
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

      // TODO: Add app-specific field validation
      // Example:
      // if (!resourceData.requiredField) {
      //   return { valid: false, error: 'Required field missing' };
      // }

      return { valid: true };
    } catch (error) {
      console.error('Creation validation error:', error);
      return { valid: false, error: 'Validation failed' };
    }
  }

  /**
   * Enrich resource record with person/branch context
   */
  enrichRecord(record: any, personId: string, branchId: string) {
    return {
      ...record,
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
  async validateBeforeEvent(
    eventData: any,
    eventType: string,
    personId: string,
    branchId: string
  ): Promise<boolean> {
    try {
      // Validate person/branch
      const contextValid = await this.validateRequestContext(personId, branchId);
      if (!contextValid) return false;

      // TODO: Add event-specific validation
      // Example:
      // switch (eventType) {
      //   case 'resource.created':
      //     if (!eventData.resource_id || !eventData.branch_id) {
      //       console.warn('Missing required fields for event');
      //       return false;
      //     }
      //     break;
      // }

      return true;
    } catch (error) {
      console.error('Event validation error:', error);
      return false;
    }
  }

  /**
   * Create audit log entry for action
   */
  async logAction(action: string, personId: string, branchId: string, details: any) {
    try {
      const { error } = await this.supabase
        .from('master_data_audit_log')
        .insert([
          {
            table_name: '[resource_table]', // TODO: Update table name
            record_id: details.record_id,
            action: 'UPDATE',
            changed_by: personId,
            new_values: details,
            record_identifier: details.name || '[resource]',
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
   * Verify person can access resource
   */
  async canAccessResource(personId: string, branchId: string, resourceId: string): Promise<boolean> {
    try {
      // TODO: Implement resource access check
      // Example:
      // const resource = await this.supabase
      //   .from('[resource_table]')
      //   .select('id')
      //   .eq('id', resourceId)
      //   .eq('branch_id', branchId)
      //   .single();
      //
      // return !!resource.data;

      const contextValid = await this.validateRequestContext(personId, branchId);
      return contextValid;
    } catch (error) {
      console.error('Permission check error:', error);
      return false;
    }
  }
}

/**
 * Singleton instance
 */
let serviceInstance: [AppName]IntegrationService | null = null;

export function get[AppName]IntegrationService(supabaseClient: SupabaseClient): [AppName]IntegrationService {
  if (!serviceInstance) {
    serviceInstance = new [AppName]IntegrationService(supabaseClient);
  }
  return serviceInstance;
}
`;

export default INTEGRATION_SERVICE_TEMPLATE;
