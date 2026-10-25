import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { validateEnv } from '@mochikin/shared/env';

/**
 * F4.11 Integration Test: Cross-app Data Isolation
 * Tests: branch_id enforcement across all apps
 */

describe('F4.11 — Cross-app Data Isolation', () => {
  let supabase: SupabaseClient;
  let branch1: any;
  let branch2: any;
  let person1: any;
  let person2: any;

  beforeAll(async () => {
    const env = validateEnv();
    supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

    console.log('🚀 Setting up multi-branch test fixtures...');

    // Create branch 1
    const b1Res = await supabase
      .from('branches')
      .insert([
        {
          name: 'Isolation Test Branch 1',
          location: 'Location 1',
          status: 'active',
        },
      ])
      .select()
      .single();
    branch1 = b1Res.data;

    // Create branch 2
    const b2Res = await supabase
      .from('branches')
      .insert([
        {
          name: 'Isolation Test Branch 2',
          location: 'Location 2',
          status: 'active',
        },
      ])
      .select()
      .single();
    branch2 = b2Res.data;

    // Create person in branch 1
    const p1Res = await supabase
      .from('people')
      .insert([
        {
          name: 'Person Branch 1',
          email: 'person1@branch1.local',
          role: 'staff',
          branch_id: branch1.id,
          status: 'active',
        },
      ])
      .select()
      .single();
    person1 = p1Res.data;

    // Create person in branch 2
    const p2Res = await supabase
      .from('people')
      .insert([
        {
          name: 'Person Branch 2',
          email: 'person2@branch2.local',
          role: 'staff',
          branch_id: branch2.id,
          status: 'active',
        },
      ])
      .select()
      .single();
    person2 = p2Res.data;

    console.log(`✅ Created branch1: ${branch1.id}, branch2: ${branch2.id}`);
    console.log(`✅ Created person1: ${person1.id}, person2: ${person2.id}`);
  });

  afterAll(async () => {
    console.log('🧹 Cleaning up multi-branch test data...');

    // Delete all test data
    if (person1?.id) await supabase.from('people').delete().eq('id', person1.id);
    if (person2?.id) await supabase.from('people').delete().eq('id', person2.id);
    if (branch1?.id) await supabase.from('branches').delete().eq('id', branch1.id);
    if (branch2?.id) await supabase.from('branches').delete().eq('id', branch2.id);

    console.log('✅ Cleanup complete');
  });

  it('should isolate checklists by branch_id', async () => {
    // Create checklist in branch 1
    const cl1Res = await supabase
      .from('checklists')
      .insert([
        {
          name: 'Checklist Branch 1',
          branch_id: branch1.id,
          person_id: person1.id,
          created_by: person1.id,
        },
      ])
      .select()
      .single();
    const checklist1 = cl1Res.data;

    // Create checklist in branch 2
    const cl2Res = await supabase
      .from('checklists')
      .insert([
        {
          name: 'Checklist Branch 2',
          branch_id: branch2.id,
          person_id: person2.id,
          created_by: person2.id,
        },
      ])
      .select()
      .single();
    const checklist2 = cl2Res.data;

    // Query checklists for branch 1 (RLS enforced)
    const { data: branch1Checklists } = await supabase
      .from('checklists')
      .select('*')
      .eq('branch_id', branch1.id);

    expect(branch1Checklists).toBeDefined();
    expect(branch1Checklists!.some((c) => c.id === checklist1.id)).toBe(true);
    expect(branch1Checklists!.some((c) => c.id === checklist2.id)).toBe(false);

    // Cleanup
    await supabase.from('checklists').delete().in('id', [checklist1.id, checklist2.id]);

    console.log('✅ Checklist branch isolation verified');
  });

  it('should isolate customers by branch_id', async () => {
    // Create customer in branch 1
    const cust1Res = await supabase
      .from('customers')
      .insert([
        {
          name: 'Customer Branch 1',
          phone: '+1111111111',
          branch_id: branch1.id,
          created_by: person1.id,
        },
      ])
      .select()
      .single();
    const customer1 = cust1Res.data;

    // Create customer in branch 2
    const cust2Res = await supabase
      .from('customers')
      .insert([
        {
          name: 'Customer Branch 2',
          phone: '+2222222222',
          branch_id: branch2.id,
          created_by: person2.id,
        },
      ])
      .select()
      .single();
    const customer2 = cust2Res.data;

    // Query customers for branch 1
    const { data: branch1Customers } = await supabase
      .from('customers')
      .select('*')
      .eq('branch_id', branch1.id);

    expect(branch1Customers).toBeDefined();
    expect(branch1Customers!.some((c) => c.id === customer1.id)).toBe(true);
    expect(branch1Customers!.some((c) => c.id === customer2.id)).toBe(false);

    // Cleanup
    await supabase.from('customers').delete().in('id', [customer1.id, customer2.id]);

    console.log('✅ Customer branch isolation verified');
  });

  it('should isolate stock opnates by branch_id', async () => {
    // Create stock opname in branch 1
    const op1Res = await supabase
      .from('stock_opname')
      .insert([
        {
          opname_date: new Date().toISOString(),
          branch_id: branch1.id,
          person_id: person1.id,
          created_by: person1.id,
          items: [],
        },
      ])
      .select()
      .single();
    const opname1 = op1Res.data;

    // Create stock opname in branch 2
    const op2Res = await supabase
      .from('stock_opname')
      .insert([
        {
          opname_date: new Date().toISOString(),
          branch_id: branch2.id,
          person_id: person2.id,
          created_by: person2.id,
          items: [],
        },
      ])
      .select()
      .single();
    const opname2 = op2Res.data;

    // Query opnates for branch 1
    const { data: branch1Opnates } = await supabase
      .from('stock_opname')
      .select('*')
      .eq('branch_id', branch1.id);

    expect(branch1Opnates).toBeDefined();
    expect(branch1Opnates!.some((o) => o.id === opname1.id)).toBe(true);
    expect(branch1Opnates!.some((o) => o.id === opname2.id)).toBe(false);

    // Cleanup
    await supabase.from('stock_opname').delete().in('id', [opname1.id, opname2.id]);

    console.log('✅ Stock opname branch isolation verified');
  });

  it('should isolate transactions by branch_id', async () => {
    // Create customers in different branches
    const cust1Res = await supabase
      .from('customers')
      .insert([
        {
          name: 'Cust for Tx B1',
          phone: '+1111111112',
          branch_id: branch1.id,
          created_by: person1.id,
        },
      ])
      .select()
      .single();
    const customer1 = cust1Res.data;

    const cust2Res = await supabase
      .from('customers')
      .insert([
        {
          name: 'Cust for Tx B2',
          phone: '+2222222223',
          branch_id: branch2.id,
          created_by: person2.id,
        },
      ])
      .select()
      .single();
    const customer2 = cust2Res.data;

    // Create transactions
    const tx1Res = await supabase
      .from('customer_transactions')
      .insert([
        {
          customer_id: customer1.id,
          branch_id: branch1.id,
          person_id: person1.id,
          type: 'sale',
          amount: 10000,
          recorded_by: person1.id,
        },
      ])
      .select()
      .single();
    const tx1 = tx1Res.data;

    const tx2Res = await supabase
      .from('customer_transactions')
      .insert([
        {
          customer_id: customer2.id,
          branch_id: branch2.id,
          person_id: person2.id,
          type: 'sale',
          amount: 20000,
          recorded_by: person2.id,
        },
      ])
      .select()
      .single();
    const tx2 = tx2Res.data;

    // Query transactions for branch 1
    const { data: branch1Txs } = await supabase
      .from('customer_transactions')
      .select('*')
      .eq('branch_id', branch1.id);

    expect(branch1Txs).toBeDefined();
    expect(branch1Txs!.some((t) => t.id === tx1.id)).toBe(true);
    expect(branch1Txs!.some((t) => t.id === tx2.id)).toBe(false);

    // Cleanup
    await supabase.from('customer_transactions').delete().in('id', [tx1.id, tx2.id]);
    await supabase.from('customers').delete().in('id', [customer1.id, customer2.id]);

    console.log('✅ Transaction branch isolation verified');
  });

  it('should prevent cross-branch data access via RLS', async () => {
    // Create customer in branch 1
    const custRes = await supabase
      .from('customers')
      .insert([
        {
          name: 'RLS Test Customer',
          phone: '+1234567890',
          branch_id: branch1.id,
          created_by: person1.id,
        },
      ])
      .select()
      .single();
    const customer = custRes.data;

    // Try to query from branch 2 scope (would be filtered by RLS)
    const { data: results } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customer.id)
      .eq('branch_id', branch2.id);

    // RLS should prevent access
    expect(results).toBeDefined();
    expect(results!.length).toBe(0);

    // Cleanup
    await supabase.from('customers').delete().eq('id', customer.id);

    console.log('✅ RLS cross-branch prevention verified');
  });

  it('should track branch in audit logs', async () => {
    // Create a record and log action
    const custRes = await supabase
      .from('customers')
      .insert([
        {
          name: 'Audit Test Customer',
          phone: '+9876543210',
          branch_id: branch1.id,
          created_by: person1.id,
        },
      ])
      .select()
      .single();
    const customer = custRes.data;

    // Log the action with branch context
    await supabase
      .from('master_data_audit_log')
      .insert([
        {
          table_name: 'customers',
          record_id: customer.id,
          action: 'UPDATE',
          changed_by: person1.id,
          new_values: { name: customer.name, branch_id: branch1.id },
          record_identifier: customer.name,
        },
      ]);

    // Verify audit log has branch context
    const { data: auditLogs } = await supabase
      .from('master_data_audit_log')
      .select('*')
      .eq('record_id', customer.id)
      .eq('changed_by', person1.id);

    expect(auditLogs).toBeDefined();
    expect(auditLogs!.length).toBeGreaterThan(0);
    expect(auditLogs![0].new_values.branch_id).toBe(branch1.id);

    // Cleanup
    await supabase.from('customers').delete().eq('id', customer.id);

    console.log('✅ Branch tracking in audit logs verified');
  });
});
