import { desc, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { interactions } from "@/db/schema";

export async function logInteraction(input: {
  contactId: string;
  type: "note" | "meeting" | "enrichment" | "tag_added" | "tag_removed" | "sync";
  content?: string;
  metadata?: Record<string, unknown>;
}) {
  const db = getDb();
  await db.insert(interactions).values({
    contactId: input.contactId,
    type: input.type,
    content: input.content,
    metadata: input.metadata,
  });
}

export async function listInteractionsForContact(contactId: string, limit = 20) {
  const db = getDb();
  return db
    .select()
    .from(interactions)
    .where(eq(interactions.contactId, contactId))
    .orderBy(desc(interactions.occurredAt))
    .limit(limit);
}
