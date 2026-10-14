"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { getSafeCallbackUrl } from "@/lib/safe-redirect";
import { registerAction } from "@/app/actions/register";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function RegisterForm({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const searchParams = useSearchParams();
  const callbackUrl = getSafeCallbackUrl(searchParams.get("callbackUrl"));
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const name = formData.get("name") as string;
    // lastname is optional
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (password.length < 10) {
      setError("Password must be at least 10 characters");
      setIsLoading(false);
      return;
    }

    if (!name || !email || !password || !confirmPassword) {
      setError("All required fields must be filled in");
      setIsLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    try {
      // 1. Register User
      const result = await registerAction(formData);

      if (result?.error) {
        setError(result.error);
        setIsLoading(false);
        return;
      }

      // 2. Auto Login after Registration
      const loginResult = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl,
      });

      if (loginResult?.error) {
        // Should not happen if registration succeeded, but handle it
        setError("Account created, but automatic login failed.");
        setIsLoading(false);
        return;
      }

      window.location.href = callbackUrl;
    } catch {
      setError("Something went wrong. Please try again.");
      setIsLoading(false);
    }
  }

  return (
    <div className={`grid gap-6 ${className || ""}`} {...props}>
      <Card className="w-[350px] border-slate-800 bg-slate-950">
        <CardHeader>
          <CardTitle className="text-2xl font-bold tracking-tight text-white">
            Create Account
          </CardTitle>
          <CardDescription className="text-slate-400">
            Enter your email to create a new account
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <form onSubmit={onSubmit}>
            <div className="grid gap-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="grid gap-1">
                  <Input
                    id="name"
                    name="name"
                    placeholder="First name"
                    type="text"
                    autoCapitalize="words"
                    autoComplete="given-name"
                    disabled={isLoading}
                    required
                  />
                </div>
                <div className="grid gap-1">
                  <Input
                    id="lastname"
                    name="lastname"
                    placeholder="Last name (optional)"
                    type="text"
                    autoCapitalize="words"
                    autoComplete="family-name"
                    disabled={isLoading}
                  />
                </div>
              </div>
              <div className="grid gap-1">
                <Input
                  id="email"
                  name="email"
                  placeholder="name@example.com"
                  type="email"
                  autoCapitalize="none"
                  autoComplete="email"
                  autoCorrect="off"
                  disabled={isLoading}
                  required
                />
              </div>
              <div className="grid gap-1">
                <Input
                  id="password"
                  name="password"
                  placeholder="Password"
                  type="password"
                  autoCapitalize="none"
                  autoComplete="new-password"
                  disabled={isLoading}
                  required
                />
              </div>
              <div className="grid gap-1">
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  placeholder="Confirm Password"
                  type="password"
                  autoCapitalize="none"
                  autoComplete="new-password"
                  disabled={isLoading}
                  required
                />
              </div>
              {error && (
                <p className="text-sm font-medium text-red-500">{error}</p>
              )}
              <Button
                disabled={isLoading}
                className="mt-2 w-full cursor-pointer bg-indigo-600 hover:bg-indigo-700"
              >
                {isLoading && (
                  <svg
                    className="mr-2 h-4 w-4 animate-spin"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                )}
                Sign Up
              </Button>
            </div>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <div className="text-sm text-slate-400 text-center">
            Already have an account?{" "}
            <a
              href="/login"
              className="underline underline-offset-4 hover:text-indigo-400"
            >
              Log In
            </a>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
