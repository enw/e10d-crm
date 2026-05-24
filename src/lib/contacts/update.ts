import { eq } from "drizzle-orm";

import { getDb } from "@/db";
import { contacts } from "@/db/schema";
import {
  buildOverridesFromUpdate,
  type ContactUpdateInput,
} from "@/lib/sync/user-overrides";

export async function updateContact(
  contactId: string,
  input: ContactUpdateInput,
) {
  const db = getDb();
  const [existing] = await db
    .select()
    .from(contacts)
    .where(eq(contacts.id, contactId))
    .limit(1);

  if (!existing) {
    throw new Error("Contact not found");
  }

  const userOverrides = buildOverridesFromUpdate(
    existing.userOverrides ?? {},
    input,
  );

  const [updated] = await db
    .update(contacts)
    .set({
      displayName: input.displayName ?? existing.displayName,
      company: input.company !== undefined ? input.company : existing.company,
      title: input.title !== undefined ? input.title : existing.title,
      location:
        input.location !== undefined ? input.location : existing.location,
      emails: input.emails ?? existing.emails,
      phones: input.phones ?? existing.phones,
      userOverrides,
      updatedAt: new Date(),
    })
    .where(eq(contacts.id, contactId))
    .returning();

  return updated;
}
