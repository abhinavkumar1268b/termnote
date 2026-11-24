import { z } from "zod";

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1, "Enter your password."),
});

export const signupSchema = z.object({
  name: z.string().trim().min(2, "Enter at least 2 characters."),
  email: z.email(),
  password: z
    .string()
    .min(8, "Use at least 8 characters.")
    .regex(/[a-zA-Z]/, "Include a letter.")
    .regex(/[0-9]/, "Include a number."),
});

export const resetRequestSchema = z.object({ email: z.email() });

export const updatePasswordSchema = z.object({
  password: z.string().min(8, "Use at least 8 characters."),
  confirm: z.string().min(8),
}).refine((data) => data.password === data.confirm, {
  message: "Passwords do not match.",
  path: ["confirm"],
});
