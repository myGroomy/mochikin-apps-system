import { Redis } from '@upstash/redis';

const url = process.env.UPSTASH_REDIS_REST_URL || '';
const token = process.env.UPSTASH_REDIS_REST_TOKEN || '';

let cached: Redis | null = null;
let failed = false;

export function getRedis(): Redis | null {
  if (failed) return null;
  if (url && token) {
    cached = cached ?? new Redis({ url, token });
    return cached;
  }
  return null;
}

export function isRedisConfigured(): boolean {
  return Boolean(url && token) && !failed;
}

export function markRedisUnavailable(): void {
  failed = true;
}

export function pointsKey(personId: string, date: string): string {
  return `pts:${personId}:${date}`;
}

/**
 * Read T+0 score for a person on a date.
 * Returns { points, available } — `available=false` means no Redis configured
 * or Redis failed; callers should fall back to ledger aggregation.
 */
export async function getTodayPoints(personId: string, date: string): Promise<{
  points: number;
  available: boolean;
}> {
  const redis = getRedis();
  if (!redis) {
    return { points: 0, available: false };
  }
  try {
    const value = await redis.get<number>(pointsKey(personId, date));
    return { points: Number(value ?? 0), available: true };
  } catch (err) {
    console.error('❌ Redis GET points failed:', err);
    return { points: 0, available: false };
  }
}

/**
 * Atomically add points to the T+0 counter.
 * Expire after 48h so stale keys self-clean if a rollup is missed.
 */
export async function incrementTodayPoints(
  personId: string,
  date: string,
  points: number
): Promise<number> {
  const redis = getRedis();
  if (!redis) {
    throw new Error('Redis is not configured');
  }
  const key = pointsKey(personId, date);
  const total = await redis.incrbyfloat(key, points);
  await redis.expire(key, 60 * 60 * 48);
  return Number(total);
}

/**
 * Remove a T+0 counter once its daily rollup is persisted.
 */
export async function clearTodayPoints(personId: string, date: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.del(pointsKey(personId, date));
  } catch (err) {
    console.warn(`⚠️ Redis DEL failed for ${personId}/${date}:`, err);
  }
}
