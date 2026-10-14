import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type Mod = typeof import("@/lib/rate-limit");

const g = globalThis as unknown as {
  rateLimitStore?: Map<string, unknown>;
  rateLimitLastSweep?: number;
};

let mod: Mod;

beforeEach(async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2024-01-01T00:00:00Z"));
  delete g.rateLimitStore;
  delete g.rateLimitLastSweep;
  vi.resetModules();
  mod = await import("@/lib/rate-limit");
});

afterEach(() => {
  vi.useRealTimers();
});

describe("rateLimit", () => {
  it("allows up to the limit and blocks afterwards", () => {
    for (let i = 0; i < 3; i++) {
      expect(mod.rateLimit("k", 3, 1000).allowed).toBe(true);
    }
    expect(mod.rateLimit("k", 3, 1000).allowed).toBe(false);
  });

  it("counts per key independently", () => {
    mod.rateLimit("a", 1, 1000);
    expect(mod.rateLimit("a", 1, 1000).allowed).toBe(false);
    expect(mod.rateLimit("b", 1, 1000).allowed).toBe(true);
  });

  it("the window expires and resets the counter", () => {
    mod.rateLimit("k", 1, 1000);
    expect(mod.rateLimit("k", 1, 1000).allowed).toBe(false);
    vi.advanceTimersByTime(1001);
    expect(mod.rateLimit("k", 1, 1000).allowed).toBe(true);
  });

  it("does not reset within the window", () => {
    mod.rateLimit("k", 1, 1000);
    vi.advanceTimersByTime(999);
    expect(mod.rateLimit("k", 1, 1000).allowed).toBe(false);
  });

  it("reports retryAfterSeconds rounded up and at least 1", () => {
    expect(mod.rateLimit("k", 1, 1500).retryAfterSeconds).toBe(2);
    vi.advanceTimersByTime(1400);
    expect(mod.rateLimit("k", 1, 1500).retryAfterSeconds).toBe(1);
    expect(mod.rateLimit("z", 1, 1).retryAfterSeconds).toBe(1);
  });

  it("resetRateLimit releases the key", () => {
    mod.rateLimit("k", 1, 1000);
    expect(mod.rateLimit("k", 1, 1000).allowed).toBe(false);
    mod.resetRateLimit("k");
    expect(mod.rateLimit("k", 1, 1000).allowed).toBe(true);
  });

  it("truncates long keys to 200 characters", () => {
    const base = "x".repeat(200);
    mod.rateLimit(`${base}1`, 1, 1000);
    expect(mod.rateLimit(`${base}2`, 1, 1000).allowed).toBe(false);
  });

  it("resetRateLimit also normalizes long keys", () => {
    const base = "x".repeat(200);
    mod.rateLimit(`${base}1`, 1, 1000);
    mod.resetRateLimit(`${base}2`);
    expect(mod.rateLimit(`${base}3`, 1, 1000).allowed).toBe(true);
  });

  it("limits the store size to 10000 entries", () => {
    for (let i = 0; i < 10_000; i++) mod.rateLimit(`k${i}`, 5, 60_000);
    expect(g.rateLimitStore?.size).toBe(10_000);
    mod.rateLimit("fresh", 5, 60_000);
    expect(g.rateLimitStore?.size).toBe(10_000);
    expect(g.rateLimitStore?.has("fresh")).toBe(true);
    expect(g.rateLimitStore?.has("k0")).toBe(false);
  });

  it("when full it prefers to discard expired entries", () => {
    for (let i = 0; i < 5_000; i++) mod.rateLimit(`short${i}`, 5, 1000);
    for (let i = 0; i < 5_000; i++) mod.rateLimit(`long${i}`, 5, 600_000);
    vi.advanceTimersByTime(1001);
    mod.rateLimit("fresh", 5, 600_000);
    expect(g.rateLimitStore?.has("long0")).toBe(true);
    expect(g.rateLimitStore?.has("short0")).toBe(false);
  });

  it("sweeps expired entries every 60 seconds", () => {
    mod.rateLimit("viejo", 5, 1000);
    vi.advanceTimersByTime(61_000);
    mod.rateLimit("other", 5, 1000);
    expect(g.rateLimitStore?.has("viejo")).toBe(false);
    expect(g.rateLimitStore?.has("other")).toBe(true);
  });
});

describe("getClientIp", () => {
  it("prioritizes x-vercel-forwarded-for", () => {
    const h = new Headers({
      "x-vercel-forwarded-for": "1.1.1.1",
      "x-real-ip": "2.2.2.2",
      "x-forwarded-for": "3.3.3.3",
    });
    expect(mod.getClientIp(h)).toBe("1.1.1.1");
  });

  it("then x-real-ip", () => {
    const h = new Headers({ "x-real-ip": "2.2.2.2", "x-forwarded-for": "3.3.3.3" });
    expect(mod.getClientIp(h)).toBe("2.2.2.2");
  });

  it("takes the first IP from x-forwarded-for", () => {
    expect(mod.getClientIp(new Headers({ "x-forwarded-for": " 3.3.3.3 , 4.4.4.4" }))).toBe(
      "3.3.3.3",
    );
  });

  it("returns unknown without headers", () => {
    expect(mod.getClientIp(new Headers())).toBe("unknown");
  });
});
