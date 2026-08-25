import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { env } from "@/shared/env";
import { migrate } from "./migrate";
import { seed } from "./seed";
import * as schema from "./schema";

type Db = ReturnType<typeof createDb>;

function createDb() {
  const dbPath = path.resolve(env.DATABASE_PATH);
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  migrate(sqlite);
  seed(sqlite);
  return drizzle(sqlite, { schema });
}

const globalForDb = globalThis as unknown as { __drizzleDb?: Db };

const getDb = (): Db => (globalForDb.__drizzleDb ??= createDb());

export const db = new Proxy({} as Db, {
  get: (_target, prop) => {
    const real = getDb() as unknown as Record<string | symbol, unknown>;
    const value = real[prop];
    return typeof value === "function" ? (value as (...args: unknown[]) => unknown).bind(real) : value;
  },
});
