import { Redis } from '@upstash/redis';
import { createClient } from '@supabase/supabase-js';

export type PointsSource = 'redis' | 'supabase';

export interface PointsResult {
  source: PointsSource;
  points: number;
  /** false when the backing store is unreachable — callers must not crash. */
  available: boolean;
}

export interface PointsRollupRow {
  person_id: string;
  branch_id: string;
  period_type: string;
  period_key: string;
  total_points: number;
  total_quantity: number;
  event_count: number;
  computed_at?: string;
}

export const DEFAULT_MONTHLY_POINTS_TARGET = 1044;

/**
 * Resolve the business date (local timezone) from an ISO-8601 timestamp.
 *
 * The business date is the wall-clock date in `APP_TIMEZONE` (default Asia/Jakarta)
 * of the event occurrence, NOT the UTC date. Events emitted at 23:30 WIB must land
 * on the same day, and events emitted at 00:30 WIB must land on the next day.
 */
export function resolveBusinessDate(
  occurredAt: string,
  timezone: string = process.env.APP_TIMEZONE || 'Asia/Jakarta'
): string {
  try {
    const date = new Date(occurredAt);
    if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10);

    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '00';
    return `${get('year')}-${get('month')}-${get('day')}`;
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

/**
 * Point boundary — single source of truth for where a person's score lives.
 *
 * T+0  → Redis `pts:{personId}:{YYYY-MM-DD}`  (today, real-time mirror)
 * T-1+ → Supabase `point_rollups`                (period_key = business date etc.)
 *
 * The two MUST NEVER be summed within one calculation. The monthly view sums
 * historical rollups (day → month) and only adds today when the month is the
 * current month.
 */
export async function getPointsSource(
  personId: string,
  date: string,
  redis?: Redis | null,
  supabaseUrl?: string,
  supabaseKey?: string
): Promise<PointsResult> {
  if (redis) {
    try {
      const key = `pts:${personId}:${date}`;
      const points = await redis.get<number>(key);
      const value = Number(points ?? 0);
      return { source: 'redis', points: value, available: true };
    } catch (error) {
      console.error('❌ Failed to get T+0 points from Redis:', error);
      return { source: 'redis', points: 0, available: false };
    }
  }

  if (supabaseUrl && supabaseKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { data, error } = await supabase
        .from('point_rollups')
        .select('total_points')
        .eq('person_id', personId)
        .eq('period_type', 'day')
        .eq('period_key', date)
        .single();

      if (error) {
        return { source: 'supabase', points: 0, available: false };
      }
      return { source: 'supabase', points: data?.total_points ?? 0, available: true };
    } catch (error) {
      console.error('❌ Failed to get historical points from Supabase:', error);
      return { source: 'supabase', points: 0, available: false };
    }
  }

  // No store configured — treat as unavailable rather than fabricating zero.
  return { source: 'supabase', points: 0, available: false };
}

/**
 * Fetch points for a person across a historical range (T-1+ via rollups).
 * Returns a map of period_key → points.
 */
export async function getPointsRange(
  personId: string,
  startDate: string,
  endDate: string,
  supabaseUrl: string,
  supabaseKey: string
): Promise<Map<string, number>> {
  const supabase = createClient(supabaseUrl, supabaseKey);
  const result = new Map<string, number>();

  try {
    const { data, error } = await supabase
      .from('point_rollups')
      .select('period_key, total_points')
      .eq('person_id', personId)
      .eq('period_type', 'day')
      .gte('period_key', startDate)
      .lte('period_key', endDate)
      .order('period_key', { ascending: true });

    if (error) {
      console.error('❌ Failed to get points range:', error);
      return result;
    }

    data?.forEach((row: { period_key: string; total_points: number }) => {
      result.set(row.period_key, Number(row.total_points || 0));
    });
  } catch (error) {
    console.error('❌ Error fetching points range:', error);
  }

  return result;
}
