import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateEnvFor } from '@mochikin/shared/env';
import { getMyCustomerIntegrationService } from '@/lib/integration';
import { z } from 'zod';

/**
 * GET /api/customers
 * List customers for authenticated user's branch
 * RLS ensures only branch customers are visible
 */
export async function GET(request: NextRequest) {
  try {
    const env = validateEnvFor('mycustomer');
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
    const integration = getMyCustomerIntegrationService(supabase);

    // Get JWT claims
    const personId = request.headers.get('X-Person-Id');
    const branchId = request.headers.get('X-Branch-Id');

    if (!personId || !branchId) {
      return NextResponse.json({ error: 'Missing context' }, { status: 400 });
    }

    // Validate context
    const isValid = await integration.validateRequestContext(personId, branchId);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid context' }, { status: 403 });
    }

    // Get customers with branch isolation
    const customers = await integration.getBranchCustomers(branchId);

    return NextResponse.json({
      success: true,
      data: customers,
      count: customers.length,
      context: {
        person_id: personId,
        branch_id: branchId,
      },
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/customers
 * Create a new customer in branch
 */
export async function POST(request: NextRequest) {
  try {
    const env = validateEnvFor('mycustomer');
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
    const integration = getMyCustomerIntegrationService(supabase);

    // Get JWT claims
    const personId = request.headers.get('X-Person-Id');
    const branchId = request.headers.get('X-Branch-Id');

    if (!personId || !branchId) {
      return NextResponse.json({ error: 'Missing context' }, { status: 400 });
    }

    // Parse request body
    const body = await request.json();
    const schema = z.object({
      name: z.string().min(1),
      phone: z.string().min(10),
      email: z.string().email().optional(),
      address: z.string().optional(),
      notes: z.string().optional(),
    });

    let customerData;
    try {
      customerData = schema.parse(body);
    } catch (e) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    // Validate customer creation
    const validation = await integration.validateCustomerCreation(personId, branchId, customerData);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Enrich with context
    const enrichedData = integration.enrichCustomerRecord(customerData, personId, branchId);

    // Insert customer
    const { data: newCustomer, error: insertError } = await supabase
      .from('customers')
      .insert([enrichedData])
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      return NextResponse.json({ error: 'Failed to create customer' }, { status: 500 });
    }

    // Validate before event
    const eventValid = await integration.validateBeforeEvent(
      { customer_id: newCustomer.id, branch_id: branchId },
      'customer.created',
      personId,
      branchId
    );

    if (eventValid) {
      console.log('📤 Event: customer.created', { customer_id: newCustomer.id, branch_id: branchId });
    }

    // Log action
    await integration.logAction('CREATE', personId, branchId, { record_id: newCustomer.id, name: newCustomer.name });

    return NextResponse.json(
      {
        success: true,
        data: newCustomer,
        context: { person_id: personId, branch_id: branchId },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
