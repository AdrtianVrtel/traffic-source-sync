import { sqliteTable, integer, text, real } from "drizzle-orm/sqlite-core";

// Používateľské kontá. Env premenné ADMIN_* a USER2_* sa pri štarte seednu sem,
// ďalej sa všetko (role, prístupy k nástrojom) spravuje výhradne v DB.
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  // null, kým používateľ nedokončí registráciu cez pozvánkový link
  passwordHash: text("password_hash"),
  role: text("role", { enum: ["admin", "user"] })
    .notNull()
    .default("user"),
  status: text("status", { enum: ["pending", "active"] })
    .notNull()
    .default("pending"),
  // Voliteľná prezývka - zobrazuje sa v hlavičke namiesto e-mailu
  nickname: text("nickname"),
  // JSON pole kľúčov nástrojov (viď src/lib/tools.ts); pre admina sa ignoruje
  allowedTools: text("allowed_tools").notNull().default("[]"),
  inviteToken: text("invite_token"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// História spustení kontroly - z posledného úspešného behu sa berie dátum "odkedy" sťahovať kontakty
export const syncHistory = sqliteTable("sync_history", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  startedAt: text("started_at").notNull(),
  finishedAt: text("finished_at"),
  status: text("status", { enum: ["running", "done", "error"] })
    .notNull()
    .default("running"),
  contactsScanned: integer("contacts_scanned").notNull().default(0),
  hardMatches: integer("hard_matches").notNull().default(0),
  softMatches: integer("soft_matches").notNull().default(0),
  error: text("error"),
});

// Mention Tracker: sledované kľúčové slová (spravované cez UI)
export const trackedTerms = sqliteTable("tracked_terms", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  // Plain text zadaný používateľom, napr. "Invest in Slovakia"
  term: text("term").notNull().unique(),
  // Odvodené automaticky pri uložení - obalenie do úvodzoviek pre Tavily exact match
  query: text("query").notNull(),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull(),
});

// Mention Tracker: nájdené zmienky (URL je unique globálne = deduplikácia)
export const mentions = sqliteTable("mentions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  termId: integer("term_id").notNull(),
  url: text("url").notNull().unique(),
  title: text("title").notNull().default(""),
  snippet: text("snippet").notNull().default(""),
  sourceDomain: text("source_domain").notNull().default(""),
  faviconUrl: text("favicon_url"),
  publishedDate: text("published_date"),
  score: real("score"),
  isRead: integer("is_read", { mode: "boolean" }).notNull().default(false),
  firstSeenAt: text("first_seen_at").notNull(),
});

// Mention Tracker: história behov - observabilita + guard proti súbežnému behu
export const fetchRuns = sqliteTable("fetch_runs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  trigger: text("trigger", { enum: ["cron", "manual"] })
    .notNull()
    .default("cron"),
  runAt: text("run_at").notNull(),
  status: text("status", { enum: ["running", "success", "error"] })
    .notNull()
    .default("running"),
  resultsCount: integer("results_count").notNull().default(0),
  newMentionsCount: integer("new_mentions_count").notNull().default(0),
  creditsUsed: integer("credits_used").notNull().default(0),
  errorMessage: text("error_message"),
});

// Záznam o každom kontakte odoslanom na archiváciu (aj v dry-run režime)
export const archivedContacts = sqliteTable("archived_contacts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  acContactId: text("ac_contact_id").notNull(),
  email: text("email").notNull(),
  category: text("category", { enum: ["hard", "soft"] }).notNull(),
  // Dôvody klasifikácie oddelené "; "
  reasons: text("reasons").notNull(),
  mode: text("mode", { enum: ["dry-run", "live"] }).notNull(),
  archivedAt: text("archived_at").notNull(),
});
