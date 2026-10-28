import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

let limiter: Ratelimit | null | undefined;

function getLimiter() {
  if (limiter === undefined) {
    limiter =
      process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
        ? new Ratelimit({
            redis: Redis.fromEnv(),
            limiter: Ratelimit.slidingWindow(10, "60 s"),
            prefix: "yoofoon",
          })
        : null;
  }
  return limiter;
}

// Allows everything when Upstash isn't configured (local dev).
export async function checkRateLimit(key: string) {
  const l = getLimiter();
  if (!l) return true;
  const { success } = await l.limit(key);
  return success;
}
