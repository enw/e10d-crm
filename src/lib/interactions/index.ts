import { desc, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { contacts, interactions } from "@/db/schema";

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

export async function addNote(contactId: string, content: string) {
  const trimmed = content.trim();
  if (!trimmed) {
    throw new Error("Note content is required");
  }

  const db = getDb();
  const now = new Date();

  await db.insert(interactions).values({
    contactId,
    type: "note",
    content: trimmed,
    occurredAt: now,
  });

  await db
    .update(contacts)
    .set({ lastInteractionAt: now, updatedAt: now })
    .where(eq(contacts.id, contactId));
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
