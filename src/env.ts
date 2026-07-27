import { z } from "zod";

const envSchema = z.object({
  POSTHOG_PROJECT_ID: z.string().min(1, "POSTHOG_PROJECT_ID is required"),
  POSTHOG_API_KEY: z.string().min(1, "POSTHOG_API_KEY is required"),
  POSTHOG_HOST: z.string().url().default("https://eu.posthog.com"),
  NEXTAUTH_SECRET: z.string().min(1, "NEXTAUTH_SECRET is required"),
  NEXTAUTH_URL: z.string().url().default("http://localhost:3000"),
  ADMIN_EMAIL: z.string().email("ADMIN_EMAIL must be a valid email").optional(),
  ADMIN_PASSWORD: z.string().min(6).optional(),
  USER2_EMAIL: z.string().email("USER2_EMAIL must be a valid email").optional(),
  USER2_PASSWORD: z.string().min(6).optional(),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error("❌ Invalid environment variables:", _env.error.format());
  throw new Error("Invalid environment variables");
}

export const env = _env.data;
