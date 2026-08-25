import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { env } from "@/shared/env";
import { migrate } from "./migrate";
import { seed } from "./seed";
import * as schema from "./schema";

function createDb() {
  const dbPath = path.resolve(env.DATABASE_PATH);
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  migrate(sqlite);
  seed(sqlite);
  return drizzle(sqlite, { schema });
}

const globalForDb = globalThis as unknown as { __drizzleDb?: ReturnType<typeof createDb> };

export const db = globalForDb.__drizzleDb ?? (globalForDb.__drizzleDb = createDb());
