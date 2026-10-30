import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateEnvFor } from '@mochikin/shared/env';
import { getMyCustomerIntegrationService } from '@/lib/integration';
import { z } from 'zod';

/**
 * POST /api/customers/[id]/transactions
 * Record a transaction for a customer
 * Validates person_id and branch isolation before event emission
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const env = validateEnvFor('mycustomer');
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
    const integration = getMyCustomerIntegrationService(supabase);

    const { id: customerId } = await params;
    const personId = request.headers.get('X-Person-Id');
    const branchId = request.headers.get('X-Branch-Id');

    if (!personId || !branchId) {
      return NextResponse.json({ error: 'Missing context' }, { status: 400 });
    }

    // Parse request body
    const body = await request.json();
    const schema = z.object({
      type: z.enum(['sale', 'return', 'payment', 'credit']),
      amount: z.number().positive(),
      description: z.string().optional(),
      reference_no: z.string().optional(),
    });

    let transactionData;
    try {
      transactionData = schema.parse(body);
    } catch (e) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    // Validate transaction creation (includes branch isolation check)
    const validation = await integration.validateTransactionCreation(
      personId,
      branchId,
      customerId,
      transactionData
    );
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Enrich record
    const enrichedData = integration.enrichTransactionRecord(transactionData, personId, customerId, branchId);

    // Insert transaction
    const { data: newTransaction, error: insertError } = await supabase
      .from('customer_transactions')
      .insert([enrichedData])
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      return NextResponse.json({ error: 'Failed to record transaction' }, { status: 500 });
    }

    // Validate before event (ensures person_id/branch_id/customer in branch)
    const eventValid = await integration.validateBeforeEvent(
      {
        transaction_id: newTransaction.id,
        customer_id: customerId,
        person_id: personId,
        branch_id: branchId,
        amount: transactionData.amount,
        type: transactionData.type,
      },
      'transaction.recorded',
      personId,
      branchId
    );

    if (eventValid) {
      console.log('📤 Event: transaction.recorded', {
        transaction_id: newTransaction.id,
        customer_id: customerId,
        person_id: personId,
      });
    } else {
      console.warn('Transaction event validation failed');
    }

    // Log action
    await integration.logAction('CREATE', personId, branchId, {
      record_id: newTransaction.id,
      name: `${transactionData.type}: ${transactionData.amount}`,
    });

    return NextResponse.json(
      {
        success: true,
        data: newTransaction,
        event_valid: eventValid,
        context: { person_id: personId, branch_id: branchId },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/customers/[id]/transactions
 * Get transaction history for a customer
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const env = validateEnvFor('mycustomer');
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
    const integration = getMyCustomerIntegrationService(supabase);

    const { id: customerId } = await params;
    const personId = request.headers.get('X-Person-Id');
    const branchId = request.headers.get('X-Branch-Id');

    if (!personId || !branchId) {
      return NextResponse.json({ error: 'Missing context' }, { status: 400 });
    }

    // Validate access to customer
    const hasAccess = await integration.canAccessCustomer(personId, branchId, customerId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get transaction history
    const transactions = await integration.getCustomerTransactionHistory(customerId, branchId);

    return NextResponse.json({
      success: true,
      data: transactions,
      count: transactions.length,
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
