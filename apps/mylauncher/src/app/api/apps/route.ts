import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateEnvFor } from '@mochikin/shared/env';
import {
  fetchManifestFromGitHubUrl,
  enrichAppWithManifest,
} from '@mochikin/shared/manifest';
import { getRegistryCache } from '@/lib/registry-cache';

/**
 * GET /api/apps
 * List all active registered apps with optional GitHub manifest enrichment
 * Public endpoint (no auth required, only lists active apps)
 * Cached in Redis for 1 hour
 * 
 * Query params:
 *   - enrich=true: Fetch and merge app.manifest.json from GitHub repos (requires GITHUB_TOKEN)
 *   - category: filter by category (core, operational, analytical)
 *   - cache=false: bypass cache and force refresh
 */
export async function GET(request: NextRequest) {
  try {
    const env = validateEnvFor('mylauncher');
    const searchParams = request.nextUrl.searchParams;
    const enrichParam = searchParams.get('enrich') === 'true';
    const category = searchParams.get('category');
    const bypassCache = searchParams.get('cache') === 'false';
    const githubToken = process.env.GITHUB_TOKEN;

    // Build cache key
    const cacheKey = `apps${category ? `:${category}` : ''}${enrichParam ? ':enriched' : ''}`;

    // Try to get from cache (unless bypassed)
    if (!bypassCache) {
      const cache = getRegistryCache();
      const cached = await cache.get(cacheKey);
      if (cached) {
        return NextResponse.json(
          {
            success: true,
            apps: cached,
            count: (cached as unknown[]).length,
            cached: true,
          },
          {
            headers: {
              'Cache-Control': 'public, max-age=300',
              'X-Cache': 'HIT',
            },
          }
        );
      }
    }

    // Fetch from database
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);

    let query = supabase
      .from('apps')
      .select('*')
      .eq('status', 'active')
      .order('name', { ascending: true });

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ Failed to fetch apps:', error);
      return NextResponse.json(
        { error: 'Failed to fetch apps' },
        { status: 500 }
      );
    }

    let apps = (data || []).map((app) => ({
      id: app.id,
      name: app.name,
      title: app.title,
      version: app.version,
      category: app.category,
      description: app.description,
      icon_url: app.icon_url,
      url: app.url,
      repository: app.repository,
      status: app.status,
    }));

    // Optionally enrich with GitHub manifests
    if (enrichParam && githubToken) {
      apps = await Promise.all(
        apps.map(async (app) => {
          if (!app.repository) {
            return app;
          }

          try {
            const manifest = await fetchManifestFromGitHubUrl(
              app.repository,
              githubToken
            );
            if (manifest) {
              return enrichAppWithManifest(app, manifest);
            }
          } catch (err) {
            console.warn(`⚠️  Failed to enrich app ${app.name}:`, err);
          }

          return app;
        })
      );
    }

    // Cache the result
    if (!bypassCache) {
      const cache = getRegistryCache();
      await cache.set(apps, cacheKey);
    }

    return NextResponse.json(
      {
        success: true,
        apps,
        count: apps.length,
        cached: false,
      },
      {
        headers: {
          'Cache-Control': 'public, max-age=300',
          'X-Cache': 'MISS',
        },
      }
    );
  } catch (error) {
    console.error('❌ API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
