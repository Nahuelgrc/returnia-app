import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import bcrypt from "bcryptjs";

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  config: { value: undefined as unknown },
}));

vi.mock("next-auth", () => ({
  default: (config: unknown) => {
    mocks.config.value = config;
    return { handlers: {}, signIn: vi.fn(), signOut: vi.fn(), auth: vi.fn() };
  },
  CredentialsSignin: class CredentialsSignin extends Error {
    code = "credentials";
  },
}));
vi.mock("next-auth/providers/credentials", () => ({
  default: (options: unknown) => options,
}));
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-real-ip": "7.7.7.7" }),
}));
vi.mock("@/lib/db", () => ({ prisma: { user: { findUnique: mocks.findUnique } } }));

type Authorize = (
  credentials: Record<string, unknown> | undefined,
  request?: { headers: Headers },
) => Promise<unknown>;

let authorize: Authorize;
let hash: string;
let counter = 0;
let ip = "";

const req = () => ({ headers: new Headers({ "x-real-ip": ip }) });
const login = (email: string, password: string) =>
  authorize({ email, password }, req());

beforeAll(async () => {
  hash = await bcrypt.hash("correct-password-1", 4);
  await import("@/auth");
  const config = mocks.config.value as {
    secret: string;
    providers: { authorize: Authorize }[];
  };
  authorize = config.providers[0].authorize;
});

beforeEach(() => {
  counter += 1;
  ip = `20.0.0.${counter}`;
  mocks.findUnique.mockResolvedValue({
    id: "u1",
    email: "ana@example.com",
    name: "Ana",
    passwordHash: hash,
  });
});

describe("authorize", () => {
  it("uses AUTH_SECRET from the environment", () => {
    expect((mocks.config.value as { secret: string }).secret).toBe("unit-test-secret");
  });

  it("returns the user with correct credentials and normalizes the email", async () => {
    const user = await login(" Ana@Example.com ", "correct-password-1");
    expect(user).toEqual({ id: "u1", email: "ana@example.com", name: "Ana" });
    expect(mocks.findUnique).toHaveBeenCalledWith({ where: { email: "ana@example.com" } });
  });

  it("does not expose the password hash", async () => {
    const user = (await login("ana@example.com", "correct-password-1")) as object;
    expect(user).not.toHaveProperty("passwordHash");
  });

  it("returns null with an incorrect password", async () => {
    expect(await login("ana@example.com", "other-password")).toBeNull();
  });

  it("returns null and still runs bcrypt if the user does not exist", async () => {
    mocks.findUnique.mockResolvedValue(null);
    const compare = vi.spyOn(bcrypt, "compare");
    expect(await login("nobody@example.com", "correct-password-1")).toBeNull();
    expect(compare).toHaveBeenCalledTimes(1);
    expect(compare.mock.calls[0][1]).toMatch(/^\$2[aby]\$12\$/);
  });

  it.each([
    [undefined, undefined],
    ["", "x"],
    ["not-an-email", "x"],
    ["ana@example.com", ""],
    ["ana@example.com", "a".repeat(73)],
  ])("returns null with invalid credentials %j %j", async (email, password) => {
    expect(await authorize({ email, password }, req())).toBeNull();
    expect(mocks.findUnique).not.toHaveBeenCalled();
  });

  it("returns null without credentials", async () => {
    expect(await authorize(undefined, req())).toBeNull();
  });

  it("blocks after 15 failed attempts with rate_limited", async () => {
    for (let i = 0; i < 15; i++) {
      expect(await login("ana@example.com", "mala")).toBeNull();
    }
    await expect(login("ana@example.com", "correct-password-1")).rejects.toMatchObject({
      code: "rate_limited",
    });
  });

  it("the IP block applies to other emails from the same IP", async () => {
    for (let i = 0; i < 15; i++) await login(`u${i}@example.com`, "mala");
    await expect(login("other@example.com", "x")).rejects.toMatchObject({
      code: "rate_limited",
    });
  });

  it("another IP is not blocked", async () => {
    for (let i = 0; i < 16; i++) await login("ana@example.com", "mala").catch(() => null);
    ip = "30.30.30.30";
    expect(await login("ana@example.com", "correct-password-1")).toMatchObject({ id: "u1" });
  });

  it("a successful login resets the counters", async () => {
    for (let i = 0; i < 10; i++) await login("ana@example.com", "mala");
    await login("ana@example.com", "correct-password-1");
    for (let i = 0; i < 15; i++) {
      expect(await login("ana@example.com", "mala")).toBeNull();
    }
  });

  it("uses headers from next/headers when there is no request", async () => {
    const user = await authorize({ email: "ana@example.com", password: "correct-password-1" });
    expect(user).toMatchObject({ id: "u1" });
  });
});
