import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mocks = vi.hoisted(() => ({
  signIn: vi.fn(),
  registerAction: vi.fn(),
  search: { value: "" },
}));

vi.mock("next-auth/react", () => ({ signIn: mocks.signIn }));
vi.mock("@/app/actions/register", () => ({ registerAction: mocks.registerAction }));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(mocks.search.value),
}));

import { RegisterForm } from "@/components/auth/RegisterForm";

const fill = async (password: string, confirm: string) => {
  const user = userEvent.setup();
  await user.type(screen.getByPlaceholderText("First name"), "Ana");
  await user.type(screen.getByPlaceholderText("name@example.com"), "ana@example.com");
  await user.type(screen.getByPlaceholderText("Password"), password);
  await user.type(screen.getByPlaceholderText("Confirm Password"), confirm);
  await user.click(screen.getByRole("button", { name: "Sign Up" }));
};

beforeEach(() => {
  mocks.search.value = "";
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("RegisterForm", () => {
  it("rejects short passwords without calling the server", async () => {
    render(<RegisterForm />);
    await fill("short123", "short123");
    expect(
      await screen.findByText("Password must be at least 10 characters"),
    ).toBeInTheDocument();
    expect(mocks.registerAction).not.toHaveBeenCalled();
  });

  it("rejects passwords that do not match", async () => {
    render(<RegisterForm />);
    await fill("long-password-123", "long-password-124");
    expect(await screen.findByText("Passwords do not match")).toBeInTheDocument();
    expect(mocks.registerAction).not.toHaveBeenCalled();
  });

  it("shows the server error, including the rate limit", async () => {
    mocks.registerAction.mockResolvedValue({
      error: "Too many sign-ups from this network. Try again later.",
    });
    render(<RegisterForm />);
    await fill("long-password-123", "long-password-123");
    expect(
      await screen.findByText("Too many sign-ups from this network. Try again later."),
    ).toBeInTheDocument();
    expect(mocks.signIn).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Sign Up" })).toBeEnabled();
  });

  it("shows duplicate email", async () => {
    mocks.registerAction.mockResolvedValue({ error: "Email is already registered" });
    render(<RegisterForm />);
    await fill("long-password-123", "long-password-123");
    expect(await screen.findByText("Email is already registered")).toBeInTheDocument();
  });

  it("after signing up logs in with a safe callbackUrl", async () => {
    mocks.search.value = `callbackUrl=${encodeURIComponent("//evil.com")}`;
    mocks.registerAction.mockResolvedValue({ success: true });
    mocks.signIn.mockResolvedValue({});
    render(<RegisterForm />);
    await fill("long-password-123", "long-password-123");
    await waitFor(() => expect(mocks.signIn).toHaveBeenCalled());
    expect(mocks.signIn).toHaveBeenCalledWith("credentials", {
      email: "ana@example.com",
      password: "long-password-123",
      redirect: false,
      callbackUrl: "/dashboard",
    });
  });

  it("warns if automatic login fails", async () => {
    mocks.registerAction.mockResolvedValue({ success: true });
    mocks.signIn.mockResolvedValue({ error: "CredentialsSignin" });
    render(<RegisterForm />);
    await fill("long-password-123", "long-password-123");
    expect(
      await screen.findByText("Account created, but automatic login failed."),
    ).toBeInTheDocument();
  });

  it("shows a generic error if the action throws", async () => {
    mocks.registerAction.mockRejectedValue(new Error("boom"));
    render(<RegisterForm />);
    await fill("long-password-123", "long-password-123");
    expect(
      await screen.findByText("Something went wrong. Please try again."),
    ).toBeInTheDocument();
  });
});
