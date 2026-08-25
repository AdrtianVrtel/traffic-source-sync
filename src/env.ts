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
  DATABASE_PATH: z.string().default("./data/app.db"),
  // ActiveCampaign - voliteľné, kým nedostaneme prístupy. Bez nich je AC Cleaner nefunkčný, ale appka beží.
  AC_API_URL: z.string().url().optional(),
  AC_API_KEY: z.string().min(1).optional(),
  // Poistka: kým nie je "live", archivácia nič reálne neodošle do AC, len loguje a zapisuje históriu.
  AC_ARCHIVE_MODE: z.enum(["dry-run", "live"]).default("dry-run"),
  // Mention Tracker (Tavily) - voliteľné, bez kľúča je nástroj neaktívny, appka beží
  TAVILY_API_KEY: z.string().min(1).optional(),
  // Prepísateľné len kvôli testom (mock server); v produkcii nechať default
  TAVILY_API_URL: z.string().url().default("https://api.tavily.com"),
  // Zdieľané tajomstvo pre /api/cron/fetch-mentions volaný z Coolify Scheduled Task
  CRON_SECRET: z.string().min(1).optional(),
  // Voliteľný outbound webhook pre notifikácie o nových zmienkach (MVP: nenastavené = no-op)
  NOTIFICATION_WEBHOOK_URL: z.string().url().optional(),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error("❌ Invalid environment variables:", _env.error.format());
  throw new Error("Invalid environment variables");
}

export const env = _env.data;
