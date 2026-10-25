import { Redis } from '@upstash/redis';

export interface RateLimitConfig {
  maxRequests: number; // Requests per window
  windowMs: number; // Window in milliseconds
}

/**
 * Rate limiter using Upstash Redis
 */
export class UpstashRateLimiter {
  private redis: Redis;
  private config: RateLimitConfig;

  constructor(redis: Redis, config: RateLimitConfig) {
    this.redis = redis;
    this.config = config;
  }

  /**
   * Check if request is allowed
   * @param identifier - Unique identifier (e.g., IP, user ID, API key)
   * @returns true if allowed, false if rate limited
   */
  async isAllowed(identifier: string): Promise<boolean> {
    const key = `ratelimit:${identifier}`;

    try {
      const current = await this.redis.incr(key);

      // Set expiration on first request
      if (current === 1) {
        await this.redis.pexpire(key, this.config.windowMs);
      }

      return current <= this.config.maxRequests;
    } catch (error) {
      console.error('❌ Rate limit check failed:', error);
      // Fail open: allow if system fails
      return true;
    }
  }

  /**
   * Get remaining requests in current window
   */
  async getRemaining(identifier: string): Promise<number> {
    const key = `ratelimit:${identifier}`;

    try {
      const current = await this.redis.get<number>(key);
      const remaining = Math.max(0, this.config.maxRequests - (current || 0));
      return remaining;
    } catch (error) {
      console.error('❌ Failed to get remaining:', error);
      return this.config.maxRequests;
    }
  }

  /**
   * Reset counter for identifier
   */
  async reset(identifier: string): Promise<void> {
    const key = `ratelimit:${identifier}`;

    try {
      await this.redis.del(key);
    } catch (error) {
      console.error('❌ Failed to reset rate limit:', error);
    }
  }
}

/**
 * Create rate limiter from environment
 */
export function createRateLimiter(
  redisUrl: string,
  redisToken: string,
  maxRequests: number = 100,
  windowMs: number = 60000 // 1 minute default
): UpstashRateLimiter {
  const redis = new Redis({
    url: redisUrl,
    token: redisToken,
  });

  return new UpstashRateLimiter(redis, {
    maxRequests,
    windowMs,
  });
}
