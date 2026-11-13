import { describe, it } from 'node:test';
import assert from 'node:assert';
import { resolvePersonForTaskEvent } from '../lib/resolve-person';
import { TaskEventSchema } from '@mochikin/shared/events';

describe('FASE 2 - F-06: Identifikasi User untuk Emisi Task Event', () => {
  const mockBranchId = '11111111-1111-1111-1111-111111111111';
  const mockPersonId1 = '22222222-2222-2222-2222-222222222222';
  const mockPersonId2 = '33333333-3333-3333-3333-333333333333';

  it('Jalur Utama: Menggunakan personId UUID langsung dari sesi/cookie tanpa query teks', async () => {
    const ctx = {
      personId: mockPersonId1,
      activeBranchId: mockBranchId,
      username: 'budi_santoso',
      name: 'Budi Santoso',
    };

    // supabase client tidak boleh dipanggil sama sekali
    const dummySupabase = {
      from: () => {
        throw new Error('Supabase from() should not be called when personId is present');
      },
    };

    const resolved = await resolvePersonForTaskEvent(ctx, dummySupabase);
    assert.ok(resolved, 'Harus mengembalikan resolved person');
    assert.strictEqual(resolved.personId, mockPersonId1);
    assert.strictEqual(resolved.branchId, mockBranchId);
  });

  it('Dua user dengan nama mirip (Budi) tidak bentrok karena sesi memiliki personId masing-masing', async () => {
    const userA = {
      personId: mockPersonId1,
      activeBranchId: mockBranchId,
      username: 'budi_a',
      name: 'Budi Santoso',
    };
    const userB = {
      personId: mockPersonId2,
      activeBranchId: mockBranchId,
      username: 'budi_b',
      name: 'Budi Setiawan',
    };

    const dummySupabase = { from: () => ({}) };

    const resA = await resolvePersonForTaskEvent(userA, dummySupabase);
    const resB = await resolvePersonForTaskEvent(userB, dummySupabase);

    assert.strictEqual(resA?.personId, mockPersonId1);
    assert.strictEqual(resB?.personId, mockPersonId2);
    assert.notStrictEqual(resA?.personId, resB?.personId);
  });

  it('Fallback Sesi Lama: Jika personId kosong, lookup pasti via exact username.eq (bukan name.ilike)', async () => {
    const legacyCtx = {
      personId: undefined,
      activeBranchId: undefined,
      username: 'budi_legacy',
      name: 'Budi',
    };

    let queryColumn = '';
    let queryValue = '';

    const mockSupabase = {
      from: (table: string) => {
        assert.strictEqual(table, 'people');
        return {
          select: () => ({
            eq: (col: string, val: string) => {
              if (col === 'username') {
                queryColumn = col;
                queryValue = val;
              }
              return {
                eq: () => ({
                  maybeSingle: async () => ({
                    data: { id: mockPersonId1, branch_id: mockBranchId },
                    error: null,
                  }),
                }),
              };
            },
          }),
        };
      },
    };

    const resolved = await resolvePersonForTaskEvent(legacyCtx, mockSupabase);
    assert.ok(resolved);
    assert.strictEqual(resolved.personId, mockPersonId1);
    assert.strictEqual(resolved.branchId, mockBranchId);
    assert.strictEqual(queryColumn, 'username', 'Wajib lookup berdasarkan exact username, bukan name.ilike');
    assert.strictEqual(queryValue, 'budi_legacy');
  });

  it('Kegagalan Emisi / User Tidak Ditemukan mencatat console.error dengan konteks lengkap', async () => {
    const invalidCtx = {
      personId: undefined,
      activeBranchId: undefined,
      username: 'user_tidak_ada',
    };

    const errorsLogged: any[] = [];
    const origConsoleError = console.error;
    console.error = (...args: any[]) => {
      errorsLogged.push(args);
    };

    try {
      const mockSupabase = {
        from: () => ({
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: null, error: null }),
              }),
            }),
          }),
        }),
      };

      const resolved = await resolvePersonForTaskEvent(invalidCtx, mockSupabase);
      assert.strictEqual(resolved, null);
      assert.ok(errorsLogged.length > 0, 'console.error harus dipanggil saat resolusi gagal');
      const firstError = errorsLogged[0];
      assert.ok(
        firstError[0].includes('personId atau branchId valid tidak ditemukan'),
        'Pesan error harus memuat konteks kegagalan'
      );
    } finally {
      console.error = origConsoleError;
    }
  });
});

describe('FASE 2 - F-05: Emisi Event Task MYCUST_WA MyCustomer', () => {
  it('TaskEventSchema menerima task MYCUST_WA dengan idempotencyKey deterministik', () => {
    const event = {
      taskId: 'MYCUST_WA',
      personId: '11111111-1111-1111-1111-111111111111',
      branchId: '22222222-2222-2222-2222-222222222222',
      appId: 'mycustomer' as const,
      outputQty: 1,
      occurredAt: '2026-11-13T10:00:00+07:00',
      idempotencyKey: 'mycust-wa-ORD123-USER456-2026-11-13',
    };

    const parsed = TaskEventSchema.safeParse(event);
    assert.strictEqual(parsed.success, true);
    if (parsed.success) {
      assert.strictEqual(parsed.data.taskId, 'MYCUST_WA');
      assert.strictEqual(parsed.data.idempotencyKey, 'mycust-wa-ORD123-USER456-2026-11-13');
    }
  });
});
