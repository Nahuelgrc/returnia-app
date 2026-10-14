import { beforeEach, describe, expect, it, vi } from "vitest";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  create: vi.fn(),
  ip: { value: "10.0.0.1" },
}));

vi.mock("@/lib/db", () => ({
  prisma: { user: { findUnique: mocks.findUnique, create: mocks.create } },
}));
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-real-ip": mocks.ip.value }),
}));

import { registerAction } from "@/app/actions/register";

let counter = 0;

const form = (fields: Record<string, string | undefined>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) if (v !== undefined) fd.set(k, v);
  return fd;
};

const validFields = {
  name: "Ana",
  lastname: "Smith",
  email: "Ana@Example.com",
  password: "a-long-password-123",
};

beforeEach(() => {
  counter += 1;
  mocks.ip.value = `10.0.0.${counter}`;
  mocks.findUnique.mockResolvedValue(null);
  mocks.create.mockResolvedValue({ id: "u1" });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("registerAction", () => {
  it("registers a valid user with normalized email and full name", async () => {
    const result = await registerAction(form(validFields));
    expect(result).toEqual({ success: true });
    expect(mocks.findUnique).toHaveBeenCalledWith({ where: { email: "ana@example.com" } });
    const data = mocks.create.mock.calls[0][0].data;
    expect(data.email).toBe("ana@example.com");
    expect(data.name).toBe("Ana Smith");
  });

  it("without a last name uses only the first name", async () => {
    await registerAction(form({ ...validFields, lastname: undefined }));
    expect(mocks.create.mock.calls[0][0].data.name).toBe("Ana");
  });

  it("stores a cost 12 bcrypt hash and not the password", async () => {
    await registerAction(form(validFields));
    const { passwordHash } = mocks.create.mock.calls[0][0].data;
    expect(passwordHash).not.toBe(validFields.password);
    expect(passwordHash).toMatch(/^\$2[aby]\$12\$/);
    expect(await bcrypt.compare(validFields.password, passwordHash)).toBe(true);
  });

  it.each([
    ["empty name", { name: "" }, "Name is required"],
    ["missing name", { name: undefined }, undefined],
    ["invalid email", { email: "not-an-email" }, "Email is not valid"],
    ["missing email", { email: undefined }, undefined],
    ["short password", { password: "short123" }, "Password must be at least 10 characters"],
    [
      "password over 72 bytes",
      { password: "\u00e9".repeat(37) },
      "Password cannot exceed 72 bytes",
    ],
    ["name too long", { name: "a".repeat(101) }, undefined],
    ["email too long", { email: `${"a".repeat(250)}@x.com` }, undefined],
  ])("rejects %s", async (_n, patch, message) => {
    const result = await registerAction(form({ ...validFields, ...patch }));
    expect(result.error).toBeTruthy();
    if (message) expect(result.error).toBe(message);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("accepts a password of exactly 72 bytes", async () => {
    const result = await registerAction(form({ ...validFields, password: "a".repeat(72) }));
    expect(result).toEqual({ success: true });
  });

  it("rejects an already registered email", async () => {
    mocks.findUnique.mockResolvedValue({ id: "existente" });
    const result = await registerAction(form(validFields));
    expect(result).toEqual({ error: "Email is already registered" });
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("translates a race-condition P2002 to duplicate email", async () => {
    mocks.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("dup", {
        code: "P2002",
        clientVersion: "test",
      }),
    );
    const result = await registerAction(form(validFields));
    expect(result).toEqual({ error: "Email is already registered" });
  });

  it("returns a generic error on unexpected failures", async () => {
    mocks.create.mockRejectedValue(new Error("db password leaked"));
    const result = await registerAction(form(validFields));
    expect(result).toEqual({ error: "Error creating the account. Please try again." });
    expect(console.error).toHaveBeenCalled();
  });

  it("applies a rate limit of 3 sign-ups per IP", async () => {
    for (let i = 0; i < 3; i++) {
      expect(await registerAction(form(validFields))).toEqual({ success: true });
    }
    const result = await registerAction(form(validFields));
    expect(result).toEqual({
      error: "Too many sign-ups from this network. Try again later.",
    });
    expect(mocks.create).toHaveBeenCalledTimes(3);
  });

  it("the rate limit is per IP", async () => {
    for (let i = 0; i < 4; i++) await registerAction(form(validFields));
    mocks.ip.value = "99.99.99.99";
    expect(await registerAction(form(validFields))).toEqual({ success: true });
  });
});
