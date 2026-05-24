import {
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

/** Placeholder table so migration runner is wired; domain tables land in T02+. */
export const schemaMeta = pgTable("schema_meta", {
  id: uuid("id").primaryKey().defaultRandom(),
  version: text("version").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const googleAccounts = pgTable("google_accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  googleSub: text("google_sub").notNull().unique(),
  encryptedAccessToken: text("encrypted_access_token").notNull(),
  encryptedRefreshToken: text("encrypted_refresh_token"),
  tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }),
  scopes: jsonb("scopes").$type<string[]>().notNull().default([]),
  lastContactsSyncAt: timestamp("last_contacts_sync_at", { withTimezone: true }),
  lastCalendarSyncAt: timestamp("last_calendar_sync_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type SchemaMeta = typeof schemaMeta.$inferSelect;
export type GoogleAccount = typeof googleAccounts.$inferSelect;
