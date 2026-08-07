import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";

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
