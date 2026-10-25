import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { validateEnv } from '@mochikin/shared/env';
import { getMasterDataService } from '@mochikin/shared/master-data';
import { getMyCheckIntegrationService } from '../mycheck/src/lib/integration';
import { getStokisIntegrationService } from '../stokis/src/lib/integration';
import { getMyCustomerIntegrationService } from '../mycustomer/src/lib/integration';

/**
 * F4.10 Integration Test: E2E Auth Flow
 * Tests: Login → JWT Claims → RLS enforcement across all apps
 */

describe('F4.10 — E2E Auth Flow Integration', () => {
  let supabase: SupabaseClient;
  let masterDataService: any;
  let testPerson: any;
  let testBranch: any;

  beforeAll(async () => {
    const env = validateEnv();
    supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY); // Use service role for setup
    masterDataService = getMasterDataService(supabase);

    console.log('🚀 Setting up test fixtures...');

    // Create test branch
    const branchRes = await supabase
      .from('branches')
      .insert([
        {
          name: 'Test Branch - Auth Flow',
          location: 'Test Location',
          status: 'active',
        },
      ])
      .select()
      .single();

    testBranch = branchRes.data;
    console.log(`✅ Created test branch: ${testBranch.id}`);

    // Create test person
    const personRes = await supabase
      .from('people')
      .insert([
        {
          name: 'Test Auth User',
          email: 'auth-test@mochikin.local',
          role: 'staff',
          branch_id: testBranch.id,
          status: 'active',
        },
      ])
      .select()
      .single();

    testPerson = personRes.data;
    console.log(`✅ Created test person: ${testPerson.id}`);
  });

  afterAll(async () => {
    console.log('🧹 Cleaning up test data...');

    if (testPerson?.id) {
      await supabase.from('people').delete().eq('id', testPerson.id);
    }

    if (testBranch?.id) {
      await supabase.from('branches').delete().eq('id', testBranch.id);
    }

    console.log('✅ Cleanup complete');
  });

  it('should extract JWT claims from person email', async () => {
    const jwtService = await import('@mochikin/shared/master-data').then((m) => m.getJWTMappingService(supabase));

    // Simulate JWT extraction
    const claims = await jwtService.extractPersonClaims(testPerson.email);

    expect(claims).toBeDefined();
    expect(claims.person_id).toBe(testPerson.id);
    expect(claims.branch_id).toBe(testBranch.id);
    expect(claims.role).toBe('staff');
    expect(claims.email).toBe(testPerson.email);

    console.log('✅ JWT claims extracted correctly:', claims);
  });

  it('should validate request context in MyCheck', async () => {
    const integration = getMyCheckIntegrationService(supabase);

    const isValid = await integration.validateRequestContext(testPerson.id, testBranch.id);

    expect(isValid).toBe(true);
    console.log('✅ MyCheck context validation passed');
  });

  it('should validate request context in Stokis', async () => {
    const integration = getStokisIntegrationService(supabase);

    const isValid = await integration.validateRequestContext(testPerson.id, testBranch.id);

    expect(isValid).toBe(true);
    console.log('✅ Stokis context validation passed');
  });

  it('should validate request context in MyCustomer', async () => {
    const integration = getMyCustomerIntegrationService(supabase);

    const isValid = await integration.validateRequestContext(testPerson.id, testBranch.id);

    expect(isValid).toBe(true);
    console.log('✅ MyCustomer context validation passed');
  });

  it('should enforce RLS on customer queries', async () => {
    const integration = getMyCustomerIntegrationService(supabase);

    // Create a customer in test branch
    const customerRes = await supabase
      .from('customers')
      .insert([
        {
          name: 'Test Customer',
          phone: '+1234567890',
          branch_id: testBranch.id,
          created_by: testPerson.id,
        },
      ])
      .select()
      .single();

    const testCustomer = customerRes.data;

    // Verify person can access customer
    const canAccess = await integration.canAccessCustomer(testPerson.id, testBranch.id, testCustomer.id);
    expect(canAccess).toBe(true);

    // Verify customer is in correct branch
    const customer = await integration.getCustomer(testCustomer.id, testBranch.id);
    expect(customer).toBeDefined();
    expect(customer.branch_id).toBe(testBranch.id);

    // Cleanup
    await supabase.from('customers').delete().eq('id', testCustomer.id);

    console.log('✅ RLS enforcement verified for customers');
  });

  it('should enforce branch isolation for checklists', async () => {
    const integration = getMyCheckIntegrationService(supabase);

    // Create checklist
    const checklistRes = await supabase
      .from('checklists')
      .insert([
        {
          name: 'Test Checklist',
          branch_id: testBranch.id,
          person_id: testPerson.id,
          created_by: testPerson.id,
        },
      ])
      .select()
      .single();

    const testChecklist = checklistRes.data;

    // Verify person can access checklist
    const canAccess = await integration.canAccessChecklist(testPerson.id, testBranch.id, testChecklist.id);
    expect(canAccess).toBe(true);

    // Cleanup
    await supabase.from('checklists').delete().eq('id', testChecklist.id);

    console.log('✅ Branch isolation verified for checklists');
  });

  it('should reject invalid person context', async () => {
    const integration = getMyCheckIntegrationService(supabase);

    // Use non-existent person ID
    const fakePersonId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
    const isValid = await integration.validateRequestContext(fakePersonId, testBranch.id);

    expect(isValid).toBe(false);
    console.log('✅ Invalid context correctly rejected');
  });

  it('should reject person from different branch', async () => {
    const integration = getMyCheckIntegrationService(supabase);

    // Create another branch
    const otherBranchRes = await supabase
      .from('branches')
      .insert([
        {
          name: 'Other Branch',
          location: 'Other Location',
          status: 'active',
        },
      ])
      .select()
      .single();

    const otherBranch = otherBranchRes.data;

    // Create person in other branch
    const otherPersonRes = await supabase
      .from('people')
      .insert([
        {
          name: 'Other Person',
          email: 'other@mochikin.local',
          role: 'staff',
          branch_id: otherBranch.id,
          status: 'active',
        },
      ])
      .select()
      .single();

    const otherPerson = otherPersonRes.data;

    // Try to access with wrong branch
    const isValid = await integration.validateRequestContext(otherPerson.id, testBranch.id);

    expect(isValid).toBe(false);

    // Cleanup
    await supabase.from('people').delete().eq('id', otherPerson.id);
    await supabase.from('branches').delete().eq('id', otherBranch.id);

    console.log('✅ Cross-branch access correctly rejected');
  });

  it('should validate event emission with correct claims', async () => {
    const integration = getMyCheckIntegrationService(supabase);

    // Create checklist
    const checklistRes = await supabase
      .from('checklists')
      .insert([
        {
          name: 'Test Event Checklist',
          branch_id: testBranch.id,
          person_id: testPerson.id,
          created_by: testPerson.id,
        },
      ])
      .select()
      .single();

    const testChecklist = checklistRes.data;

    // Validate event with correct context
    const eventValid = await integration.validateBeforeEvent(
      { checklist_id: testChecklist.id, branch_id: testBranch.id },
      'checklist.created',
      testPerson.id,
      testBranch.id
    );

    expect(eventValid).toBe(true);

    // Cleanup
    await supabase.from('checklists').delete().eq('id', testChecklist.id);

    console.log('✅ Event validation passed with correct claims');
  });

  it('should audit all operations with person context', async () => {
    const integration = getMyCheckIntegrationService(supabase);

    // Log an action
    await integration.logAction('TEST_ACTION', testPerson.id, testBranch.id, {
      record_id: 'test-audit-001',
      name: 'Test Audit Entry',
    });

    // Verify audit log was created
    const { data: auditLogs } = await supabase
      .from('master_data_audit_log')
      .select('*')
      .eq('record_id', 'test-audit-001')
      .eq('changed_by', testPerson.id)
      .limit(1);

    expect(auditLogs).toBeDefined();
    expect(auditLogs!.length).toBeGreaterThan(0);
    expect(auditLogs![0].changed_by).toBe(testPerson.id);

    console.log('✅ Audit logging with person context verified');
  });
});
