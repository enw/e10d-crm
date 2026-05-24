import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/** Placeholder table so migration runner is wired; domain tables land in T02+. */
export const schemaMeta = pgTable("schema_meta", {
  id: uuid("id").primaryKey().defaultRandom(),
  version: text("version").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type SchemaMeta = typeof schemaMeta.$inferSelect;
