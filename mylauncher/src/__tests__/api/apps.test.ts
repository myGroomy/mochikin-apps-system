import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { GET } from '@/app/api/apps/route';
import { NextRequest } from 'next/server';

// Mock environment
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_ANON_KEY = 'test-key';
process.env.GITHUB_TOKEN = 'test-github-token';

// Mock dependencies
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn((table) => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [
          {
            id: '1',
            name: 'mycheck',
            title: 'MyCheck — Checklist & QC',
            version: '1.5.0',
            category: 'operational',
            description: 'Checklist and quality control',
            icon_url: 'https://example.com/mycheck.png',
            url: 'http://localhost:3002',
            repository: 'https://github.com/mochikin/mycheck',
            status: 'active',
          },
          {
            id: '2',
            name: 'stokis',
            title: 'Stokis — Stock Opname',
            version: '1.0.0',
            category: 'operational',
            description: 'Stock opname management',
            icon_url: 'https://example.com/stokis.png',
            url: 'http://localhost:3003',
            repository: 'https://github.com/mochikin/stokis',
            status: 'active',
          },
        ],
        error: null,
      }),
    })),
  })),
}));

vi.mock('@mochikin/shared/manifest', () => ({
  fetchManifestFromGitHubUrl: vi.fn().mockResolvedValue(null),
  enrichAppWithManifest: vi.fn((app) => app),
}));

vi.mock('@/lib/registry-cache', () => ({
  getRegistryCache: vi.fn(() => ({
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(true),
    invalidate: vi.fn().mockResolvedValue(true),
  })),
}));

describe('GET /api/apps', () => {
  it('should return list of active apps', async () => {
    const req = new NextRequest(new URL('http://localhost:3000/api/apps'));
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.apps).toBeInstanceOf(Array);
    expect(data.count).toBe(2);
    expect(data.apps[0].name).toBe('mycheck');
    expect(data.apps[1].name).toBe('stokis');
  });

  it('should have correct response headers', async () => {
    const req = new NextRequest(new URL('http://localhost:3000/api/apps'));
    const response = await GET(req);

    expect(response.headers.get('Cache-Control')).toContain('public, max-age=300');
    expect(response.headers.get('X-Cache')).toBe('MISS');
  });

  it('should include required app fields', async () => {
    const req = new NextRequest(new URL('http://localhost:3000/api/apps'));
    const response = await GET(req);
    const data = await response.json();

    const app = data.apps[0];
    expect(app).toHaveProperty('id');
    expect(app).toHaveProperty('name');
    expect(app).toHaveProperty('title');
    expect(app).toHaveProperty('version');
    expect(app).toHaveProperty('category');
    expect(app).toHaveProperty('description');
    expect(app).toHaveProperty('icon_url');
    expect(app).toHaveProperty('url');
    expect(app).toHaveProperty('status');
  });

  it('should support category filtering', async () => {
    const req = new NextRequest(
      new URL('http://localhost:3000/api/apps?category=operational')
    );
    const response = await GET(req);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.apps.every((app: Record<string, unknown>) => app.category === 'operational')).toBe(
      true
    );
  });

  it('should support cache bypass', async () => {
    const req = new NextRequest(
      new URL('http://localhost:3000/api/apps?cache=false')
    );
    const response = await GET(req);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.cached).toBe(false);
  });

  it('should include repository field for enrichment', async () => {
    const req = new NextRequest(new URL('http://localhost:3000/api/apps'));
    const response = await GET(req);
    const data = await response.json();

    const app = data.apps[0];
    expect(app).toHaveProperty('repository');
    expect(app.repository).toMatch(/^https:\/\/github\.com\//);
  });
});
