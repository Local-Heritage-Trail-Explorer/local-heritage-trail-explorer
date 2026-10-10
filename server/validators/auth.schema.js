import { z } from "zod";

export const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters long").trim(),
  email: z.string().trim().toLowerCase().email("Invalid email address format"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long")
    .regex(/[A-Za-z]/, "Password must contain at least one letter")
    .regex(/[0-9!@#$%^&*]/, "Password must contain at least one number or special character"),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1, "Verification token is required").trim(),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Invalid email address format"),
  password: z.string().min(1, "Password is required"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email("Invalid email address format"),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required").trim(),
  newPassword: z
    .string()
    .min(8, "New password must be at least 8 characters long")
    .regex(/[A-Za-z]/, "New password must contain at least one letter")
    .regex(/[0-9!@#$%^&*]/, "New password must contain at least one number or special character"),
});
