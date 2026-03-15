"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";

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

export function LoginForm({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!email || !password) {
      setError("El correo y la contraseña son obligatorios");
      setIsLoading(false);
      return;
    }

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl,
      });

      if (result?.error) {
        setError("Credenciales inválidas");
        setIsLoading(false);
        return;
      }

      window.location.href = callbackUrl;
    } catch (error) {
      setError("Algo salió mal. Por favor intenta de nuevo.");
      setIsLoading(false);
    }
  }

  return (
    <div className={`grid gap-6 ${className || ""}`} {...props}>
      <Card className="w-[350px] border-slate-800 bg-slate-950">
        <CardHeader>
          <CardTitle className="text-2xl font-bold tracking-tight text-white">
            Iniciar Sesión
          </CardTitle>
          <CardDescription className="text-slate-400">
            Ingresa tu correo para acceder a tu cuenta
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <form onSubmit={onSubmit}>
            <div className="grid gap-2">
              <div className="grid gap-1">
                <Input
                  id="email"
                  name="email"
                  placeholder="nombre@ejemplo.com"
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
                  placeholder="Contraseña"
                  type="password"
                  autoCapitalize="none"
                  autoComplete="current-password"
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
                Ingresar con Correo
              </Button>
            </div>
          </form>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-800" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-slate-950 px-2 text-slate-400">
                O continuar con
              </span>
            </div>
          </div>
          <Button
            variant="outline"
            type="button"
            disabled={isLoading}
            onClick={async () => {
              setIsLoading(true);
              const result = await signIn("google", {
                redirect: false,
                callbackUrl: "/auth-callback",
              });

              if (result?.url) {
                const width = 500;
                const height = 600;
                const left = window.screen.width / 2 - width / 2;
                const top = window.screen.height / 2 - height / 2;

                const popup = window.open(
                  result.url,
                  "Google Login",
                  `width=${width},height=${height},top=${top},left=${left}`,
                );

                const interval = setInterval(() => {
                  if (popup?.closed) {
                    clearInterval(interval);
                    setIsLoading(false);
                  }
                }, 500);

                window.addEventListener("message", (event) => {
                  if (
                    event.origin === window.location.origin &&
                    event.data === "auth-success"
                  ) {
                    clearInterval(interval);
                    popup?.close();
                    window.location.href = callbackUrl;
                  }
                });
              } else {
                setIsLoading(false);
              }
            }}
            className="w-full cursor-pointer border-slate-800 text-white hover:bg-slate-900"
          >
            {isLoading ? (
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
            ) : (
              <svg
                className="mr-2 h-4 w-4"
                aria-hidden="true"
                focusable="false"
                data-prefix="fab"
                data-icon="google"
                role="img"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 488 512"
              >
                <path
                  fill="currentColor"
                  d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"
                ></path>
              </svg>
            )}
            Google
          </Button>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <div className="text-sm text-slate-400 text-center">
            ¿No tienes una cuenta?{" "}
            <a
              href="/register"
              className="underline underline-offset-4 hover:text-indigo-400"
            >
              Regístrate
            </a>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
