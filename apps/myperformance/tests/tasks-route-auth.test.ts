import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { getSupabaseAdmin } = vi.hoisted(() => ({
  getSupabaseAdmin: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({ getSupabaseAdmin }));

import { GET } from '../src/app/api/tasks/route';

describe('GET /api/tasks', () => {
  beforeEach(() => {
    process.env.SESSION_SECRET = 'unit-test-session-secret-with-more-than-32-characters';
    delete process.env.LAUNCHER_SSO_SHARED_SECRET;
    getSupabaseAdmin.mockClear();
  });

  it('rejects requests without a valid custom session before querying Supabase', async () => {
    const response = await GET(new NextRequest('http://localhost/api/tasks'));

    expect(response.status).toBe(401);
    expect(getSupabaseAdmin).not.toHaveBeenCalled();
  });
});
