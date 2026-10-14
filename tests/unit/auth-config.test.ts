import { describe, expect, it } from "vitest";
import { authConfig } from "@/auth.config";

const authorized = (path: string, loggedIn: boolean) =>
  authConfig.callbacks.authorized({
    auth: loggedIn ? ({ user: { id: "u1" } } as never) : null,
    request: { nextUrl: new URL(`http://localhost${path}`) } as never,
  }) as boolean | Response;

const location = (r: boolean | Response) => (r as Response).headers.get("location");

describe("authConfig.authorized", () => {
  it("blocks /dashboard without a session", () => {
    expect(authorized("/dashboard", false)).toBe(false);
  });

  it("blocks /dashboard subroutes without a session", () => {
    expect(authorized("/dashboard/x", false)).toBe(false);
  });

  it("allows /dashboard with a session", () => {
    expect(authorized("/dashboard", true)).toBe(true);
  });

  it("redirects /login to /dashboard with a session", () => {
    expect(location(authorized("/login", true))).toBe("http://localhost/dashboard");
  });

  it("allows /login and /register without a session", () => {
    expect(authorized("/login", false)).toBe(true);
    expect(authorized("/register", false)).toBe(true);
  });

  it("the root redirects depending on the session", () => {
    expect(location(authorized("/", true))).toBe("http://localhost/dashboard");
    expect(location(authorized("/", false))).toBe("http://localhost/login");
  });
});

describe("authConfig session and jwt", () => {
  it("jwt copies the user id to sub", async () => {
    const token = await authConfig.callbacks.jwt({
      token: {},
      user: { id: "u1" },
    } as never);
    expect(token.sub).toBe("u1");
  });

  it("jwt keeps the token without a user", async () => {
    const token = await authConfig.callbacks.jwt({ token: { sub: "u2" } } as never);
    expect(token.sub).toBe("u2");
  });

  it("session exposes the id from token.sub", async () => {
    const session = await authConfig.callbacks.session({
      session: { user: {} },
      token: { sub: "u3" },
    } as never);
    expect((session.user as { id: string }).id).toBe("u3");
  });

  it("session without token.sub does not add an id", async () => {
    const session = await authConfig.callbacks.session({
      session: { user: {} },
      token: {},
    } as never);
    expect((session.user as { id?: string }).id).toBeUndefined();
  });

  it("defines session maxAge and login page", () => {
    expect(authConfig.session.maxAge).toBe(604800);
    expect(authConfig.pages.signIn).toBe("/login");
  });
});
