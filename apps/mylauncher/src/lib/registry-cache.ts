import { Redis } from '@upstash/redis';

/**
 * Redis-based app registry cache
 * TTL: 1 hour (3600 seconds)
 */
export class RegistryCache {
  private redis: Redis;
  private readonly TTL = 3600; // 1 hour
  private readonly PREFIX = 'registry:';

  constructor() {
    this.redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL || '',
      token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
    });
  }

  /**
   * Get cached apps list
   */
  async get(key: string = 'apps'): Promise<unknown[] | null> {
    try {
      const cached = await this.redis.get(`${this.PREFIX}${key}`);
      if (!cached) return null;

      if (typeof cached === 'string') {
        return JSON.parse(cached);
      }
      return cached as unknown[];
    } catch (error) {
      console.warn('⚠️  Cache get error:', error);
      return null;
    }
  }

  /**
   * Set apps in cache
   */
  async set(apps: unknown[], key: string = 'apps'): Promise<boolean> {
    try {
      await this.redis.setex(
        `${this.PREFIX}${key}`,
        this.TTL,
        JSON.stringify(apps)
      );
      return true;
    } catch (error) {
      console.warn('⚠️  Cache set error:', error);
      return false;
    }
  }

  /**
   * Invalidate cache
   */
  async invalidate(key: string = 'apps'): Promise<boolean> {
    try {
      await this.redis.del(`${this.PREFIX}${key}`);
      return true;
    } catch (error) {
      console.warn('⚠️  Cache invalidate error:', error);
      return false;
    }
  }

  /**
   * Get TTL for a cached key
   */
  async ttl(key: string = 'apps'): Promise<number> {
    try {
      const result = await this.redis.ttl(`${this.PREFIX}${key}`);
      return result as number;
    } catch (error) {
      console.warn('⚠️  Cache ttl error:', error);
      return -1;
    }
  }
}

/**
 * Singleton instance
 */
let cache: RegistryCache | null = null;

export function getRegistryCache(): RegistryCache {
  if (!cache) {
    cache = new RegistryCache();
  }
  return cache;
}
