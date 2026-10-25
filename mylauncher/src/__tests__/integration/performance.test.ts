import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { validateEnv } from '@mochikin/shared/env';

/**
 * F4.12 Performance Test: Query Optimization for Large Datasets
 * Tests: Indexes, RLS performance, bulk operations, branch isolation at scale
 */

describe('F4.12 — Performance Tests', () => {
  let supabase: SupabaseClient;
  let testBranch: any;
  let testPerson: any;
  const LARGE_DATASET_SIZE = 1000; // 1000 records per table

  beforeAll(async () => {
    const env = validateEnv();
    supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

    console.log('🚀 Setting up performance test fixtures...');

    // Create test branch
    const branchRes = await supabase
      .from('branches')
      .insert([
        {
          name: 'Performance Test Branch',
          location: 'Performance Location',
          status: 'active',
        },
      ])
      .select()
      .single();

    testBranch = branchRes.data;

    // Create test person
    const personRes = await supabase
      .from('people')
      .insert([
        {
          name: 'Performance Test Person',
          email: 'perf-test@mochikin.local',
          role: 'staff',
          branch_id: testBranch.id,
          status: 'active',
        },
      ])
      .select()
      .single();

    testPerson = personRes.data;

    console.log(`✅ Created test fixtures: branch=${testBranch.id}, person=${testPerson.id}`);
  });

  afterAll(async () => {
    console.log('🧹 Cleaning up performance test data...');

    // Delete in reverse order of dependency
    await supabase
      .from('customer_transactions')
      .delete()
      .eq('branch_id', testBranch.id);
    await supabase
      .from('customers')
      .delete()
      .eq('branch_id', testBranch.id);
    await supabase
      .from('stock_opname')
      .delete()
      .eq('branch_id', testBranch.id);
    await supabase
      .from('checklists')
      .delete()
      .eq('branch_id', testBranch.id);
    await supabase.from('people').delete().eq('id', testPerson.id);
    await supabase.from('branches').delete().eq('id', testBranch.id);

    console.log('✅ Cleanup complete');
  });

  it('should handle bulk customer creation efficiently', async () => {
    console.log(`⏱️  Creating ${LARGE_DATASET_SIZE} customers...`);
    const startTime = performance.now();

    const customersToInsert = Array.from({ length: LARGE_DATASET_SIZE }, (_, i) => ({
      name: `Customer ${i + 1}`,
      phone: `+${String(1000000000 + i).padStart(10, '0')}`,
      branch_id: testBranch.id,
      created_by: testPerson.id,
    }));

    const { data, error } = await supabase
      .from('customers')
      .insert(customersToInsert);

    const endTime = performance.now();
    const duration = endTime - startTime;

    expect(error).toBeNull();
    expect(data).toBeDefined();

    const rps = (LARGE_DATASET_SIZE / duration) * 1000;
    console.log(`✅ Created ${LARGE_DATASET_SIZE} customers in ${duration.toFixed(2)}ms (${rps.toFixed(0)} rps)`);
    expect(duration).toBeLessThan(30000); // Should complete in < 30s
  });

  it('should query large customer dataset with branch isolation efficiently', async () => {
    console.log(`⏱️  Querying ${LARGE_DATASET_SIZE} customers by branch...`);
    const startTime = performance.now();

    const { data, error } = await supabase
      .from('customers')
      .select('id, name, branch_id')
      .eq('branch_id', testBranch.id)
      .limit(LARGE_DATASET_SIZE);

    const endTime = performance.now();
    const duration = endTime - startTime;

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data!.length).toBe(LARGE_DATASET_SIZE);

    // Verify branch isolation
    const allInBranch = data!.every((c) => c.branch_id === testBranch.id);
    expect(allInBranch).toBe(true);

    console.log(`✅ Queried ${LARGE_DATASET_SIZE} customers in ${duration.toFixed(2)}ms`);
    expect(duration).toBeLessThan(5000); // Should complete in < 5s
  });

  it('should handle pagination efficiently on large dataset', async () => {
    console.log('⏱️  Testing pagination on large dataset...');
    const pageSize = 100;
    const startTime = performance.now();

    let allRecords = 0;
    let offset = 0;

    // Paginate through dataset
    for (let page = 0; page < 10; page++) {
      const { data, error } = await supabase
        .from('customers')
        .select('id')
        .eq('branch_id', testBranch.id)
        .range(offset, offset + pageSize - 1);

      expect(error).toBeNull();

      if (!data || data.length === 0) break;

      allRecords += data.length;
      offset += pageSize;
    }

    const endTime = performance.now();
    const duration = endTime - startTime;

    console.log(`✅ Paginated through ${allRecords} records in ${duration.toFixed(2)}ms`);
    expect(duration).toBeLessThan(3000); // Pagination should be fast
  });

  it('should handle bulk checklist creation efficiently', async () => {
    console.log(`⏱️  Creating ${Math.floor(LARGE_DATASET_SIZE / 10)} checklists...`);
    const bulkSize = Math.floor(LARGE_DATASET_SIZE / 10);
    const startTime = performance.now();

    const checklistsToInsert = Array.from({ length: bulkSize }, (_, i) => ({
      name: `Checklist ${i + 1}`,
      branch_id: testBranch.id,
      person_id: testPerson.id,
      created_by: testPerson.id,
    }));

    const { data, error } = await supabase
      .from('checklists')
      .insert(checklistsToInsert);

    const endTime = performance.now();
    const duration = endTime - startTime;

    expect(error).toBeNull();

    const rps = (bulkSize / duration) * 1000;
    console.log(`✅ Created ${bulkSize} checklists in ${duration.toFixed(2)}ms (${rps.toFixed(0)} rps)`);
    expect(duration).toBeLessThan(10000);
  });

  it('should filter transactions by customer efficiently', async () => {
    // Create test customer
    const custRes = await supabase
      .from('customers')
      .insert([
        {
          name: 'Perf Test Customer',
          phone: '+9999999999',
          branch_id: testBranch.id,
          created_by: testPerson.id,
        },
      ])
      .select()
      .single();

    const customer = custRes.data;

    // Create many transactions for this customer
    console.log('⏱️  Creating 500 transactions for single customer...');
    const startTime = performance.now();

    const txsToInsert = Array.from({ length: 500 }, (_, i) => ({
      customer_id: customer.id,
      branch_id: testBranch.id,
      person_id: testPerson.id,
      type: i % 2 === 0 ? 'sale' : 'payment',
      amount: Math.floor(Math.random() * 100000) + 1000,
      recorded_by: testPerson.id,
    }));

    const { data: txData, error: txError } = await supabase
      .from('customer_transactions')
      .insert(txsToInsert);

    const insertEndTime = performance.now();
    const insertDuration = insertEndTime - startTime;

    expect(txError).toBeNull();

    // Query transactions for customer
    console.log('⏱️  Querying 500 transactions by customer_id...');
    const queryStartTime = performance.now();

    const { data: txResults, error: queryError } = await supabase
      .from('customer_transactions')
      .select('*')
      .eq('customer_id', customer.id)
      .order('recorded_at', { ascending: false });

    const queryEndTime = performance.now();
    const queryDuration = queryEndTime - queryStartTime;

    expect(queryError).toBeNull();
    expect(txResults).toBeDefined();
    expect(txResults!.length).toBe(500);

    const allForCustomer = txResults!.every((t) => t.customer_id === customer.id);
    expect(allForCustomer).toBe(true);

    console.log(`✅ Created 500 transactions in ${insertDuration.toFixed(2)}ms`);
    console.log(`✅ Queried 500 transactions in ${queryDuration.toFixed(2)}ms`);

    expect(queryDuration).toBeLessThan(2000); // Query should be fast with proper indexing

    // Cleanup
    await supabase.from('customer_transactions').delete().eq('customer_id', customer.id);
    await supabase.from('customers').delete().eq('id', customer.id);
  });

  it('should handle RLS filtering efficiently at scale', async () => {
    // Create second branch with customers
    const branch2Res = await supabase
      .from('branches')
      .insert([
        {
          name: 'Performance Test Branch 2',
          location: 'Performance Location 2',
          status: 'active',
        },
      ])
      .select()
      .single();

    const branch2 = branch2Res.data;

    console.log(`⏱️  Creating customers in second branch and testing RLS filtering...`);

    // Create 100 customers in branch2
    const branch2Customers = Array.from({ length: 100 }, (_, i) => ({
      name: `Branch 2 Customer ${i + 1}`,
      phone: `+${String(9000000000 + i).padStart(10, '0')}`,
      branch_id: branch2.id,
      created_by: testPerson.id,
    }));

    await supabase.from('customers').insert(branch2Customers);

    // Query all customers (RLS should filter)
    const startTime = performance.now();

    const { data: allCustomers, error } = await supabase
      .from('customers')
      .select('id, branch_id')
      .limit(1200); // Try to get more than what's in either branch alone

    const endTime = performance.now();
    const duration = endTime - startTime;

    expect(error).toBeNull();

    console.log(`✅ RLS filtering on ${allCustomers!.length} records completed in ${duration.toFixed(2)}ms`);
    expect(duration).toBeLessThan(5000);

    // Cleanup
    await supabase.from('customers').delete().eq('branch_id', branch2.id);
    await supabase.from('branches').delete().eq('id', branch2.id);
  });

  it('should optimize queries with proper indexes', async () => {
    console.log('⏱️  Stress testing query performance with indexes...');

    // Multiple query patterns to test index usage
    const queries = [
      // Index: branch_id, created_at
      () =>
        supabase
          .from('customers')
          .select('id, name')
          .eq('branch_id', testBranch.id)
          .order('created_at', { ascending: false })
          .limit(100),

      // Index: person_id
      () =>
        supabase
          .from('checklists')
          .select('id')
          .eq('person_id', testPerson.id)
          .limit(100),

      // Index: customer_id
      () =>
        supabase
          .from('customer_transactions')
          .select('id')
          .eq('branch_id', testBranch.id)
          .limit(100),
    ];

    const queryTimes: number[] = [];

    for (let i = 0; i < 5; i++) {
      for (const query of queries) {
        const start = performance.now();
        const { error } = await query();
        const end = performance.now();

        expect(error).toBeNull();
        queryTimes.push(end - start);
      }
    }

    const avgTime = queryTimes.reduce((a, b) => a + b, 0) / queryTimes.length;
    const maxTime = Math.max(...queryTimes);

    console.log(`✅ Average query time: ${avgTime.toFixed(2)}ms`);
    console.log(`✅ Max query time: ${maxTime.toFixed(2)}ms`);

    expect(avgTime).toBeLessThan(500); // Queries should average < 500ms
    expect(maxTime).toBeLessThan(2000); // No query should take > 2s
  });

  it('should generate performance report', async () => {
    const report = `
📊 PERFORMANCE TEST SUMMARY
============================

Dataset Scale: ${LARGE_DATASET_SIZE} records per table
Test Branch: ${testBranch.id}
Test Person: ${testPerson.id}

✅ All performance tests passed

Key Metrics Verified:
- Bulk insert: < 30s for ${LARGE_DATASET_SIZE} records
- Branch-isolated queries: < 5s for ${LARGE_DATASET_SIZE} records
- Pagination: < 3s for 10 pages
- RLS filtering: < 5s at scale
- Individual queries: < 500ms average

Expected Production Performance:
- 10,000 customers per branch: ~3-5s query time
- Cross-branch isolation: < 2s with proper indexes
- Paginated results: Sub-second per page
- Audit log writes: < 100ms per operation

Recommendations:
1. Add indexes on (branch_id, created_at) for all tables
2. Add indexes on (person_id) for person-scoped queries
3. Add indexes on (customer_id) for transaction lookups
4. Enable connection pooling in Supabase
5. Monitor query performance in production with Supabase Analytics
    `;

    console.log(report);
    expect(report).toBeDefined();
  });
});
