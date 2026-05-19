import { Redis } from "@upstash/redis";

type RateLimitConfig = {
  windowMs: number;
  maxRequests: number;
};

export const rateLimitConfigs = {
  createPost: { windowMs: 5 * 60 * 1000, maxRequests: 10 },
  createComment: { windowMs: 5 * 60 * 1000, maxRequests: 20 },
  commentOnPhoto: { windowMs: 5 * 60 * 1000, maxRequests: 20 },
  toggleLike: { windowMs: 60 * 1000, maxRequests: 60 },
  sendMessage: { windowMs: 5 * 60 * 1000, maxRequests: 30 },
  friendRequest: { windowMs: 60 * 60 * 1000, maxRequests: 20 },
  reportContent: { windowMs: 60 * 60 * 1000, maxRequests: 5 },
  createEvent: { windowMs: 60 * 60 * 1000, maxRequests: 5 },
  createCalendarEntry: { windowMs: 60 * 60 * 1000, maxRequests: 10 },
  uploadPhoto: { windowMs: 60 * 60 * 1000, maxRequests: 20 },
  suggestLibraryResource: { windowMs: 60 * 60 * 1000, maxRequests: 10 },
  requestLibraryBook: { windowMs: 60 * 60 * 1000, maxRequests: 10 },
  uploadStudyMaterial: { windowMs: 60 * 60 * 1000, maxRequests: 20 },
  requestStudyMaterial: { windowMs: 60 * 60 * 1000, maxRequests: 10 },
  requestPasswordReset: { windowMs: 60 * 60 * 1000, maxRequests: 3 },
  login: { windowMs: 15 * 60 * 1000, maxRequests: 10 },
  register: { windowMs: 60 * 60 * 1000, maxRequests: 5 },
};

type RateLimitStore = {
  [key: string]: { count: number; resetTime: number };
};

let redis: Redis | null = null;
let inMemoryStore: RateLimitStore = {};
let inMemoryCleanupInterval: ReturnType<typeof setInterval> | null = null;

function getRedis(): Redis | null {
  if (redis) return redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  redis = new Redis({ url, token });
  return redis;
}

function cleanupInMemoryStore() {
  const now = Date.now();
  for (const key of Object.keys(inMemoryStore)) {
    if (inMemoryStore[key].resetTime < now) {
      delete inMemoryStore[key];
    }
  }
}

function ensureInMemoryCleanup() {
  if (inMemoryCleanupInterval) return;
  inMemoryCleanupInterval = setInterval(cleanupInMemoryStore, 5 * 60 * 1000);
  if (inMemoryCleanupInterval.unref) inMemoryCleanupInterval.unref();
}

async function checkRedisRateLimit(
  key: string,
  config: RateLimitConfig
): Promise<{ allowed: boolean; resetTime?: number; remaining?: number }> {
  const r = getRedis()!;
  const now = Date.now();
  const windowStart = now - (now % config.windowMs);
  const redisKey = `rl:${key}:${windowStart}`;

  try {
    const count = await r.incr(redisKey);
    if (count === 1) {
      await r.expire(redisKey, Math.ceil(config.windowMs / 1000) + 1);
    }
    const remaining = Math.max(0, config.maxRequests - count);
    const resetTime = windowStart + config.windowMs;

    if (count > config.maxRequests) {
      return { allowed: false, resetTime, remaining: 0 };
    }
    return { allowed: true, resetTime, remaining };
  } catch (err) {
    console.error("[rate-limit] Redis error, falling back to in-memory:", err);
    return checkInMemoryRateLimit(key, config);
  }
}

function checkInMemoryRateLimit(
  key: string,
  config: RateLimitConfig
): { allowed: boolean; resetTime?: number; remaining?: number } {
  ensureInMemoryCleanup();
  const now = Date.now();

  if (!inMemoryStore[key] || inMemoryStore[key].resetTime < now) {
    inMemoryStore[key] = { count: 1, resetTime: now + config.windowMs };
    return { allowed: true, remaining: config.maxRequests - 1 };
  }

  const entry = inMemoryStore[key];
  if (entry.count >= config.maxRequests) {
    return { allowed: false, resetTime: entry.resetTime, remaining: 0 };
  }

  entry.count++;
  return { allowed: true, remaining: config.maxRequests - entry.count };
}

export function checkRateLimit(
  userId: string,
  action: keyof typeof rateLimitConfigs
): { allowed: boolean; resetTime?: number; remaining?: number } {
  const config = rateLimitConfigs[action];
  const key = `${userId}:${action}`;

  if (getRedis()) {
    return checkInMemoryRateLimit(key, config);
  }
  return checkInMemoryRateLimit(key, config);
}

export async function checkRateLimitAsync(
  userId: string,
  action: keyof typeof rateLimitConfigs
): Promise<{ allowed: boolean; resetTime?: number; remaining?: number }> {
  const config = rateLimitConfigs[action];
  const key = `${userId}:${action}`;

  if (getRedis()) {
    return checkRedisRateLimit(key, config);
  }
  return checkInMemoryRateLimit(key, config);
}

export function getRateLimitError(resetTime: number): string {
  const waitSeconds = Math.ceil((resetTime - Date.now()) / 1000);
  const minutes = Math.floor(waitSeconds / 60);
  const seconds = waitSeconds % 60;

  if (minutes > 0) {
    return `Rate limit exceeded. Please try again in ${minutes}m ${seconds}s`;
  }
  return `Rate limit exceeded. Please try again in ${seconds}s`;
}
