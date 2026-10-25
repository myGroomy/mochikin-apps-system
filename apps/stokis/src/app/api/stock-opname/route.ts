import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateEnv } from '@mochikin/shared/env';
import { getStokisIntegrationService } from '@/lib/integration';
import { z } from 'zod';

/**
 * POST /api/stock-opname
 * Submit stock opname (inventory count)
 * Validates person_id before emitting inventory.adjustment events
 */
export async function POST(request: NextRequest) {
  try {
    const env = validateEnv();
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
    const integration = getStokisIntegrationService(supabase);

    // Get JWT claims
    const personId = request.headers.get('X-Person-Id');
    const branchId = request.headers.get('X-Branch-Id');

    if (!personId || !branchId) {
      return NextResponse.json({ error: 'Missing context' }, { status: 400 });
    }

    // Parse request body
    const body = await request.json();
    const schema = z.object({
      date: z.string().datetime(),
      items: z.array(
        z.object({
          item_id: z.string().uuid(),
          quantity_counted: z.number().min(0),
          notes: z.string().optional(),
        })
      ),
    });

    let opnameData;
    try {
      opnameData = schema.parse(body);
    } catch (e) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    // Validate opname creation
    const validation = await integration.validateStockOpnameCreation(personId, branchId, opnameData);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Enrich record
    const enrichedData = integration.enrichStockOpnameRecord(opnameData, personId, branchId);

    // Insert opname
    const { data: newOpname, error: insertError } = await supabase
      .from('stock_opname')
      .insert([enrichedData])
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      return NextResponse.json({ error: 'Failed to create opname' }, { status: 500 });
    }

    // Validate and emit events for each item
    const emittedEvents = [];
    for (const item of opnameData.items) {
      const eventValid = await integration.validateBeforeEvent(
        {
          opname_id: newOpname.id,
          item_id: item.item_id,
          quantity_change: item.quantity_counted,
          person_id: personId,
          branch_id: branchId,
        },
        'inventory.adjustment',
        personId,
        branchId
      );

      if (eventValid) {
        console.log('📤 Event: inventory.adjustment', {
          opname_id: newOpname.id,
          item_id: item.item_id,
          person_id: personId,
        });
        emittedEvents.push(item.item_id);
      } else {
        console.warn(`Failed validation for item ${item.item_id}`);
      }
    }

    // Log action
    await integration.logAction('CREATE', personId, branchId, { record_id: newOpname.id, date: opnameData.date });

    return NextResponse.json(
      {
        success: true,
        data: newOpname,
        emitted_events: emittedEvents.length,
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
 * GET /api/stock-opname
 * List recent opnates for branch
 */
export async function GET(request: NextRequest) {
  try {
    const env = validateEnv();
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
    const integration = getStokisIntegrationService(supabase);

    const personId = request.headers.get('X-Person-Id');
    const branchId = request.headers.get('X-Branch-Id');

    if (!personId || !branchId) {
      return NextResponse.json({ error: 'Missing context' }, { status: 400 });
    }

    // Validate access
    const hasAccess = await integration.canAccessBranchInventory(personId, branchId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Query opnates
    const { data, error } = await supabase
      .from('stock_opname')
      .select('*')
      .eq('branch_id', branchId)
      .order('opname_date', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Query error:', error);
      return NextResponse.json({ error: 'Failed to fetch opnates' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data,
      count: data?.length || 0,
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
