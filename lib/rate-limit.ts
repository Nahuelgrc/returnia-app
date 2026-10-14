const MAX_ENTRIES = 10_000;
const MAX_KEY_LENGTH = 200;

type Entry = { count: number; resetAt: number };

const globalForRateLimit = globalThis as unknown as {
  rateLimitStore?: Map<string, Entry>;
  rateLimitLastSweep?: number;
};

const store = (globalForRateLimit.rateLimitStore ??= new Map<string, Entry>());

function sweep(now: number) {
  if (now - (globalForRateLimit.rateLimitLastSweep ?? 0) < 60_000) return;
  globalForRateLimit.rateLimitLastSweep = now;
  for (const [key, entry] of store) {
    if (entry.resetAt <= now) store.delete(key);
  }
}

function normalizeKey(key: string) {
  return key.length > MAX_KEY_LENGTH ? key.slice(0, MAX_KEY_LENGTH) : key;
}

function makeRoom(now: number) {
  if (store.size < MAX_ENTRIES) return;
  for (const [key, entry] of store) {
    if (entry.resetAt <= now) store.delete(key);
  }
  for (const key of store.keys()) {
    if (store.size < MAX_ENTRIES) break;
    store.delete(key);
  }
}

export function rateLimit(rawKey: string, limit: number, windowMs: number) {
  const now = Date.now();
  const key = normalizeKey(rawKey);
  sweep(now);
  let entry = store.get(key);
  if (!entry || entry.resetAt <= now) {
    store.delete(key);
    makeRoom(now);
    entry = { count: 0, resetAt: now + windowMs };
    store.set(key, entry);
  }
  entry.count += 1;
  return {
    allowed: entry.count <= limit,
    retryAfterSeconds: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
  };
}

export function resetRateLimit(key: string) {
  store.delete(normalizeKey(key));
}

export function getClientIp(headers: Headers) {
  const ip =
    headers.get("x-vercel-forwarded-for") ||
    headers.get("x-real-ip") ||
    headers.get("x-forwarded-for")?.split(",")[0];
  return ip?.trim() || "unknown";
}
