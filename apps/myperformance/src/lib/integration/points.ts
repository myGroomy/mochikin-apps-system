import { TaskEvent } from '@mochikin/shared/events';
import { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { getTodayPoints as libGetTodayPoints, incrementTodayPoints as libIncrement, clearTodayPoints as libClear } from '@/lib/redis';
import { businessDateOf, getAppTimezone } from '@/lib/time';

export interface TaskDefinition {
  task_code: string;
  name: string;
  app_id: string;
  category: 'M' | 'T' | null;
  level_role: 'Manajer' | 'SPV' | 'Staf' | null;
  points_per_unit: number;
  unit_output: string | null;
  is_active: boolean;
  valid_from: string;
  valid_to: string | null;
}

export interface LedgerRow {
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
  meta?: Record<string, unknown>;
}

export interface RecordResult {
  eventId: string;
  idempotent: boolean;
  points: number;
  shiftDate: string;
}

export type ValidationIssueCode =
  | 'TASK_NOT_FOUND'
  | 'TASK_INACTIVE'
  | 'TASK_OUT_OF_PERIOD'
  | 'PERSON_NOT_FOUND'
  | 'BRANCH_MISMATCH';

export interface ValidationIssue {
  code: ValidationIssueCode;
  message: string;
}

export interface RollupAggregate {
  person_id: string;
  branch_id: string;
  period_type: 'day' | 'month' | 'year' | 'shift';
  period_key: string;
  total_points: number;
  total_quantity: number;
  event_count: number;
}

export interface MonthlySummary {
  personId: string;
  branchId: string;
  month: string;
  monthTotalPoints: number;
  monthEventCount: number;
  monthTotal: number;
  monthTarget: number;
  progressPercent: number;
  effectiveHoursPerMonth: number;
  estimatedEffectiveHours: number;
  pointsNeededForTarget: number;
  todayPoints: number;
  todaySource: 'redis' | 'ledger' | 'none';
}

export interface LedgerPage {
  rows: LedgerRow[];
  total: number;
  limit: number;
  offset: number;
}

export interface PointsServiceDeps {
  supabase?: unknown;
  getTodayPoints?: (personId: string, date: string) => Promise<{ points: number; available: boolean }>;
  incrementTodayPoints?: (personId: string, date: string, points: number) => Promise<number>;
  clearTodayPoints?: (personId: string, date: string) => Promise<void>;
  timezone?: string;
}

const PAGE_SIZE = 1000;

function taskCodeOf(task: TaskDefinition | null): string {
  return task?.task_code || 'unknown';
}

function todayKey(tz: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '00';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

function monthKeyOfIso(iso: string, tz: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(iso));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '00';
  return `${get('year')}-${get('month')}`;
}

// ============================================================================
// Status koneksi database (sumber kebenaran untuk notifikasi "tidak terhubung")
// ============================================================================
let dbConnected = true
let dbConnectReason: string | null = null

export function getDatabaseStatus(): { connected: boolean; reason?: string } {
  return { connected: dbConnected, reason: dbConnectReason ?? undefined }
}

function markDbConnected(connected: boolean, reason: string | null = null) {
  dbConnected = connected
  dbConnectReason = reason
}

const TABLE_OR_CONNECTION_HINTS = [
  'schema cache',
  'could not find the table',
  'pgrst205',
  'econnrefused',
  'failed to fetch',
  'network error',
  'connection timeout',
]

function isTableOrConnectionError(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase()
  return TABLE_OR_CONNECTION_HINTS.some((hint) => msg.includes(hint))
}

// Jika tabel point_ledger / database tidak tersedia, kembalikan fallback kosong
// agar UI tetap menampilkan state normal (nol/kosong) alih-alih error crash.
function ledgerFallback<T>(fallback: T, err?: unknown): T {
  markDbConnected(
    false,
    err ? (err instanceof Error ? err.message : String(err)) : 'Tabel point_ledger tidak tersedia di database'
  )
  return fallback
}

export function monthRange(monthKey: string): { start: string; end: string } {
  const [yearStr, monthStr] = monthKey.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const start = `${monthKey}-01`;
  const end = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
  return { start, end };
}

export function monthlyTarget(): number {
  const parsed = Number(
    process.env.MONTHLY_POINTS_TARGET || process.env.NEXT_PUBLIC_MONTHLY_POINTS_TARGET
  );
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1044;
}

export function effectiveHoursPerMonth(): number {
  const parsed = Number(process.env.EFFECTIVE_HOURS_PER_MONTH);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 173;
}

/**
 * MyperformanceIntegrationService — single source of truth for point
 * calculation and ledger writes (K1).
 */
export class MyperformanceIntegrationService {
  private supabase: unknown;
  private getTodayPoints: PointsServiceDeps['getTodayPoints'];
  private incrementTodayPoints: PointsServiceDeps['incrementTodayPoints'];
  private clearTodayPoints: PointsServiceDeps['clearTodayPoints'];
  private timezone: string;

  constructor(deps: PointsServiceDeps = {}) {
    this.supabase = deps.supabase;
    this.getTodayPoints = deps.getTodayPoints ?? libGetTodayPoints;
    this.incrementTodayPoints = deps.incrementTodayPoints ?? (libIncrement as never);
    this.clearTodayPoints = deps.clearTodayPoints ?? libClear;
    this.timezone = deps.timezone || getAppTimezone();
  }

  private get client(): unknown {
    if (!this.supabase) {
      this.supabase = getSupabaseAdmin();
    }
    return this.supabase;
  }
  // ---------------------------------------------------------------- task

  async getTaskDefinition(taskCode: string): Promise<TaskDefinition | null> {
    const client = this.client as any;
    const { data, error } = await client
      .from('task_definitions')
      .select('*')
      .eq('task_code', taskCode)
      .maybeSingle();
    if (error) throw new Error(`Task lookup failed: ${error.message}`);
    return (data as TaskDefinition) ?? null;
  }

  validateOccurrence(task: TaskDefinition | null, occurredAt: string): ValidationIssue | null {
    if (!task) {
      return { code: 'TASK_NOT_FOUND', message: `Task '${taskCodeOf(task)}' tidak ditemukan` };
    }
    if (!task.is_active) {
      return { code: 'TASK_INACTIVE', message: `Task '${task.task_code}' tidak aktif` };
    }
    const eventDate = businessDateOf(occurredAt, this.timezone);
    if (eventDate < task.valid_from) {
      return { code: 'TASK_OUT_OF_PERIOD', message: `Task '${task.task_code}' belum berlaku pada ${eventDate}` };
    }
    if (task.valid_to && eventDate > task.valid_to) {
      return { code: 'TASK_OUT_OF_PERIOD', message: `Task '${task.task_code}' sudah tidak berlaku pada ${eventDate}` };
    }
    return null;
  }

  // ------------------------------------------------------------ person

  async validatePersonBranch(personId: string, branchId: string): Promise<ValidationIssue | null> {
    const client = this.client as any;
    const { data, error } = await client
      .from('people')
      .select('id, branch_id, status')
      .eq('id', personId)
      .maybeSingle();
    if (error) throw new Error(`Person lookup failed: ${error.message}`);
    if (!data) {
      return { code: 'PERSON_NOT_FOUND', message: `Person '${personId}' tidak ditemukan` };
    }
    const status = (data.status || 'active') as string;
    if (status !== 'active') {
      return { code: 'PERSON_NOT_FOUND', message: `Person '${personId}' tidak aktif` };
    }
    if ((data.branch_id || branchId) !== branchId) {
      return { code: 'BRANCH_MISMATCH', message: `Branch '${branchId}' tidak sesuai dengan data person` };
    }
    return null;
  }

  // --------------------------------------------------------------- emit

  async findExistingEvent(idempotencyKey: string): Promise<LedgerRow | null> {
    const client = this.client as any;
    try {
      const { data, error } = await client
        .from('point_ledger')
        .select('*')
        .eq('idempotency_key', idempotencyKey)
        .maybeSingle();
      if (error) {
        if (isTableOrConnectionError(error)) return ledgerFallback(null, error)
        throw new Error(`Idempotency lookup failed: ${error.message}`);
      }
      markDbConnected(true, null);
      return (data as LedgerRow) ?? null;
    } catch (err) {
      if (isTableOrConnectionError(err)) return ledgerFallback(null, err)
      throw err;
    }
  }

  async recordEvent(event: TaskEvent): Promise<RecordResult> {
    const existing = await this.findExistingEvent(event.idempotencyKey);
    const shiftDate = businessDateOf(event.occurredAt, this.timezone);
    if (existing) {
      return {
        eventId: existing.id,
        idempotent: true,
        points: Number(existing.points || 0),
        shiftDate: existing.shift_date,
      };
    }

    const task = await this.getTaskDefinition(event.taskId);
    const taskIssue = this.validateOccurrence(task, event.occurredAt);
    if (taskIssue) {
      throw Object.assign(new Error(taskIssue.message), { validation: taskIssue });
    }
    const personIssue = await this.validatePersonBranch(event.personId, event.branchId);
    if (personIssue) {
      throw Object.assign(new Error(personIssue.message), { validation: personIssue });
    }

    const taskCode = task!.task_code;
    const pointsPerUnit = Number(task!.points_per_unit);
    const points = Number((event.outputQty * pointsPerUnit).toFixed(2));

    const client = this.client as any;
    let data: any;
    let error: any;
    try {
      const result = await client
        .from('point_ledger')
        .insert({
          person_id: event.personId,
          branch_id: event.branchId,
          task_code: taskCode,
          task_name_snapshot: task!.name,
          points_per_unit_snapshot: pointsPerUnit,
          source_app: event.appId,
          event_id: event.idempotencyKey,
          idempotency_key: event.idempotencyKey,
          quantity: event.outputQty,
          points,
          shift_date: shiftDate,
          occurred_at: event.occurredAt,
          meta: {
            unit_output: task!.unit_output,
            category: task!.category,
            level_role: task!.level_role,
          },
        })
        .select('id, idempotency_key')
        .single();
      data = result.data;
      error = result.error;
    } catch (err) {
      if (isTableOrConnectionError(err)) {
        console.warn('⚠️ Ledger insert skipped (database/table not available):', err);
        markDbConnected(false, err instanceof Error ? err.message : String(err));
        return { eventId: event.idempotencyKey, idempotent: false, points, shiftDate };
      }
      throw err;
    }

    if (error) {
      const code = (error as { code?: string }).code;
      if (code === '23505') {
        const raced = await this.findExistingEvent(event.idempotencyKey);
        if (raced) {
          return { eventId: raced.id, idempotent: true, points: Number(raced.points || 0), shiftDate: raced.shift_date };
        }
      }
      if (isTableOrConnectionError(error)) {
        console.warn('⚠️ Ledger insert skipped (database/table not available):', error.message);
        markDbConnected(false, error.message);
        return { eventId: event.idempotencyKey, idempotent: false, points, shiftDate };
      }
      throw new Error(`Ledger insert failed: ${error.message}`);
    }

    const ledgerId = String((data as { id: string }).id);

    // T+0 mirror only when the event lands on the current business day.
    const isToday = shiftDate === todayKey(this.timezone);
    if (isToday) {
      const inc = this.incrementTodayPoints as (p: string, d: string, pts: number) => Promise<number>;
      try {
        await inc(event.personId, shiftDate, points);
      } catch (redisErr) {
        console.warn('⚠️ Redis T+0 mirror failed:', redisErr);
      }
    }

    return { eventId: ledgerId, idempotent: false, points, shiftDate };
  }

  // --------------------------------------------------------------- rollup

  private async paginatedLedger(query: (from: number, to: number) => Promise<any>): Promise<any[]> {
    const all: any[] = [];
    let offset = 0;
    for (;;) {
      let result: { data: any; error: any }
      try {
        result = await query(offset, offset + PAGE_SIZE - 1);
      } catch (err) {
        return ledgerFallback([], err);
      }
      const { data, error } = result;
      if (error) {
        if (isTableOrConnectionError(error)) return ledgerFallback([], error);
        throw new Error(`Ledger aggregate failed: ${error.message}`);
      }
      markDbConnected(true, null);
      const pageRows: any[] = (data as any[]) || [];
      if (pageRows.length === 0) break;
      all.push(...pageRows);
      offset += PAGE_SIZE;
      if (pageRows.length < PAGE_SIZE) break;
    }
    markDbConnected(true, null);
    return all;
  }

  async aggregateDay(shiftDate: string): Promise<RollupAggregate[]> {
    const client = this.client as any;
    const rows = await this.paginatedLedger(async (from, to) =>
      client
        .from('point_ledger')
        .select('person_id, branch_id, points, quantity')
        .eq('shift_date', shiftDate)
        .range(from, to)
    );
    const map = new Map<string, RollupAggregate>();
    for (const row of rows) {
      const key = `${row.person_id}:${row.branch_id}`;
      const agg = map.get(key) ?? {
        person_id: row.person_id,
        branch_id: row.branch_id,
        period_type: 'day' as const,
        period_key: shiftDate,
        total_points: 0,
        total_quantity: 0,
        event_count: 0,
      };
      agg.total_points += Number(row.points || 0);
      agg.total_quantity += Number(row.quantity || 0);
      agg.event_count += 1;
      map.set(key, agg);
    }
    return Array.from(map.values()).map((agg) => ({ ...agg, total_points: Number(agg.total_points.toFixed(2)) }));
  }

  async persistDayRollups(shiftDate: string): Promise<number> {
    const aggregates = await this.aggregateDay(shiftDate);
    let processed = 0;
    const client = this.client as any;
    for (const agg of aggregates) {
      const { error } = await client.from('point_rollups').upsert(
        {
          person_id: agg.person_id,
          branch_id: agg.branch_id,
          period_type: 'day',
          period_key: shiftDate,
          total_points: agg.total_points,
          total_quantity: agg.total_quantity,
          event_count: agg.event_count,
          computed_at: new Date().toISOString(),
        },
        { onConflict: 'person_id,branch_id,period_type,period_key' }
      );
      if (error) {
        console.error(`❌ Upsert ${agg.person_id}/${shiftDate}:`, (error as Error).message);
        continue;
      }
      processed += 1;
      try {
        const clear = this.clearTodayPoints as (p: string, d: string) => Promise<void>;
        await clear(agg.person_id, shiftDate);
      } catch (redisErr) {
        console.warn('⚠️ Redis clear failed after persist:', redisErr);
      }
    }
    return processed;
  }

  async aggregateMonth(monthKey: string): Promise<RollupAggregate[]> {
    const { start, end } = monthRange(monthKey);
    const client = this.client as any;
    const rows = await this.paginatedLedger(async (from, to) =>
      client
        .from('point_ledger')
        .select('person_id, branch_id, points, quantity')
        .gte('shift_date', start)
        .lte('shift_date', end)
        .range(from, to)
    );
    const map = new Map<string, RollupAggregate>();
    for (const row of rows) {
      const key = `${row.person_id}:${row.branch_id}`;
      const agg = map.get(key) ?? {
        person_id: row.person_id,
        branch_id: row.branch_id,
        period_type: 'month' as const,
        period_key: monthKey,
        total_points: 0,
        total_quantity: 0,
        event_count: 0,
      };
      agg.total_points += Number(row.points || 0);
      agg.total_quantity += Number(row.quantity || 0);
      agg.event_count += 1;
      map.set(key, agg);
    }
    return Array.from(map.values()).map((agg) => ({ ...agg, total_points: Number(agg.total_points.toFixed(2)) }));
  }

  async persistMonthRollups(monthKey: string): Promise<number> {
    const aggregates = await this.aggregateMonth(monthKey);
    const client = this.client as any;
    let processed = 0;
    for (const agg of aggregates) {
      const { error } = await client.from('point_rollups').upsert(
        {
          person_id: agg.person_id,
          branch_id: agg.branch_id,
          period_type: 'month',
          period_key: monthKey,
          total_points: agg.total_points,
          total_quantity: agg.total_quantity,
          event_count: agg.event_count,
          computed_at: new Date().toISOString(),
        },
        { onConflict: 'person_id,branch_id,period_type,period_key' }
      );
      if (!error) processed += 1;
    }
    return processed;
  }

  // ------------------------------------------------------------------ read

  async getTodayScore(personId: string, date?: string): Promise<{
    personId: string;
    branchId: string;
    date: string;
    points: number;
    source: 'redis' | 'ledger';
  }> {
    const tz = this.timezone;
    const effectiveDate = date || todayKey(tz);
    const effectiveTzKey = todayKey(tz);
    const isToday = effectiveDate === effectiveTzKey;
    const redisResult = await this.getTodayPoints!(personId, effectiveDate);
    let points = redisResult.points;    let source: 'redis' | 'ledger' = 'ledger';
    if (isToday && redisResult.available) {
      points = redisResult.points;
      source = 'redis';
    } else {
    const client = this.client as any;
      try {
        const { data, error } = await client
          .from('point_ledger')
          .select('points')
          .eq('person_id', personId)
          .gte('shift_date', effectiveDate)
          .lte('shift_date', effectiveDate);
        if (error) {
          if (isTableOrConnectionError(error)) return ledgerFallback({ personId, branchId: '', date: effectiveDate, points: 0, source: 'ledger' }, error)
          throw new Error(`Ledger today aggregate failed: ${error.message}`);
        }
        markDbConnected(true, null);
        points = Number(((data as any[]) || []).reduce((s, r) => s + Number(r?.points || 0), 0).toFixed(2));
        source = 'ledger';
      } catch (err) {
        if (isTableOrConnectionError(err)) return ledgerFallback({ personId, branchId: '', date: effectiveDate, points: 0, source: 'ledger' }, err)
        throw err;
      }
    }
    return { personId, branchId: '', date: effectiveDate, points, source };
  }

  async getRollups(personId: string, periodType: 'day' | 'month' | 'year' | 'shift', limit = 30, offset = 0) {
    const client = this.client as any;
    const { data, error, count } = await client
      .from('point_rollups')
      .select('*', { count: 'exact' })
      .eq('person_id', personId)
      .eq('period_type', periodType)
      .order('period_key', { ascending: false })
      .range(Number(offset) || 0, Number(offset) + Math.max(Number(limit) || 0, 1) - 1);
    if (error) throw new Error(`Rollup query failed: ${error.message}`);
    const rows = ((data as any[]) || []).map((r) => ({
      person_id: r.person_id,
      branch_id: r.branch_id,
      period_type: r.period_type as RollupAggregate['period_type'],
      period_key: r.period_key,
      total_points: Number(r.total_points || 0),
      total_quantity: Number(r.total_quantity || 0),
      event_count: Number(r.event_count || 0),
    }));
    return { rows, total: Number(count ?? rows.length) };
  }

  async getLedger(personId: string, limit = 50, offset = 0): Promise<LedgerPage> {
    const client = this.client as any;
    try {
      const { data, error, count } = await client
        .from('point_ledger')
        .select('*', { count: 'exact' })
        .eq('person_id', personId)
        .order('occurred_at', { ascending: false })
        .range(Number(offset) || 0, Number(offset) + Math.max(Number(limit) || 0, 1) - 1);
      if (error) {
        if (isTableOrConnectionError(error)) return ledgerFallback({ rows: [], total: 0, limit, offset }, error)
        throw new Error(`Ledger query failed: ${error.message}`);
      }
      markDbConnected(true, null);
      const rows = ((data as any[]) || []) as LedgerRow[];
      return { rows, total: Number(count ?? rows.length), limit, offset };
    } catch (err) {
      if (isTableOrConnectionError(err)) return ledgerFallback({ rows: [], total: 0, limit, offset }, err)
      throw err;
    }
  }

  async getMonthlySummary(personId: string, monthKey?: string, todayPointsOverride?: number) {
    const month = monthKey || monthKeyOfIso(new Date().toISOString(), this.timezone);
    const aggregates = await this.aggregateMonth(month);
    const personAgg =
      aggregates.find((a) => a.person_id === personId) || {
        person_id: personId,
        branch_id: '',
        period_type: 'month' as const,
        period_key: month,
        total_points: 0,
        total_quantity: 0,
        event_count: 0,
      };
    const isCurrentMonth = month === monthKeyOfIso(new Date().toISOString(), this.timezone);
    let todayPoints = todayPointsOverride ?? 0;
    let todaySource: MonthlySummary['todaySource'] = 'none';
    if (isCurrentMonth) {
      const redisResult = await this.getTodayPoints!(personId, todayKey(this.timezone));
      if (redisResult.available) {
        todayPoints = redisResult.points;
        todaySource = 'redis';
      } else {
        const client = this.client as any;
        const { data, error } = await client
          .from('point_ledger')
          .select('points')
          .eq('person_id', personId)
          .gte('shift_date', todayKey(this.timezone))
          .lte('shift_date', todayKey(this.timezone));
        if (error) throw new Error(`Ledger today aggregate failed: ${error.message}`);
        todayPoints = Number(((data as any[]) || []).reduce((s, r) => s + Number(r?.points || 0), 0).toFixed(2));
        todaySource = 'ledger';
      }
    }
    const monthTotalPoints = Number(personAgg.total_points);
    // aggregateMonth() membaca point_ledger yang sudah memuat transaksi hari berjalan.
    // Jangan menambahkan todayPoints lagi agar tidak terjadi double counting.
    const monthTotal = monthTotalPoints;
    const monthTarget = monthlyTarget();
    const estimatedEffectiveHours = Number(((monthTotal * 10) / 60).toFixed(1));
    const progressPercent = Number(Math.min(100, (monthTotal / monthTarget) * 100).toFixed(2));
    return {
      personId,
      branchId: personAgg.branch_id,
      month,
      monthTotalPoints,
      monthEventCount: Number(personAgg.event_count),
      monthTotal,
      monthTarget,
      progressPercent,
      effectiveHoursPerMonth: effectiveHoursPerMonth(),
      estimatedEffectiveHours,
      pointsNeededForTarget: Math.max(Number((monthTarget - monthTotal).toFixed(2)), 0),
      todayPoints: Number(todayPoints.toFixed(2)),
      todaySource,
    };
  }
}

export const pointsService = new MyperformanceIntegrationService();
