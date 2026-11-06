import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase', () => ({
  getSupabaseAdmin: () => ({}),
}));

import {
  MyperformanceIntegrationService,
  type PointsServiceDeps,
} from '../src/lib/integration/points';

const event = {
  taskId: 'MYCHECK_SHIFT_CLOSE',
  personId: '00000000-0000-0000-0000-000000000001',
  branchId: '00000000-0000-0000-0000-000000000002',
  appId: 'mycheck' as const,
  outputQty: 1,
  occurredAt: '2026-11-06T08:00:00.000Z',
  idempotencyKey: 'mycheck-close-ledger-test',
};

function createSupabaseMock(insertError: boolean) {
  return {
    from(table: string) {
      let isInsert = false;
      return {
        select() {
          return this;
        },
        eq() {
          return this;
        },
        maybeSingle: async () => {
          if (table === 'point_ledger') {
            return { data: null, error: null };
          }
          if (table === 'task_definitions') {
            return {
              data: {
                task_code: event.taskId,
                name: 'Tutup Shift',
                app_id: 'mycheck',
                category: 'T',
                level_role: 'SPV',
                points_per_unit: 2,
                unit_output: 'shift',
                is_active: true,
                valid_from: '2026-01-01',
                valid_to: null,
              },
              error: null,
            };
          }
          if (table === 'people') {
            return {
              data: {
                id: event.personId,
                branch_id: event.branchId,
                status: 'active',
              },
              error: null,
            };
          }
          throw new Error(`Unexpected table: ${table}`);
        },
        insert() {
          isInsert = true;
          return this;
        },
        single: async () => {
          if (table !== 'point_ledger' || !isInsert) {
            throw new Error(`Unexpected single query for ${table}`);
          }
          return insertError
            ? {
                data: null,
                error: {
                  code: 'PGRST205',
                  message: 'Could not find the table point_ledger',
                },
              }
            : { data: { id: 'ledger-1' }, error: null };
        },
      };
    },
  };
}

describe('MyperformanceIntegrationService.recordEvent', () => {
  it('does not report success when the ledger insert fails', async () => {
    const service = new MyperformanceIntegrationService({
      supabase: createSupabaseMock(true) as unknown as PointsServiceDeps['supabase'],
      incrementTodayPoints: async () => 1,
      timezone: 'Asia/Jakarta',
    });

    await expect(service.recordEvent(event)).rejects.toThrow(/Ledger insert failed/);
  });

  it('records an event after the ledger insert succeeds', async () => {
    const service = new MyperformanceIntegrationService({
      supabase: createSupabaseMock(false) as unknown as PointsServiceDeps['supabase'],
      incrementTodayPoints: async () => 1,
      timezone: 'Asia/Jakarta',
    });

    await expect(service.recordEvent(event)).resolves.toMatchObject({
      eventId: 'ledger-1',
      idempotent: false,
      points: 2,
    });
  });
});
