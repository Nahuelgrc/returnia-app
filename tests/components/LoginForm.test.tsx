import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mocks = vi.hoisted(() => ({
  signIn: vi.fn(),
  search: { value: "" },
}));

vi.mock("next-auth/react", () => ({ signIn: mocks.signIn }));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(mocks.search.value),
}));

import { LoginForm } from "@/components/auth/LoginForm";

const fill = async (email: string, password: string) => {
  const user = userEvent.setup();
  await user.type(screen.getByPlaceholderText("name@example.com"), email);
  await user.type(screen.getByPlaceholderText("Password"), password);
  await user.click(screen.getByRole("button", { name: /Log In with Email/ }));
};

beforeEach(() => {
  mocks.search.value = "";
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("LoginForm", () => {
  it("renders fields and sign-up link", () => {
    render(<LoginForm />);
    expect(screen.getByPlaceholderText("name@example.com")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Password")).toHaveAttribute("type", "password");
    expect(screen.getByRole("link", { name: "Sign Up" })).toHaveAttribute(
      "href",
      "/register",
    );
  });

  it("does not submit with empty fields", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);
    await user.click(screen.getByRole("button", { name: /Log In with Email/ }));
    expect(mocks.signIn).not.toHaveBeenCalled();
  });

  it("calls signIn with credentials and default callbackUrl", async () => {
    mocks.signIn.mockResolvedValue({ error: undefined });
    render(<LoginForm />);
    await fill("ana@example.com", "long-password-123");
    await waitFor(() => expect(mocks.signIn).toHaveBeenCalled());
    expect(mocks.signIn).toHaveBeenCalledWith("credentials", {
      email: "ana@example.com",
      password: "long-password-123",
      redirect: false,
      callbackUrl: "/dashboard",
    });
    await waitFor(() => expect(window.location.href).toBe("/dashboard"));
  });

  it("respects a relative callbackUrl", async () => {
    mocks.search.value = "callbackUrl=/dashboard%3Ftab%3D1";
    mocks.signIn.mockResolvedValue({});
    render(<LoginForm />);
    await fill("ana@example.com", "long-password-123");
    await waitFor(() => expect(mocks.signIn).toHaveBeenCalled());
    expect(mocks.signIn.mock.calls[0][1].callbackUrl).toBe("/dashboard?tab=1");
  });

  it.each(["//evil.com", "https://evil.com", "/\\evil.com"])(
    "discards dangerous callbackUrl %s",
    async (value) => {
      mocks.search.value = `callbackUrl=${encodeURIComponent(value)}`;
      mocks.signIn.mockResolvedValue({});
      render(<LoginForm />);
      await fill("ana@example.com", "long-password-123");
      await waitFor(() => expect(mocks.signIn).toHaveBeenCalled());
      expect(mocks.signIn.mock.calls[0][1].callbackUrl).toBe("/dashboard");
    },
  );

  it("shows invalid credentials", async () => {
    mocks.signIn.mockResolvedValue({ error: "CredentialsSignin", code: "credentials" });
    render(<LoginForm />);
    await fill("ana@example.com", "bad-password-123");
    expect(await screen.findByText("Invalid credentials")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Log In with Email/ })).toBeEnabled();
  });

  it("shows the rate limit message", async () => {
    mocks.signIn.mockResolvedValue({ error: "CredentialsSignin", code: "rate_limited" });
    render(<LoginForm />);
    await fill("ana@example.com", "bad-password-123");
    expect(
      await screen.findByText("Too many failed attempts. Try again in 15 minutes."),
    ).toBeInTheDocument();
  });

  it("shows a generic error if signIn throws", async () => {
    mocks.signIn.mockRejectedValue(new Error("network"));
    render(<LoginForm />);
    await fill("ana@example.com", "long-password-123");
    expect(
      await screen.findByText("Something went wrong. Please try again."),
    ).toBeInTheDocument();
  });
});
