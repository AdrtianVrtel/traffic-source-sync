import type Database from "better-sqlite3";

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

const addColumnIfMissing = (
  sqlite: Database.Database,
  table: string,
  column: string,
  definition: string
) => {
  const columns = sqlite.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  if (columns.length > 0 && !columns.some((c) => c.name === column)) {
    sqlite.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
};

export function migrate(sqlite: Database.Database) {
  sqlite.exec(DDL);
  addColumnIfMissing(sqlite, "users", "nickname", "TEXT");
  addColumnIfMissing(sqlite, "mentions", "favicon_url", "TEXT");
}
