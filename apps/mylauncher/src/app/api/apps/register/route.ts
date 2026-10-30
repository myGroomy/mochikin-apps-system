import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateEnvFor } from '@mochikin/shared/env';
import { getRegistryCache } from '@/lib/registry-cache';
import { z } from 'zod';

const RegisterAppSchema = z.object({
  name: z.string().min(1),
  title: z.string().min(1),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  category: z.enum(['core', 'operational', 'analytical']),
  description: z.string().optional(),
  icon_url: z.string().url().optional(),
  url: z.string().url(),
  repository: z.string().url().optional(),
  depends: z.array(z.string()).default([]),
  provides: z.array(z.string()).default([]),
  status: z.enum(['active', 'inactive', 'beta']).default('active'),
});

/**
 * POST /api/apps
 * Register a new app in the registry
 * Admin only
 */
export async function POST(request: NextRequest) {
  try {
    // Check admin role
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get JWT from Authorization header
    const token = authHeader.replace('Bearer ', '');
    const env = validateEnvFor('mylauncher');
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);

    // Verify token and extract claims
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Check admin role (would need to be stored in custom claims)
    // For now, we'll use a simple check based on user metadata
    const isAdmin = user.user_metadata?.role === 'role_admin';
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Admin role required' },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = RegisterAppSchema.parse(body);

    // Insert into apps table
    const { data: newApp, error: insertError } = await supabase
      .from('apps')
      .insert([
        {
          ...validatedData,
          created_by: user.id,
          updated_by: user.id,
        },
      ])
      .select()
      .single();

    if (insertError) {
      console.error('❌ Failed to register app:', insertError);
      return NextResponse.json(
        { error: insertError.message || 'Failed to register app' },
        { status: 400 }
      );
    }

    // Invalidate cache for all cache keys
    const cache = getRegistryCache();
    await cache.invalidate('apps');
    await cache.invalidate('apps:enriched');
    // Also invalidate category-specific caches
    const categories = ['core', 'operational', 'analytical'];
    for (const cat of categories) {
      await cache.invalidate(`apps:${cat}`);
      await cache.invalidate(`apps:${cat}:enriched`);
    }

    console.log(`✅ Registered app "${newApp.name}" and invalidated cache`);

    return NextResponse.json(
      {
        success: true,
        app: newApp,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('❌ API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
