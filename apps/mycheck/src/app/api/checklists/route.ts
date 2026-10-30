import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateEnvFor } from '@mochikin/shared/env';
import { getMyCheckIntegrationService } from '@/lib/integration';
import { z } from 'zod';

/**
 * GET /api/checklists
 * List checklists for authenticated user's branch
 * RLS ensures only branch checklists are visible
 */
export async function GET(request: NextRequest) {
  try {
    const env = validateEnvFor('mycheck');
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
    const integration = getMyCheckIntegrationService(supabase);

    // Get JWT claims from Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Extract person_id and branch_id from JWT (in real app, would be decoded)
    // For now, assume they're passed in headers (normally from middleware)
    const personId = request.headers.get('X-Person-Id');
    const branchId = request.headers.get('X-Branch-Id');

    if (!personId || !branchId) {
      return NextResponse.json({ error: 'Missing person_id or branch_id' }, { status: 400 });
    }

    // Validate context
    const isValid = await integration.validateRequestContext(personId, branchId);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid context' }, { status: 403 });
    }

    // Query checklists with branch isolation
    const { data, error } = await supabase
      .from('checklists')
      .select('*')
      .eq('branch_id', branchId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Query error:', error);
      return NextResponse.json({ error: 'Failed to fetch checklists' }, { status: 500 });
    }

    // Log access
    await integration.logAction('LIST', personId, branchId, { record_id: 'bulk' });

    return NextResponse.json({
      success: true,
      data,
      count: data?.length || 0,
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
 * POST /api/checklists
 * Create a new checklist
 * Validates person/branch and enforces branch isolation
 */
export async function POST(request: NextRequest) {
  try {
    const env = validateEnvFor('mycheck');
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
    const integration = getMyCheckIntegrationService(supabase);

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
      description: z.string().optional(),
      template_id: z.string().uuid().optional(),
    });

    let checklistData;
    try {
      checklistData = schema.parse(body);
    } catch (e) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    // Validate checklist creation
    const validation = await integration.validateChecklistCreation(personId, branchId, checklistData);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Enrich with context
    const enrichedData = integration.enrichChecklistRecord(checklistData, personId, branchId);

    // Insert checklist
    const { data: newChecklist, error: insertError } = await supabase
      .from('checklists')
      .insert([enrichedData])
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      return NextResponse.json({ error: 'Failed to create checklist' }, { status: 500 });
    }

    // Validate before event
    const eventValid = await integration.validateBeforeEvent(
      { checklist_id: newChecklist.id, branch_id: branchId },
      'checklist.created',
      personId,
      branchId
    );

    if (eventValid) {
      // Emit event (would go to event bus in production)
      console.log('📤 Event: checklist.created', { checklist_id: newChecklist.id });
    }

    // Log action
    await integration.logAction('CREATE', personId, branchId, { record_id: newChecklist.id, name: newChecklist.name });

    return NextResponse.json(
      {
        success: true,
        data: newChecklist,
        context: { person_id: personId, branch_id: branchId },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
