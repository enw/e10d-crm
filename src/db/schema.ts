import {
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
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

export const contacts = pgTable("contacts", {
  id: uuid("id").primaryKey().defaultRandom(),
  displayName: text("display_name").notNull().default(""),
  emails: jsonb("emails").$type<string[]>().notNull().default([]),
  phones: jsonb("phones").$type<string[]>().notNull().default([]),
  company: text("company"),
  title: text("title"),
  location: text("location"),
  enrichmentBlob: jsonb("enrichment_blob"),
  userOverrides: jsonb("user_overrides").$type<Record<string, boolean>>().notNull().default({}),
  lastInteractionAt: timestamp("last_interaction_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const googleContactLinks = pgTable(
  "google_contact_links",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    contactId: uuid("contact_id")
      .notNull()
      .references(() => contacts.id, { onDelete: "cascade" }),
    googleAccountId: uuid("google_account_id")
      .notNull()
      .references(() => googleAccounts.id, { onDelete: "cascade" }),
    googleResourceId: text("google_resource_id").notNull(),
    rawJson: jsonb("raw_json").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("google_contact_links_account_resource_idx").on(
      table.googleAccountId,
      table.googleResourceId,
    ),
  ],
);

export const calendarEvents = pgTable(
  "calendar_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    googleAccountId: uuid("google_account_id")
      .notNull()
      .references(() => googleAccounts.id, { onDelete: "cascade" }),
    googleEventId: text("google_event_id").notNull(),
    title: text("title"),
    description: text("description"),
    startTime: timestamp("start_time", { withTimezone: true }),
    endTime: timestamp("end_time", { withTimezone: true }),
    attendees: jsonb("attendees").$type<
      Array<{ email?: string; name?: string; responseStatus?: string }>
    >(),
    linkedContactId: uuid("linked_contact_id").references(() => contacts.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("calendar_events_account_event_idx").on(
      table.googleAccountId,
      table.googleEventId,
    ),
  ],
);

export type SchemaMeta = typeof schemaMeta.$inferSelect;
export type GoogleAccount = typeof googleAccounts.$inferSelect;
export type Contact = typeof contacts.$inferSelect;
export type GoogleContactLink = typeof googleContactLinks.$inferSelect;
