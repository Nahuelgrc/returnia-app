import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { z } from "zod";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { authConfig } from "./auth.config";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const parsedCredentials = z
          .object({ email: z.string().email(), password: z.string().min(6) })
          .safeParse(credentials);

        if (parsedCredentials.success) {
          const { email, password } = parsedCredentials.data;

          const user = await prisma.user.findUnique({ where: { email } });
          // Check for passwordHash because OAuth users might not have one
          if (!user || !user.passwordHash) return null;

          const passwordsMatch = await bcrypt.compare(
            password,
            user.passwordHash as string,
          );
          if (passwordsMatch) return user;
        }

        console.log("Invalid credentials");
        return null;
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        if (!user.email) return false;

        await prisma.user.upsert({
          where: { email: user.email },
          update: {
            image: user.image,
          },
          create: {
            email: user.email,
            image: user.image,
            passwordHash: null,
          },
        });
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        // override token.sub with the REAL postgres uuid to fix FK constraints
        if (user.email) {
          const dbUser = await prisma.user.findUnique({
            where: { email: user.email },
          });
          if (dbUser) {
            token.sub = dbUser.id;
          } else {
            token.sub = user.id;
          }
        } else {
          token.sub = user.id;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token?.sub && session.user) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
});
