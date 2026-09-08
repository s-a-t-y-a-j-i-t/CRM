import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid work email.").max(180),
  password: z.string().min(8, "Password must be at least 8 characters.").max(128),
  remember: z.boolean(),
});

export type LoginValues = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Enter a valid work email.").max(180),
});

export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;
