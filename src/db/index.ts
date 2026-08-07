import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { env } from "@/env";
import { hashPassword } from "@/lib/auth/password";
import { ALL_TOOL_KEYS } from "@/lib/tools";
import * as schema from "./schema";

// DDL namiesto drizzle-kit migrácií: standalone Docker build netrasuje migračný adresár,
// pri takomto počte tabuliek je CREATE TABLE IF NOT EXISTS spoľahlivejší
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

// Mini-migrácie pre existujúce databázy - CREATE TABLE IF NOT EXISTS nové stĺpce nepridá
function migrate(sqlite: Database.Database) {
  const userColumns = sqlite.prepare(`PRAGMA table_info(users)`).all() as { name: string }[];
  if (!userColumns.some((c) => c.name === "nickname")) {
    sqlite.exec(`ALTER TABLE users ADD COLUMN nickname TEXT`);
  }
}

// Seed z env: vytvorí kontá len ak ešte neexistujú - zmeny spravené neskôr v DB
// (rola, prístupy k nástrojom) sa pri reštarte NEprepisujú
function seedUsersFromEnv(sqlite: Database.Database) {
  // INSERT OR IGNORE je atomický - viac procesov (napr. build workery) môže
  // inicializovať DB súbežne bez pádu na UNIQUE constraint
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

function createDb() {
  const dbPath = path.resolve(env.DATABASE_PATH);
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.exec(DDL);
  migrate(sqlite);
  seedUsersFromEnv(sqlite);
  return drizzle(sqlite, { schema });
}

// Singleton cez globalThis, aby hot-reload v dev režime neotváral nové spojenia
const globalForDb = globalThis as unknown as { __drizzleDb?: ReturnType<typeof createDb> };

export const db = globalForDb.__drizzleDb ?? (globalForDb.__drizzleDb = createDb());
