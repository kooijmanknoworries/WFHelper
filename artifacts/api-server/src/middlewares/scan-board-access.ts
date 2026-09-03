import type { RequestHandler } from "express";

const DEVICE_ID_HEADER = "x-crosslex-device-id";
const DEVICE_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const WINDOW_MS = 60 * 60 * 1000;
const DEFAULT_DEVICE_LIMIT = 10;
const DEFAULT_IP_LIMIT = 30;

type Bucket = {
  startedAt: number;
  count: number;
};

type BucketState = {
  bucket: Bucket;
  remaining: number;
  resetAt: number;
};

const deviceBuckets = new Map<string, Bucket>();
const ipBuckets = new Map<string, Bucket>();
let requestCount = 0;

function readPositiveInteger(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

const deviceLimit = readPositiveInteger(
  "SCAN_RATE_LIMIT_PER_DEVICE",
  DEFAULT_DEVICE_LIMIT,
);
const ipLimit = readPositiveInteger("SCAN_RATE_LIMIT_PER_IP", DEFAULT_IP_LIMIT);

function getBucketState(
  buckets: Map<string, Bucket>,
  key: string,
  limit: number,
  now: number,
): BucketState {
  let bucket = buckets.get(key);
  if (!bucket || now - bucket.startedAt >= WINDOW_MS) {
    bucket = { startedAt: now, count: 0 };
    buckets.set(key, bucket);
  }

  return {
    bucket,
    remaining: Math.max(0, limit - bucket.count),
    resetAt: bucket.startedAt + WINDOW_MS,
  };
}

function pruneExpiredBuckets(now: number): void {
  for (const buckets of [deviceBuckets, ipBuckets]) {
    for (const [key, bucket] of buckets) {
      if (now - bucket.startedAt >= WINDOW_MS) {
        buckets.delete(key);
      }
    }
  }
}

function retryAfterSeconds(resetAt: number, now: number): number {
  return Math.max(1, Math.ceil((resetAt - now) / 1000));
}

function sendRateLimitResponse(
  req: Parameters<RequestHandler>[0],
  res: Parameters<RequestHandler>[1],
  retryAfter: number,
  resetAt: number,
): void {
  res
    .setHeader("Retry-After", String(retryAfter))
    .setHeader("RateLimit-Limit", String(Math.min(deviceLimit, ipLimit)))
    .setHeader("RateLimit-Remaining", "0")
    .setHeader("RateLimit-Reset", String(Math.ceil(resetAt / 1000)));
  req.log?.warn("Screenshot scan rate limit exceeded");
  res.status(429).json({
    error: `Scan limit reached. Please try again in ${retryAfter} seconds.`,
    retryAfterSeconds: retryAfter,
  });
}

export const scanBoardAccess: RequestHandler = (req, res, next): void => {
  const deviceId = req.get(DEVICE_ID_HEADER)?.trim();
  if (!deviceId || !DEVICE_ID_PATTERN.test(deviceId)) {
    res.status(401).json({
      error: "A valid device identifier is required to scan screenshots.",
    });
    return;
  }

  const now = Date.now();
  requestCount += 1;
  if (requestCount % 100 === 0) {
    pruneExpiredBuckets(now);
  }

  const clientIp = req.ip || req.socket.remoteAddress || "unknown";
  const deviceState = getBucketState(deviceBuckets, deviceId.toLowerCase(), deviceLimit, now);
  const ipState = getBucketState(ipBuckets, clientIp, ipLimit, now);

  if (deviceState.remaining === 0 || ipState.remaining === 0) {
    const resetAt = Math.max(
      deviceState.remaining === 0 ? deviceState.resetAt : 0,
      ipState.remaining === 0 ? ipState.resetAt : 0,
    );
    sendRateLimitResponse(req, res, retryAfterSeconds(resetAt, now), resetAt);
    return;
  }

  deviceState.bucket.count += 1;
  ipState.bucket.count += 1;
  const remaining = Math.min(
    deviceLimit - deviceState.bucket.count,
    ipLimit - ipState.bucket.count,
  );
  res
    .setHeader("RateLimit-Limit", String(Math.min(deviceLimit, ipLimit)))
    .setHeader("RateLimit-Remaining", String(Math.max(0, remaining)))
    .setHeader(
      "RateLimit-Reset",
      String(Math.ceil(Math.max(deviceState.resetAt, ipState.resetAt) / 1000)),
    );
  next();
};