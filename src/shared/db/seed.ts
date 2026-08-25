import type Database from "better-sqlite3";
import { env } from "@/shared/env";
import { hashPassword } from "@/shared/auth/password";
import { ALL_TOOL_KEYS } from "@/shared/tools";

const INITIAL_TRACKED_TERMS = ["Invest in Slovakia", "investinslovakia.eu"];

function seedUsersFromEnv(sqlite: Database.Database) {
  const insert = sqlite.prepare(
    `INSERT OR IGNORE INTO users (email, password_hash, role, status, allowed_tools, created_at, updated_at)
     VALUES (@email, @passwordHash, @role, 'active', @allowedTools, @now, @now)`
  );

  const seed = (email: string | undefined, password: string | undefined, role: "admin" | "user") => {
    if (!email || !password) return;
    const normalized = email.toLowerCase().trim();
    const result = insert.run({
      email: normalized,
      passwordHash: hashPassword(password),
      role,
      allowedTools: JSON.stringify(ALL_TOOL_KEYS),
      now: new Date().toISOString(),
    });
    if (result.changes > 0) {
      console.log(`Seed: vytvorený používateľ ${normalized} (${role})`);
    }
  };

  seed(env.ADMIN_EMAIL, env.ADMIN_PASSWORD, "admin");
  seed(env.USER2_EMAIL, env.USER2_PASSWORD, "user");
}

function seedTrackedTerms(sqlite: Database.Database) {
  const insert = sqlite.prepare(
    `INSERT OR IGNORE INTO tracked_terms (term, query, created_at) VALUES (?, ?, ?)`
  );
  for (const term of INITIAL_TRACKED_TERMS) {
    insert.run(term, `"${term}"`, new Date().toISOString());
  }
}

export function seed(sqlite: Database.Database) {
  seedUsersFromEnv(sqlite);
  seedTrackedTerms(sqlite);
}
