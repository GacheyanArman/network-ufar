import { NextResponse } from "next/server";

type RateLimitStore = {
  [key: string]: {
    count: number;
    resetTime: number;
  };
};

const rateLimitStore: RateLimitStore = {};

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  Object.keys(rateLimitStore).forEach((key) => {
    if (rateLimitStore[key].resetTime < now) {
      delete rateLimitStore[key];
    }
  });
}, 5 * 60 * 1000);

export type RateLimitConfig = {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
};

export const rateLimitConfigs = {
  // Posts: 10 per 5 minutes
  createPost: { windowMs: 5 * 60 * 1000, maxRequests: 10 },

  // Comments: 20 per 5 minutes
  createComment: { windowMs: 5 * 60 * 1000, maxRequests: 20 },

  // Likes: 60 per minute
  toggleLike: { windowMs: 60 * 1000, maxRequests: 60 },

  // Messages: 30 per 5 minutes
  sendMessage: { windowMs: 5 * 60 * 1000, maxRequests: 30 },

  // Friend requests: 20 per hour
  friendRequest: { windowMs: 60 * 60 * 1000, maxRequests: 20 },

  // Reports: 5 per hour
  reportContent: { windowMs: 60 * 60 * 1000, maxRequests: 5 },

  // Events: 5 per hour
  createEvent: { windowMs: 60 * 60 * 1000, maxRequests: 5 },

  // Calendar entries: 10 per hour
  createCalendarEntry: { windowMs: 60 * 60 * 1000, maxRequests: 10 },

  // Photo uploads: 20 per hour
  uploadPhoto: { windowMs: 60 * 60 * 1000, maxRequests: 20 },

  // Library suggestions: 10 per hour
  suggestLibraryResource: { windowMs: 60 * 60 * 1000, maxRequests: 10 },

  // Library book requests: 10 per hour
  requestLibraryBook: { windowMs: 60 * 60 * 1000, maxRequests: 10 },

  // Study materials uploads: 20 per hour
  uploadStudyMaterial: { windowMs: 60 * 60 * 1000, maxRequests: 20 },

  // Study material requests: 10 per hour
  requestStudyMaterial: { windowMs: 60 * 60 * 1000, maxRequests: 10 },
};

export function checkRateLimit(
  userId: string,
  action: keyof typeof rateLimitConfigs
): { allowed: boolean; resetTime?: number; remaining?: number } {
  const config = rateLimitConfigs[action];
  const key = `${userId}:${action}`;
  const now = Date.now();

  if (!rateLimitStore[key] || rateLimitStore[key].resetTime < now) {
    // Create new window
    rateLimitStore[key] = {
      count: 1,
      resetTime: now + config.windowMs,
    };
    return { allowed: true, remaining: config.maxRequests - 1 };
  }

  const entry = rateLimitStore[key];

  if (entry.count >= config.maxRequests) {
    return {
      allowed: false,
      resetTime: entry.resetTime,
      remaining: 0,
    };
  }

  entry.count++;
  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
  };
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
