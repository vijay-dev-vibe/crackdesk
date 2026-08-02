// api/_rateLimit.ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import type { VercelRequest, VercelResponse } from "@vercel/node";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// 10 requests per user per minute — generous for normal use,
// tight enough to stop loops/abuse.
const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(2, "60 s"),
  analytics: true,
  prefix: "mapreducer-ai",
});

/**
 * Checks the rate limit for a given identifier (usually the user's id).
 * If the limit is exceeded, sends a 429 response and returns false —
 * the caller should stop processing when this returns false.
 * Returns true if the request is allowed to proceed.
 */
export async function checkRateLimit(
  identifier: string,
  res: VercelResponse
): Promise<boolean> {
  try {
    const { success, limit, remaining, reset } = await ratelimit.limit(identifier);

    res.setHeader("X-RateLimit-Limit", limit.toString());
    res.setHeader("X-RateLimit-Remaining", remaining.toString());

    if (!success) {
      const retryAfterSec = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
      res.setHeader("Retry-After", retryAfterSec.toString());
      res.status(429).json({
        error: `Too many requests. Please wait ${retryAfterSec}s and try again.`,
      });
      return false;
    }

    return true;
  } catch (err) {
    // If Upstash itself is down/misconfigured, fail OPEN (allow the request)
    // rather than breaking the whole app — log it so it's noticed.
    console.error("[rateLimit] Upstash error, allowing request:", err);
    return true;
  }
}