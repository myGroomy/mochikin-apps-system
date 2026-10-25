/**
 * F5.6 Test Template
 * Boilerplate for integration + performance tests
 */

export const INTEGRATION_TEST_TEMPLATE = `import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { validateEnv } from '@mochikin/shared/env';
import { get[AppName]IntegrationService } from '../src/lib/integration';

/**
 * [AppName] Integration Tests
 * Tests context validation, RLS, and event validation
 */

describe('[AppName] Integration Tests', () => {
  let supabase: SupabaseClient;
  let integration: any;
  let testBranch: any;
  let testPerson: any;

  beforeAll(async () => {
    const env = validateEnv();
    supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
    integration = get[AppName]IntegrationService(supabase);

    console.log('🚀 Setting up test fixtures...');

    // Create test branch
    const branchRes = await supabase
      .from('branches')
      .insert([
        {
          name: 'Test Branch - [AppName]',
          location: 'Test Location',
          status: 'active',
        },
      ])
      .select()
      .single();

    testBranch = branchRes.data;
    console.log(\`✅ Created test branch: \${testBranch.id}\`);

    // Create test person
    const personRes = await supabase
      .from('people')
      .insert([
        {
          name: 'Test [AppName] User',
          email: '[app-name]-test@mochikin.local',
          role: 'staff',
          branch_id: testBranch.id,
          status: 'active',
        },
      ])
      .select()
      .single();

    testPerson = personRes.data;
    console.log(\`✅ Created test person: \${testPerson.id}\`);
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

  it('should validate request context', async () => {
    const isValid = await integration.validateRequestContext(testPerson.id, testBranch.id);
    expect(isValid).toBe(true);
    console.log('✅ Context validation passed');
  });

  it('should reject invalid person', async () => {
    const fakePersonId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
    const isValid = await integration.validateRequestContext(fakePersonId, testBranch.id);
    expect(isValid).toBe(false);
    console.log('✅ Invalid person correctly rejected');
  });

  it('should enforce branch isolation', async () => {
    // Create another branch
    const otherBranchRes = await supabase
      .from('branches')
      .insert([
        {
          name: 'Other Test Branch',
          location: 'Other Location',
          status: 'active',
        },
      ])
      .select()
      .single();

    const otherBranch = otherBranchRes.data;

    // Try to validate person in wrong branch
    const isValid = await integration.validateRequestContext(testPerson.id, otherBranch.id);
    expect(isValid).toBe(false);

    // Cleanup
    await supabase.from('branches').delete().eq('id', otherBranch.id);

    console.log('✅ Branch isolation verified');
  });

  it('should validate resource creation', async () => {
    const validation = await integration.validateCreation(
      testPerson.id,
      testBranch.id,
      { name: 'Test Resource' }
    );

    expect(validation.valid).toBe(true);
    console.log('✅ Resource creation validation passed');
  });

  it('should enrich record with context', () => {
    const record = { name: 'Test' };
    const enriched = integration.enrichRecord(record, testPerson.id, testBranch.id);

    expect(enriched.person_id).toBe(testPerson.id);
    expect(enriched.branch_id).toBe(testBranch.id);
    expect(enriched.created_by).toBe(testPerson.id);

    console.log('✅ Record enrichment verified');
  });

  it('should validate event before emission', async () => {
    const eventValid = await integration.validateBeforeEvent(
      { resource_id: 'test-123', branch_id: testBranch.id },
      '[resource].created',
      testPerson.id,
      testBranch.id
    );

    expect(eventValid).toBe(true);
    console.log('✅ Event validation passed');
  });
});
`;

export const PERFORMANCE_TEST_TEMPLATE = `import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { validateEnv } from '@mochikin/shared/env';
import { get[AppName]IntegrationService } from '../src/lib/integration';

/**
 * [AppName] Performance Tests
 * Tests query performance and bulk operations
 */

describe('[AppName] Performance Tests', () => {
  let supabase: SupabaseClient;
  let testBranch: any;
  const TEST_SIZE = 100;

  beforeAll(async () => {
    const env = validateEnv();
    supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

    console.log('🚀 Setting up performance test fixtures...');

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
    console.log(\`✅ Created test branch: \${testBranch.id}\`);
  });

  afterAll(async () => {
    console.log('🧹 Cleaning up performance test data...');

    await supabase
      .from('[resources_table]')
      .delete()
      .eq('branch_id', testBranch.id);

    if (testBranch?.id) {
      await supabase.from('branches').delete().eq('id', testBranch.id);
    }

    console.log('✅ Cleanup complete');
  });

  it('should handle bulk resource creation efficiently', async () => {
    console.log(\`⏱️  Creating \${TEST_SIZE} resources...\`);
    const startTime = performance.now();

    const resourcesToInsert = Array.from({ length: TEST_SIZE }, (_, i) => ({
      name: \`Resource \${i + 1}\`,
      branch_id: testBranch.id,
      created_by: 'test-user',
    }));

    const { data, error } = await supabase
      .from('[resources_table]')
      .insert(resourcesToInsert);

    const endTime = performance.now();
    const duration = endTime - startTime;

    expect(error).toBeNull();
    expect(data).toBeDefined();

    const rps = (TEST_SIZE / duration) * 1000;
    console.log(\`✅ Created \${TEST_SIZE} resources in \${duration.toFixed(2)}ms (\${rps.toFixed(0)} rps)\`);
    expect(duration).toBeLessThan(10000); // Should complete in < 10s
  });

  it('should query resources efficiently with branch isolation', async () => {
    console.log(\`⏱️  Querying \${TEST_SIZE} resources by branch...\`);
    const startTime = performance.now();

    const { data, error } = await supabase
      .from('[resources_table]')
      .select('*')
      .eq('branch_id', testBranch.id)
      .limit(TEST_SIZE);

    const endTime = performance.now();
    const duration = endTime - startTime;

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data!.length).toBe(TEST_SIZE);

    console.log(\`✅ Queried \${TEST_SIZE} resources in \${duration.toFixed(2)}ms\`);
    expect(duration).toBeLessThan(2000); // Should be fast with indexes
  });

  it('should handle pagination efficiently', async () => {
    console.log('⏱️  Testing pagination...');
    const pageSize = 25;
    const startTime = performance.now();

    let allRecords = 0;
    let offset = 0;

    for (let page = 0; page < 4; page++) {
      const { data } = await supabase
        .from('[resources_table]')
        .select('id')
        .eq('branch_id', testBranch.id)
        .range(offset, offset + pageSize - 1);

      if (!data || data.length === 0) break;
      allRecords += data.length;
      offset += pageSize;
    }

    const endTime = performance.now();
    const duration = endTime - startTime;

    console.log(\`✅ Paginated through \${allRecords} records in \${duration.toFixed(2)}ms\`);
    expect(duration).toBeLessThan(2000);
  });
});
`;

export const TEST_TEMPLATES = {
  integration: INTEGRATION_TEST_TEMPLATE,
  performance: PERFORMANCE_TEST_TEMPLATE,
};

export default TEST_TEMPLATES;
