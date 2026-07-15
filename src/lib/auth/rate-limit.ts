type Bucket = { count: number; resetAt: number };

export interface RateLimitConfig {
  windowMs: number;
  maxAttempts: number;
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfter?: number;
  remaining?: number;
}

export function createRateLimiter(config: RateLimitConfig) {
  const buckets = new Map<string, Bucket>();

  return function check(key: string): RateLimitResult {
    const now = Date.now();
    const bucket = buckets.get(key);

    if (!bucket || now > bucket.resetAt) {
      buckets.set(key, { count: 1, resetAt: now + config.windowMs });
      return { allowed: true, remaining: config.maxAttempts - 1 };
    }

    if (bucket.count < config.maxAttempts) {
      bucket.count += 1;
      return { allowed: true, remaining: config.maxAttempts - bucket.count };
    }

    return {
      allowed: false,
      retryAfter: Math.ceil((bucket.resetAt - now) / 1000),
    };
  };
}

export function getClientIp(request: Request): string {
  const xff = (request.headers as Headers).get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  const realIp = (request.headers as Headers).get('x-real-ip');
  if (realIp) return realIp.trim();
  return 'unknown';
}
