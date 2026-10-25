/**
 * F5.5 API Route Template
 * Boilerplate for /api/[resource]/route.ts with RLS + event validation
 */

export const API_ROUTE_GET_TEMPLATE = `import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateEnv } from '@mochikin/shared/env';
import { get[AppName]IntegrationService } from '@/lib/integration';

/**
 * GET /api/[resources]
 * List [resources] for authenticated user's branch
 * RLS ensures only branch [resources] are visible
 */
export async function GET(request: NextRequest) {
  try {
    const env = validateEnv();
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
    const integration = get[AppName]IntegrationService(supabase);

    // Get JWT claims from Authorization header
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

    // Query [resources] with branch isolation
    const { data, error } = await supabase
      .from('[resources_table]')
      .select('*')
      .eq('branch_id', branchId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Query error:', error);
      return NextResponse.json({ error: 'Failed to fetch [resources]' }, { status: 500 });
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
`;

export const API_ROUTE_POST_TEMPLATE = `import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateEnv } from '@mochikin/shared/env';
import { get[AppName]IntegrationService } from '@/lib/integration';
import { z } from 'zod';

/**
 * POST /api/[resources]
 * Create a new [resource]
 * Validates person/branch and enforces branch isolation
 */
export async function POST(request: NextRequest) {
  try {
    const env = validateEnv();
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
    const integration = get[AppName]IntegrationService(supabase);

    // Get JWT claims
    const personId = request.headers.get('X-Person-Id');
    const branchId = request.headers.get('X-Branch-Id');

    if (!personId || !branchId) {
      return NextResponse.json({ error: 'Missing context' }, { status: 400 });
    }

    // Parse request body
    const body = await request.json();

    // TODO: Define schema for your resource
    const schema = z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      // Add other required fields
    });

    let resourceData;
    try {
      resourceData = schema.parse(body);
    } catch (e) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    // Validate creation
    const validation = await integration.validateCreation(personId, branchId, resourceData);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Enrich with context
    const enrichedData = integration.enrichRecord(resourceData, personId, branchId);

    // Insert [resource]
    const { data: newResource, error: insertError } = await supabase
      .from('[resources_table]')
      .insert([enrichedData])
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      return NextResponse.json({ error: 'Failed to create [resource]' }, { status: 500 });
    }

    // Validate before event
    const eventValid = await integration.validateBeforeEvent(
      { resource_id: newResource.id, branch_id: branchId },
      '[resource].created',
      personId,
      branchId
    );

    if (eventValid) {
      // TODO: Emit event to event bus
      console.log('📤 Event: [resource].created', { resource_id: newResource.id });
    }

    // Log action
    await integration.logAction('CREATE', personId, branchId, {
      record_id: newResource.id,
      name: newResource.name,
    });

    return NextResponse.json(
      {
        success: true,
        data: newResource,
        context: { person_id: personId, branch_id: branchId },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
`;

export const API_ROUTE_TEMPLATES = {
  GET: API_ROUTE_GET_TEMPLATE,
  POST: API_ROUTE_POST_TEMPLATE,
};

export default API_ROUTE_TEMPLATES;
