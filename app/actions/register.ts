"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

const registerSchema = z.object({
  name: z.string().trim().min(1, { message: "Name is required" }).max(100),
  lastname: z.string().trim().max(100).optional(),
  email: z.string().trim().toLowerCase().email({ message: "Email is not valid" }).max(254),
  password: z
    .string()
    .min(10, { message: "Password must be at least 10 characters" })
    .refine((p) => Buffer.byteLength(p) <= 72, {
      message: "Password cannot exceed 72 bytes",
    }),
});

export async function registerAction(formData: FormData) {
  const ip = getClientIp(await headers());
  const limit = rateLimit(`register:ip:${ip}`, 3, 60 * 60 * 1000);
  if (!limit.allowed) {
    return { error: "Too many sign-ups from this network. Try again later." };
  }

  const validation = registerSchema.safeParse({
    name: formData.get("name"),
    lastname: formData.get("lastname") || undefined,
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!validation.success) {
    return { error: validation.error.issues[0].message };
  }

  const { name, lastname, email, password } = validation.data;
  const fullName = lastname ? `${name} ${lastname}` : name;

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });

    if (existingUser) {
      return { error: "Email is already registered" };
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.user.create({
      data: { name: fullName, email, passwordHash },
    });

    return { success: true };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { error: "Email is already registered" };
    }
    console.error("Registration error:", error);
    return { error: "Error creating the account. Please try again." };
  }
}
