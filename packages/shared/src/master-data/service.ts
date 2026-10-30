import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  PeopleSchema,
  CreatePeopleSchema,
  UpdatePeopleSchema,
  BranchSchema,
  CreateBranchSchema,
  UpdateBranchSchema,
  ItemSchema,
  CreateItemSchema,
  UpdateItemSchema,
  CustomerSchema,
  CreateCustomerSchema,
  UpdateCustomerSchema,
  type People,
  type CreatePeople,
  type UpdatePeople,
  type Branch,
  type CreateBranch,
  type UpdateBranch,
  type Item,
  type CreateItem,
  type UpdateItem,
  type Customer,
  type CreateCustomer,
  type UpdateCustomer,
} from '../schemas/master-data';

export type {
  People,
  CreatePeople,
  UpdatePeople,
  Branch,
  CreateBranch,
  UpdateBranch,
  Item,
  CreateItem,
  UpdateItem,
  Customer,
  CreateCustomer,
  UpdateCustomer,
} from '../schemas/master-data';

/**
 * Master Data Service Layer
 * Provides CRUD operations with RLS enforcement via Supabase JWT auth
 */

export class MasterDataService {
  private supabase: SupabaseClient;

  constructor(supabaseClient: SupabaseClient) {
    this.supabase = supabaseClient;
  }

  // ============================================================================
  // PEOPLE OPERATIONS
  // ============================================================================

  async getPeople(filters?: { branch_id?: string; role?: string; status?: string }) {
    let query = this.supabase.from('people').select('*');

    if (filters?.branch_id) {
      query = query.eq('branch_id', filters.branch_id);
    }
    if (filters?.role) {
      query = query.eq('role', filters.role);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  async getPersonById(id: string) {
    const { data, error } = await this.supabase
      .from('people')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  async createPerson(input: CreatePeople, userId: string) {
    const validated = CreatePeopleSchema.parse(input);

    const { data, error } = await this.supabase
      .from('people')
      .insert([
        {
          ...validated,
          created_by: userId,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return PeopleSchema.parse(data);
  }

  async updatePerson(id: string, input: UpdatePeople, userId: string) {
    const validated = UpdatePeopleSchema.parse(input);

    const { data, error } = await this.supabase
      .from('people')
      .update({
        ...validated,
        updated_by: userId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return PeopleSchema.parse(data);
  }

  async deletePerson(id: string) {
    const { error } = await this.supabase
      .from('people')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // ============================================================================
  // BRANCHES OPERATIONS
  // ============================================================================

  async getBranches(filters?: { status?: string; city?: string }) {
    let query = this.supabase.from('branches').select('*');

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.city) {
      query = query.eq('city', filters.city);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  async getBranchById(id: string) {
    const { data, error } = await this.supabase
      .from('branches')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  async createBranch(input: CreateBranch, userId: string) {
    const validated = CreateBranchSchema.parse(input);

    const { data, error } = await this.supabase
      .from('branches')
      .insert([
        {
          ...validated,
          created_by: userId,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return BranchSchema.parse(data);
  }

  async updateBranch(id: string, input: UpdateBranch, userId: string) {
    const validated = UpdateBranchSchema.parse(input);

    const { data, error } = await this.supabase
      .from('branches')
      .update({
        ...validated,
        updated_by: userId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return BranchSchema.parse(data);
  }

  // ============================================================================
  // ITEMS OPERATIONS
  // ============================================================================

  async getItems(filters?: { category_id?: string; is_active?: boolean }) {
    let query = this.supabase.from('items').select('*');

    if (filters?.category_id) {
      query = query.eq('category_id', filters.category_id);
    }
    if (filters?.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  async getItemBySku(sku: string) {
    const { data, error } = await this.supabase
      .from('items')
      .select('*')
      .eq('sku', sku)
      .single();

    if (error) throw error;
    return data;
  }

  async getItemById(id: string) {
    const { data, error } = await this.supabase
      .from('items')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  async createItem(input: CreateItem, userId: string) {
    const validated = CreateItemSchema.parse(input);

    const { data, error } = await this.supabase
      .from('items')
      .insert([
        {
          ...validated,
          created_by: userId,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return ItemSchema.parse(data);
  }

  async updateItem(id: string, input: UpdateItem, userId: string) {
    const validated = UpdateItemSchema.parse(input);

    const { data, error } = await this.supabase
      .from('items')
      .update({
        ...validated,
        updated_by: userId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return ItemSchema.parse(data);
  }

  // ============================================================================
  // CUSTOMERS OPERATIONS
  // ============================================================================

  async getCustomers(branchId?: string, filters?: { status?: string; segment?: string }) {
    let query = this.supabase.from('customers').select('*');

    if (branchId) {
      query = query.eq('branch_id', branchId);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.segment) {
      query = query.eq('segment', filters.segment);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  async getCustomerById(id: string) {
    const { data, error } = await this.supabase
      .from('customers')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  async createCustomer(input: CreateCustomer, userId: string) {
    const validated = CreateCustomerSchema.parse(input);

    const { data, error } = await this.supabase
      .from('customers')
      .insert([
        {
          ...validated,
          created_by: userId,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return CustomerSchema.parse(data);
  }

  async updateCustomer(id: string, input: UpdateCustomer, userId: string) {
    const validated = UpdateCustomerSchema.parse(input);

    const { data, error } = await this.supabase
      .from('customers')
      .update({
        ...validated,
        updated_by: userId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return CustomerSchema.parse(data);
  }

  // ============================================================================
  // AUDIT LOG QUERIES
  // ============================================================================

  async getRecordHistory(tableName: string, recordId: string) {
    const { data, error } = await this.supabase
      .from('master_data_audit_log')
      .select('*')
      .eq('table_name', tableName)
      .eq('record_id', recordId)
      .order('changed_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  async getRecentChanges(hours = 24) {
    const { data, error } = await this.supabase
      .from('master_data_audit_log')
      .select('*')
      .gt('changed_at', new Date(Date.now() - hours * 3600000).toISOString())
      .order('changed_at', { ascending: false });

    if (error) throw error;
    return data;
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let serviceInstance: MasterDataService | null = null;

export function getMasterDataService(supabaseClient: SupabaseClient): MasterDataService {
  if (!serviceInstance) {
    serviceInstance = new MasterDataService(supabaseClient);
  }
  return serviceInstance;
}
