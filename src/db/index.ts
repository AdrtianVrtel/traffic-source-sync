import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { env } from "@/env";
import { hashPassword } from "@/lib/auth/password";
import { ALL_TOOL_KEYS } from "@/lib/tools";
import * as schema from "./schema";

const DDL = `
CREATE TABLE IF NOT EXISTS sync_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  status TEXT NOT NULL DEFAULT 'running',
  contacts_scanned INTEGER NOT NULL DEFAULT 0,
  hard_matches INTEGER NOT NULL DEFAULT 0,
  soft_matches INTEGER NOT NULL DEFAULT 0,
  error TEXT
);
CREATE TABLE IF NOT EXISTS archived_contacts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ac_contact_id TEXT NOT NULL,
  email TEXT NOT NULL,
  category TEXT NOT NULL,
  reasons TEXT NOT NULL,
  mode TEXT NOT NULL,
  archived_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS tracked_terms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  term TEXT NOT NULL UNIQUE,
  query TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS mentions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  term_id INTEGER NOT NULL,
  url TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL DEFAULT '',
  snippet TEXT NOT NULL DEFAULT '',
  source_domain TEXT NOT NULL DEFAULT '',
  favicon_url TEXT,
  published_date TEXT,
  score REAL,
  is_read INTEGER NOT NULL DEFAULT 0,
  first_seen_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS fetch_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trigger TEXT NOT NULL DEFAULT 'cron',
  run_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'running',
  results_count INTEGER NOT NULL DEFAULT 0,
  new_mentions_count INTEGER NOT NULL DEFAULT 0,
  credits_used INTEGER NOT NULL DEFAULT 0,
  error_message TEXT
);
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT,
  role TEXT NOT NULL DEFAULT 'user',
  status TEXT NOT NULL DEFAULT 'pending',
  nickname TEXT,
  allowed_tools TEXT NOT NULL DEFAULT '[]',
  invite_token TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
`;

function migrate(sqlite: Database.Database) {
  const userColumns = sqlite.prepare(`PRAGMA table_info(users)`).all() as { name: string }[];
  if (!userColumns.some((c) => c.name === "nickname")) {
    sqlite.exec(`ALTER TABLE users ADD COLUMN nickname TEXT`);
  }

  const mentionColumns = sqlite.prepare(`PRAGMA table_info(mentions)`).all() as { name: string }[];
  if (mentionColumns.length > 0 && !mentionColumns.some((c) => c.name === "favicon_url")) {
    sqlite.exec(`ALTER TABLE mentions ADD COLUMN favicon_url TEXT`);
  }
}

function seedUsersFromEnv(sqlite: Database.Database) {
  const insert = sqlite.prepare(
    `INSERT OR IGNORE INTO users (email, password_hash, role, status, allowed_tools, created_at, updated_at)
     VALUES (@email, @passwordHash, @role, 'active', @allowedTools, @now, @now)`
  );

  const seed = (email: string | undefined, password: string | undefined, role: "admin" | "user") => {
    if (!email || !password) return;
    const result = insert.run({
      email: email.toLowerCase().trim(),
      passwordHash: hashPassword(password),
      role,
      allowedTools: JSON.stringify(ALL_TOOL_KEYS),
      now: new Date().toISOString(),
    });
    if (result.changes > 0) {
      console.log(`Seed: vytvorený používateľ ${email.toLowerCase().trim()} (${role})`);
    }
  };

  seed(env.ADMIN_EMAIL, env.ADMIN_PASSWORD, "admin");
  seed(env.USER2_EMAIL, env.USER2_PASSWORD, "user");
}

function seedTrackedTerms(sqlite: Database.Database) {
  const insert = sqlite.prepare(
    `INSERT OR IGNORE INTO tracked_terms (term, query, created_at) VALUES (?, ?, ?)`
  );
  for (const term of ["Invest in Slovakia", "investinslovakia.eu"]) {
    insert.run(term, `"${term}"`, new Date().toISOString());
  }
}

function createDb() {
  const dbPath = path.resolve(env.DATABASE_PATH);
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.exec(DDL);
  migrate(sqlite);
  seedUsersFromEnv(sqlite);
  seedTrackedTerms(sqlite);
  return drizzle(sqlite, { schema });
}

const globalForDb = globalThis as unknown as { __drizzleDb?: ReturnType<typeof createDb> };

export const db = globalForDb.__drizzleDb ?? (globalForDb.__drizzleDb = createDb());
