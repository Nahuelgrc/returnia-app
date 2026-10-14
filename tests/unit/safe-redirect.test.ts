import { describe, expect, it } from "vitest";
import { getSafeCallbackUrl } from "@/lib/safe-redirect";

describe("getSafeCallbackUrl", () => {
  it.each([
    ["/dashboard", "/dashboard"],
    ["/dashboard?x=1#a", "/dashboard?x=1#a"],
    ["/", "/"],
  ])("acepta ruta relativa %s", (input, expected) => {
    expect(getSafeCallbackUrl(input)).toBe(expected);
  });

  it.each([
    null,
    undefined,
    "",
    "https://evil.com",
    "//evil.com",
    "///evil.com",
    "/\\evil.com",
    "dashboard",
    "javascript:alert(1)",
    "/foo\nbar",
    "/foo\u0000bar",
    "\\\\evil.com",
  ])("rejects %j and uses the fallback", (input) => {
    expect(getSafeCallbackUrl(input)).toBe("/dashboard");
  });

  it("respects a custom fallback", () => {
    expect(getSafeCallbackUrl("//x.com", "/login")).toBe("/login");
  });
});
