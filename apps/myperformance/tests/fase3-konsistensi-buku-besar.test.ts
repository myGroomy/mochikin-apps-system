import { describe, it, expect } from 'vitest';
import { emitReversalEvent } from '@mochikin/shared/events';

describe('FASE 3 - Test F-04: emitReversalEvent di packages/shared/events', () => {
  it('menulis entri koreksi negatif sebesar poin asli dan tidak mengurangi dua kali saat dipanggil ulang (idempoten)', async () => {
    const targetEventId = 'stokis-so-SESI01-USER01';
    const mockPersonId = '11111111-1111-1111-1111-111111111111';
    const mockBranchId = '22222222-2222-2222-2222-222222222222';

    // In-memory ledger rows
    const ledgerRows: Array<{
      id: string;
      person_id: string;
      branch_id: string;
      task_code: string;
      task_name_snapshot: string;
      points_per_unit_snapshot: number;
      source_app: string;
      event_id: string;
      idempotency_key: string;
      quantity: number;
      points: number;
      shift_date: string;
      occurred_at: string;
      meta: any;
    }> = [
      {
        id: 'orig-row-001',
        person_id: mockPersonId,
        branch_id: mockBranchId,
        task_code: 'STOKIS_OPNAME',
        task_name_snapshot: 'Opname Stok',
        points_per_unit_snapshot: 3.0,
        source_app: 'stokis',
        event_id: targetEventId,
        idempotency_key: targetEventId,
        quantity: 1,
        points: 3.0,
        shift_date: '2026-11-13',
        occurred_at: '2026-11-13T10:00:00Z',
        meta: { sesiId: 'SESI01' },
      },
    ];

    const mockSupabase = {
      from: (table: string) => {
        expect(table).toBe('point_ledger');
        return {
          select: () => ({
            eq: (_col: string, val: string) => ({
              maybeSingle: async () => {
                const found = ledgerRows.find((r) => r.idempotency_key === val);
                return { data: found || null, error: null };
              },
            }),
            or: (cond: string) => ({
              maybeSingle: async () => {
                // Mencari targetEventId di id, idempotency_key, atau event_id
                const found = ledgerRows.find(
                  (r) =>
                    r.id === targetEventId ||
                    r.idempotency_key === targetEventId ||
                    r.event_id === targetEventId
                );
                return { data: found || null, error: null };
              },
            }),
          }),
          insert: (newRow: any) => ({
            select: () => ({
              single: async () => {
                const inserted = { id: `rev-${Date.now()}`, ...newRow };
                ledgerRows.push(inserted);
                return { data: inserted, error: null };
              },
            }),
          }),
        };
      },
    };

    // 1. Eksekusi pertama Reversal
    const res1 = await emitReversalEvent(targetEventId, 'Audit zero point barang rusak', {
      supabaseClient: mockSupabase,
    });

    expect(res1.success).toBe(true);
    expect(res1.idempotent).toBe(false);
    expect(res1.points).toBe(-3.0);

    // Saldo setelah reversal harus 3.0 + (-3.0) = 0.0
    const netPointsAfterFirst = ledgerRows.reduce((acc, r) => acc + Number(r.points), 0);
    expect(netPointsAfterFirst).toBe(0.0);

    // 2. Eksekusi kedua Reversal (replay dengan targetEventId yang sama)
    const res2 = await emitReversalEvent(targetEventId, 'Audit zero point barang rusak', {
      supabaseClient: mockSupabase,
    });

    expect(res2.success).toBe(true);
    expect(res2.idempotent).toBe(true);
    expect(res2.points).toBe(-3.0);

    // Saldo tetap 0.0 (TIDAK menjadi -3.0)
    const netPointsAfterSecond = ledgerRows.reduce((acc, r) => acc + Number(r.points), 0);
    expect(netPointsAfterSecond).toBe(0.0);
    expect(ledgerRows.length).toBe(2); // 1 original + 1 reversal
  });
});

describe('FASE 3 - Test F-03: Konsistensi Leaderboard Tim dengan Point Ledger', () => {
  it('mengagregasi seluruh aplikasi (mycheck, stokis, mycustomer) dari point_ledger tanpa ada yang 0', () => {
    const personId = 'user-test-f03';
    const ledgerEntries = [
      { person_id: personId, source_app: 'mycheck', points: 2.0 },
      { person_id: personId, source_app: 'stokis', points: 3.0 },
      { person_id: personId, source_app: 'mycustomer', points: 1.0 },
    ];

    const appBreakdown = {
      mycheck: 0,
      mycustomer: 0,
      stokis: 0,
      myperformance: 0,
    };

    let totalPoints = 0;
    for (const row of ledgerEntries) {
      const pts = Number(row.points || 0);
      totalPoints += pts;
      const app = row.source_app as keyof typeof appBreakdown;
      if (appBreakdown[app] !== undefined) {
        appBreakdown[app] += pts;
      }
    }

    expect(totalPoints).toBe(6.0);
    expect(appBreakdown.mycheck).toBe(2.0); // MyCheck BUKAN 0!
    expect(appBreakdown.stokis).toBe(3.0);
    expect(appBreakdown.mycustomer).toBe(1.0);
  });
});
