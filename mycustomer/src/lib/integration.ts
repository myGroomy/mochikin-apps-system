import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { MasterDataService, getMasterDataService } from '@mochikin/shared/master-data';

/**
 * MyCustomer Integration Layer
 * Handles person_id mapping, branch-scoped customers, and RLS enforcement
 */

export class MyCustomerIntegrationService {
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
   * Get branch customers via RLS
   * Only returns customers in the person's branch
   */
  async getBranchCustomers(branchId: string) {
    try {
      // RLS will automatically filter by branch_id
      const customers = await this.masterDataService.getCustomers({ branch_id: branchId });
      return customers || [];
    } catch (error) {
      console.error('Failed to get branch customers:', error);
      return [];
    }
  }

  /**
   * Get single customer (with RLS verification)
   */
  async getCustomer(customerId: string, branchId: string) {
    try {
      // Query with branch isolation
      const { data, error } = await this.supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .eq('branch_id', branchId)
        .single();

      if (error || !data) {
        console.warn(`Customer not found: ${customerId}`);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Failed to get customer:', error);
      return null;
    }
  }

  /**
   * Validate customer creation
   */
  async validateCustomerCreation(
    personId: string,
    branchId: string,
    customerData: any
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
      if (!customerData.name || !customerData.phone) {
        return { valid: false, error: 'Name and phone required' };
      }

      // Validate phone format (basic)
      if (!this.validatePhoneFormat(customerData.phone)) {
        return { valid: false, error: 'Invalid phone format' };
      }

      // Check for duplicate phone in branch
      const existing = await this.supabase
        .from('customers')
        .select('id')
        .eq('branch_id', branchId)
        .eq('phone', customerData.phone)
        .limit(1);

      if (existing.data && existing.data.length > 0) {
        return { valid: false, error: 'Phone already registered in this branch' };
      }

      return { valid: true };
    } catch (error) {
      console.error('Customer validation error:', error);
      return { valid: false, error: 'Validation failed' };
    }
  }

  /**
   * Enrich customer record with branch/person context
   */
  enrichCustomerRecord(customerRecord: any, personId: string, branchId: string) {
    return {
      ...customerRecord,
      branch_id: branchId,
      created_by: personId,
      updated_by: personId,
      created_at: new Date().toISOString(),
    };
  }

  /**
   * Validate transaction creation
   * Ensures customer is in correct branch
   */
  async validateTransactionCreation(
    personId: string,
    branchId: string,
    customerId: string,
    transactionData: any
  ): Promise<{ valid: boolean; error?: string }> {
    try {
      // Validate context
      const contextValid = await this.validateRequestContext(personId, branchId);
      if (!contextValid) {
        return { valid: false, error: 'Invalid person or branch' };
      }

      // Verify customer is in correct branch
      const customer = await this.getCustomer(customerId, branchId);
      if (!customer) {
        return { valid: false, error: 'Customer not found in branch' };
      }

      // Validate required fields
      if (!transactionData.amount || !transactionData.type) {
        return { valid: false, error: 'Amount and type required' };
      }

      if (transactionData.amount <= 0) {
        return { valid: false, error: 'Amount must be positive' };
      }

      return { valid: true };
    } catch (error) {
      console.error('Transaction validation error:', error);
      return { valid: false, error: 'Validation failed' };
    }
  }

  /**
   * Enrich transaction record
   */
  enrichTransactionRecord(txRecord: any, personId: string, customerId: string, branchId: string) {
    return {
      ...txRecord,
      customer_id: customerId,
      branch_id: branchId,
      person_id: personId,
      recorded_by: personId,
      recorded_at: new Date().toISOString(),
    };
  }

  /**
   * Validate before emitting event
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
        case 'customer.created':
        case 'customer.updated':
          if (!eventData.customer_id || !eventData.branch_id) {
            console.warn('Missing required fields for customer event');
            return false;
          }
          break;

        case 'transaction.recorded':
          if (!eventData.transaction_id || !eventData.customer_id || !eventData.person_id) {
            console.warn('Missing required fields for transaction event');
            return false;
          }
          // Verify person_id matches
          if (eventData.person_id !== personId) {
            console.warn('Person mismatch in transaction event');
            return false;
          }
          // Verify customer is in branch
          const customer = await this.getCustomer(eventData.customer_id, branchId);
          if (!customer) {
            console.warn(`Customer not found in branch: ${eventData.customer_id}`);
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
            table_name: 'customers',
            record_id: details.record_id,
            action: 'UPDATE',
            changed_by: personId,
            new_values: details,
            record_identifier: details.name || 'customer',
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
   * Verify person can access customer
   */
  async canAccessCustomer(personId: string, branchId: string, customerId: string): Promise<boolean> {
    try {
      const customer = await this.getCustomer(customerId, branchId);
      return !!customer;
    } catch (error) {
      console.error('Permission check error:', error);
      return false;
    }
  }

  /**
   * Get customer transaction history (RLS enforced)
   */
  async getCustomerTransactionHistory(customerId: string, branchId: string, limit: number = 50) {
    try {
      // Verify customer exists in branch
      const customer = await this.getCustomer(customerId, branchId);
      if (!customer) {
        console.warn(`Customer not found: ${customerId}`);
        return [];
      }

      // Get transactions
      const { data, error } = await this.supabase
        .from('customer_transactions')
        .select('*')
        .eq('customer_id', customerId)
        .eq('branch_id', branchId)
        .order('recorded_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Failed to fetch transactions:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Failed to get transaction history:', error);
      return [];
    }
  }

  /**
   * Validate phone format
   */
  private validatePhoneFormat(phone: string): boolean {
    // Basic validation: 10-15 digits, can contain +, -, spaces
    const phoneRegex = /^[\d\s\-+]{10,15}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  }
}

/**
 * Singleton instance
 */
let serviceInstance: MyCustomerIntegrationService | null = null;

export function getMyCustomerIntegrationService(supabaseClient: SupabaseClient): MyCustomerIntegrationService {
  if (!serviceInstance) {
    serviceInstance = new MyCustomerIntegrationService(supabaseClient);
  }
  return serviceInstance;
}
