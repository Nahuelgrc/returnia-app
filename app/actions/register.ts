"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

const registerSchema = z.object({
  name: z.string().min(1, { message: "El nombre es obligatorio" }),
  lastname: z.string().optional(),
  email: z.string().email({ message: "El correo no es válido" }),
  password: z.string().min(6, { message: "La contraseña debe tener al menos 6 caracteres" }),
});

export async function registerAction(formData: FormData) {
  const name = formData.get("name");
  const lastname = formData.get("lastname");
  const email = formData.get("email");
  const password = formData.get("password");

  const validation = registerSchema.safeParse({ name, lastname, email, password });

  if (!validation.success) {
    return { error: validation.error.issues[0].message };
  }

  const { name: validName, lastname: validLastname, email: validEmail, password: validPassword } = validation.data;

  // Combine Name and Lastname for storage as full name
  const fullName = validLastname ? `${validName} ${validLastname}` : validName;

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email: validEmail },
    });

    if (existingUser) {
      return { error: "El correo ya está registrado" };
    }

    const passwordHash = await bcrypt.hash(validPassword, 10);

    await prisma.user.create({
      data: {
        name: fullName,
        email: validEmail,
        passwordHash,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Registration error:", error);
    return { error: "Error al crear la cuenta. Intenta de nuevo." };
  }
}
