import { describe, it, expect } from 'vitest';
import {
  MyperformanceIntegrationService,
} from '../src/lib/integration/points';

describe('FASE 1 - Test F-01: Double Counting in getMonthlySummary', () => {
  it('tidak mendobelkan transaksi hari berjalan yang sudah ada di point_ledger', async () => {
    const personId = 'user-test-f01';
    const todayDate = new Date().toISOString().slice(0, 10);

    // Mock ledger: 10 poin transaksi lampau, 5 poin transaksi hari ini
    const mockRows = [
      { person_id: personId, branch_id: 'b1', points: 10.0, quantity: 1, shift_date: '2026-11-01' },
      { person_id: personId, branch_id: 'b1', points: 5.0, quantity: 1, shift_date: todayDate },
    ];

    const mockSupabase = {
      from: (_table: string) => ({
        select: () => ({
          eq: () => ({
            gte: () => ({
              lte: () => Promise.resolve({ data: [{ points: 5.0 }], error: null }),
            }),
          }),
          gte: () => ({
            lte: () => ({
              range: (from: number, _to: number) => {
                if (from > 0) return Promise.resolve({ data: [], error: null });
                return Promise.resolve({ data: mockRows, error: null });
              },
            }),
          }),
        }),
      }),
    };

    const mockGetTodayPoints = async (_p: string, _d: string) => ({
      source: 'redis' as const,
      points: 5.0,
      available: true,
    });

    const svc = new MyperformanceIntegrationService({
      supabase: mockSupabase as unknown,
      getTodayPoints: mockGetTodayPoints as unknown as (p: string, d: string) => Promise<{ source: 'redis' | 'supabase'; points: number; available: boolean }>,
      timezone: 'Asia/Jakarta',
    });

    const summary = await svc.getMonthlySummary(personId);

    // Ledger sudah memuat 10 + 5 = 15 poin.
    // monthTotal HARUS 15 (BUKAN 20).
    expect(summary.monthTotalPoints).toBe(15);
    expect(summary.todayPoints).toBe(5);
    expect(summary.monthTotal).toBe(15);
  });
});

describe('FASE 1 - Test F-02: Crash on Import without SUPABASE_URL', () => {
  it('instansiasi MyperformanceIntegrationService tanpa dependensi supabase dan tanpa env URL tidak boleh melempar error', () => {
    // Simpan env asli
    const origUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const origSupabaseUrl = process.env.SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_URL;

    try {
      // Sebelum patch, new MyperformanceIntegrationService() langsung memanggil getSupabaseAdmin() yang throw 'supabaseUrl is required'
      expect(() => {
        new MyperformanceIntegrationService();
      }).not.toThrow();
    } finally {
      if (origUrl) process.env.NEXT_PUBLIC_SUPABASE_URL = origUrl;
      if (origSupabaseUrl) process.env.SUPABASE_URL = origSupabaseUrl;
    }
  });
});
