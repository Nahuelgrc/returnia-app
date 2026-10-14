import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { headers as nextHeaders } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { authConfig } from "./auth.config";
import { getClientIp, rateLimit, resetRateLimit } from "@/lib/rate-limit";

class RateLimitedError extends CredentialsSignin {
  code = "rate_limited";
}

const LOGIN_LIMIT = 15;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const DUMMY_HASH =
  "$2b$12$YsIonCHAYzakUEgvUOdhwekQ3HtzzsEcGECbU7WeQbG2O0E9GtzNq";

const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).refine((p) => Buffer.byteLength(p) <= 72),
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  secret: process.env.AUTH_SECRET,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials, request) => {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        const ip = getClientIp(request?.headers ?? (await nextHeaders()));
        const emailKey = `login:email:${email}:${ip}`;
        const ipKey = `login:ip:${ip}`;
        const byEmail = rateLimit(emailKey, LOGIN_LIMIT, LOGIN_WINDOW_MS);
        const byIp = rateLimit(ipKey, LOGIN_LIMIT, LOGIN_WINDOW_MS);
        if (!byEmail.allowed || !byIp.allowed) throw new RateLimitedError();

        const user = await prisma.user.findUnique({ where: { email } });
        const passwordsMatch = await bcrypt.compare(
          password,
          user?.passwordHash ?? DUMMY_HASH,
        );
        if (!user || !passwordsMatch) return null;

        resetRateLimit(emailKey);
        resetRateLimit(ipKey);
        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
});
