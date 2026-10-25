import { Redis } from '@upstash/redis';

export const QUOTA_PER_APP = {
  mylauncher: { reqPerMin: 20, burstSize: 30 },
  mycheck: { reqPerMin: 30, burstSize: 50 },
  stokis: { reqPerMin: 50, burstSize: 80 },
  mycustomer: { reqPerMin: 40, burstSize: 60 },
  myperformance: { reqPerMin: 30, burstSize: 50 },
} as const;

export type AppName = keyof typeof QUOTA_PER_APP;

/**
 * Check if app has quota available for Sheets API request
 * Uses Upstash Redis for distributed rate limiting
 */
export class SheetsQuotaBudget {
  private redis: Redis;

  constructor(redisUrl: string, redisToken: string) {
    this.redis = new Redis({
      url: redisUrl,
      token: redisToken,
    });
  }

  /**
   * Check and increment quota counter
   * @param appName - App requesting quota
   * @returns true if request allowed, false if rate limited
   */
  async checkQuota(appName: AppName): Promise<boolean> {
    const quota = QUOTA_PER_APP[appName];
    if (!quota) {
      console.error(`❌ Unknown app: ${appName}`);
      return false;
    }

    const key = `quota:sheets:${appName}:${this.getCurrentMinute()}`;

    try {
      // Increment counter
      const current = await this.redis.incr(key);

      // Set expiration on first request
      if (current === 1) {
        await this.redis.expire(key, 60); // Expire after 1 minute
      }

      // Check against burst limit
      if (current > quota.burstSize) {
        console.warn(`⚠️  Rate limit (burst): ${appName} exceeded burst limit ${quota.burstSize}`);
        return false;
      }

      // Warn if approaching limit
      if (current > quota.reqPerMin * 0.8) {
        console.warn(`⚠️  Rate limit (warning): ${appName} at ${current}/${quota.reqPerMin} reqs/min`);
      }

      return true;
    } catch (error) {
      console.error('❌ Quota check failed:', error instanceof Error ? error.message : error);
      // Fail open: allow request if quota system fails
      return true;
    }
  }

  /**
   * Get current quota usage
   */
  async getQuotaUsage(appName: AppName): Promise<number> {
    const key = `quota:sheets:${appName}:${this.getCurrentMinute()}`;
    try {
      const count = await this.redis.get<number>(key);
      return count || 0;
    } catch (error) {
      console.error('❌ Failed to get quota usage:', error instanceof Error ? error.message : error);
      return 0;
    }
  }

  /**
   * Reset quota counter (admin use only)
   */
  async resetQuota(appName: AppName): Promise<void> {
    const key = `quota:sheets:${appName}:${this.getCurrentMinute()}`;
    try {
      await this.redis.del(key);
      console.log(`✅ Quota reset for ${appName}`);
    } catch (error) {
      console.error('❌ Failed to reset quota:', error instanceof Error ? error.message : error);
    }
  }

  /**
   * Get current minute timestamp for quota window
   */
  private getCurrentMinute(): string {
    const now = new Date();
    return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}-${String(now.getUTCHours()).padStart(2, '0')}-${String(now.getUTCMinutes()).padStart(2, '0')}`;
  }
}

/**
 * Create SheetsQuotaBudget from environment
 */
export function createSheetsQuotaBudget(): SheetsQuotaBudget {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!redisUrl || !redisToken) {
    throw new Error('Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN');
  }

  return new SheetsQuotaBudget(redisUrl, redisToken);
}
