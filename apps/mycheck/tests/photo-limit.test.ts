// tests/photo-limit.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';

import { installSessionStub, setSession, clearSession } from './helpers/mock-auth';
import { resetSupabaseInstance } from '../lib/supabase';

installSessionStub();

const BASE = 'http://localhost:3000';
const CAB1 = 'CAB1';
const BRANCH_UUID = '00000000-0000-4000-8000-000000000001';
const PERSON_UUID = '00000000-0000-4000-8000-000000000002';

function makeSnapshot(pointRef: string) {
  return JSON.stringify({
    v: 1,
    shift: { id: 'SD1', name: 'Shift Pagi', start_time: '07:00', end_time: '15:00', crosses_midnight: false },
    settings: { tolerance_default_minutes: 15, timezone: 'Asia/Jakarta' },
    categories: [
      {
        id: 'C1',
        name: 'Kebersihan',
        sort_order: 1,
        points: [
          {
            point_ref: pointRef,
            title: 'Lantai ruang tamu',
            instruction: null,
            input_type: 'foto',
            is_required: true,
          },
        ],
      },
    ],
  });
}

function createUploadRequest({
  shiftInstanceId,
  pointRef,
}: {
  shiftInstanceId: string;
  pointRef: string;
}): NextRequest {
  const formData = new FormData();
  const file = new File(['dummy-webp-binary-content'], 'bukti.webp', { type: 'image/webp' });
  formData.set('file', file);
  formData.set('ownerType', 'entry');
  formData.set('ownerId', pointRef);
  formData.set('shiftInstanceId', shiftInstanceId);

  return new NextRequest(`${BASE}/api/photos/upload`, {
    method: 'POST',
    body: formData,
    headers: {
      'X-Requested-With': 'fetch',
    },
  });
}

test('Batas 5 foto per shift: hanya foto uploaded dihitung dan batasnya per shift', async () => {
  setSession({
    username: 'dea',
    nama: 'Petugas Dea',
    role: 'petugas',
    cabangId: CAB1,
  });

  const origUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const origKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const origFetch = globalThis.fetch;

  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://mock-supabase.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-service-role-key';
  // Reset singleton agar env baru terbaca oleh getSupabase()
  resetSupabaseInstance();


  const photoCounts = new Map([
    ['entry|POINT-100|shift-A', 4],
  ]);
  let storageCallCount = 0;
  globalThis.fetch = (async (input: RequestInfo | URL, _init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url;
    const parsedUrl = new URL(url);
    if (parsedUrl.pathname.includes('/rest/v1/people')) {
      if (parsedUrl.searchParams.has('username')) {
        return new Response(JSON.stringify({
          id: PERSON_UUID, username: 'dea', name: 'Petugas Dea', role: 'petugas',
          status: 'active', pin_hash: null, must_change_pin: false, deleted_at: null,
        }), { status: 200 });
      }
      return new Response(JSON.stringify([{ id: PERSON_UUID }]), { status: 200 });
    }
    if (parsedUrl.pathname.includes('/rest/v1/branch_members')) {
      return new Response(JSON.stringify([{
        branches: { code: CAB1, status: 'active', deleted_at: null },
      }]), { status: 200 });
    }
    if (parsedUrl.pathname.includes('/rest/v1/branches')) {
      return new Response(JSON.stringify([{ id: BRANCH_UUID, code: CAB1, settings: { timezone: 'Asia/Jakarta' } }]), { status: 200 });
    }
    if (parsedUrl.pathname.includes('/rest/v1/mycheck_shift_instances')) {
      const shiftId = parsedUrl.searchParams.get('id')?.replace('eq.', '');
      return new Response(JSON.stringify([{
        id: shiftId, branch_id: BRANCH_UUID, shift_definition_id: '00000000-0000-4000-8000-000000000003',
        shift_date: '2026-10-16', status: 'open', pj_user_id: PERSON_UUID,
        template_snapshot: makeSnapshot('POINT-100'), opened_at: '2026-10-16T00:00:00.000Z',
      }]), { status: 200 });
    }
    if (parsedUrl.pathname.includes('/rest/v1/mycheck_photos') && _init?.method === 'HEAD') {
      const key = `${parsedUrl.searchParams.get('owner_type')?.replace('eq.', '')}|${parsedUrl.searchParams.get('owner_id')?.replace('eq.', '')}|${parsedUrl.searchParams.get('shift_instance_id')?.replace('eq.', '')}`;
      const count = photoCounts.get(key) ?? 0;
      return new Response(null, { status: 200, headers: { 'content-range': `0-${Math.max(count - 1, 0)}/${count}` } });
    }
    if (parsedUrl.pathname.includes('/rest/v1/mycheck_photos') && _init?.method === 'POST') {
      const body = JSON.parse(String(_init.body));
      const key = `${body.owner_type}|${body.owner_id}|${body.shift_instance_id}`;
      photoCounts.set(key, (photoCounts.get(key) ?? 0) + 1);
      return new Response(null, { status: 201 });
    }
    // Mock Supabase Storage upload: POST /storage/v1/object/...
    if (url.includes('/storage/v1/object/')) {
      storageCallCount++;
      return new Response(JSON.stringify({ Key: `mycheck-photos/mock-path-${storageCallCount}.webp` }), { status: 200 });
    }
    return new Response(JSON.stringify({}), { status: 404 });
  }) as typeof fetch;

  try {
    const { POST } = await import('../app/api/photos/upload/route');

    // 1. Upload ke-5 pada shift-A (karena yang ke-5 sebelumnya purged, ini jadi foto aktif ke-5) -> harus SUKSES
    const req1 = createUploadRequest({ shiftInstanceId: 'shift-A', pointRef: 'POINT-100' });
    const res1 = await POST(req1);
    assert.equal(res1.status, 200, 'Upload foto aktif ke-5 harus berhasil karena foto purged tidak dihitung');
    const body1 = (await res1.json()) as { status: string; photo_id: string };
    assert.equal(body1.status, 'uploaded');

    // 2. Upload ke-6 pada shift-A -> harus DITOLAK 400 karena sudah ada 5 foto aktif (uploaded)
    const req2 = createUploadRequest({ shiftInstanceId: 'shift-A', pointRef: 'POINT-100' });
    const res2 = await POST(req2);
    assert.equal(res2.status, 400, 'Upload foto ke-6 pada shift yang sama harus ditolak');
    const body2 = (await res2.json()) as { error: string };
    assert.ok(body2.error.includes('Maksimal 5 foto'));

    // 3. Upload pada shift-B untuk pointRef yang sama pada hari yang sama -> harus SUKSES (batas per shift!)
    const req3 = createUploadRequest({ shiftInstanceId: 'shift-B', pointRef: 'POINT-100' });
    const res3 = await POST(req3);
    assert.equal(res3.status, 200, 'Shift B harus tetap bisa mengunggah foto untuk pertanyaan yang sama');
    const body3 = (await res3.json()) as { status: string; photo_id: string };
    assert.equal(body3.status, 'uploaded');

  } finally {
    process.env.NEXT_PUBLIC_SUPABASE_URL = origUrl;
    process.env.SUPABASE_SERVICE_ROLE_KEY = origKey;
    globalThis.fetch = origFetch;
    resetSupabaseInstance();
    clearSession();
  }
});
