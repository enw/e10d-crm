import { and, asc, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { contactTags, tags } from "@/db/schema";
import { logInteraction } from "@/lib/interactions";

function normalizeTagName(name: string): string {
  return name.trim().toLowerCase();
}

export async function listTags() {
  const db = getDb();
  return db.select().from(tags).orderBy(asc(tags.name));
}

export async function getOrCreateTag(name: string) {
  const db = getDb();
  const normalized = normalizeTagName(name);
  if (!normalized) {
    throw new Error("Tag name is required");
  }

  const [existing] = await db
    .select()
    .from(tags)
    .where(eq(tags.name, normalized))
    .limit(1);

  if (existing) {
    return existing;
  }

  const [created] = await db
    .insert(tags)
    .values({ name: normalized })
    .returning();

  return created;
}

export async function listTagsForContact(contactId: string) {
  const db = getDb();
  return db
    .select({ id: tags.id, name: tags.name })
    .from(contactTags)
    .innerJoin(tags, eq(contactTags.tagId, tags.id))
    .where(eq(contactTags.contactId, contactId))
    .orderBy(asc(tags.name));
}

export async function assignTagToContact(contactId: string, tagName: string) {
  const db = getDb();
  const tag = await getOrCreateTag(tagName);

  const [existing] = await db
    .select()
    .from(contactTags)
    .where(
      and(
        eq(contactTags.contactId, contactId),
        eq(contactTags.tagId, tag.id),
      ),
    )
    .limit(1);

  if (existing) {
    return tag;
  }

  await db.insert(contactTags).values({ contactId, tagId: tag.id });

  await logInteraction({
    contactId,
    type: "tag_added",
    content: tag.name,
    metadata: { tagId: tag.id },
  });

  return tag;
}

export async function removeTagFromContact(contactId: string, tagId: string) {
  const db = getDb();
  const [tag] = await db.select().from(tags).where(eq(tags.id, tagId)).limit(1);
  if (!tag) {
    return;
  }

  await db
    .delete(contactTags)
    .where(
      and(
        eq(contactTags.contactId, contactId),
        eq(contactTags.tagId, tagId),
      ),
    );

  await logInteraction({
    contactId,
    type: "tag_removed",
    content: tag.name,
    metadata: { tagId: tag.id },
  });
}
