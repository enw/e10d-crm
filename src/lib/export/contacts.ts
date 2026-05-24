import { asc, eq } from "drizzle-orm";

import { getDb } from "@/db";
import {
  contactTags,
  contacts,
  googleAccounts,
  googleContactLinks,
  interactions,
  tags,
} from "@/db/schema";
import type { UserOverrides } from "@/lib/sync/user-overrides";

export const EXPORT_VERSION = 1;

export type ContactsExport = {
  exportedAt: string;
  version: typeof EXPORT_VERSION;
  contacts: Array<{
    id: string;
    displayName: string;
    emails: string[];
    phones: string[];
    company: string | null;
    title: string | null;
    location: string | null;
    tags: string[];
    notes: Array<{ content: string; occurredAt: string }>;
    enrichment: Record<string, unknown> | null;
    userOverrides: string[];
    interactions: Array<{
      type: string;
      content: string | null;
      metadata: Record<string, unknown> | null;
      occurredAt: string;
    }>;
    googleAccounts: string[];
    createdAt: string;
    updatedAt: string;
  }>;
};

function overridesToList(overrides: UserOverrides): string[] {
  return Object.entries(overrides)
    .filter(([, enabled]) => enabled)
    .map(([field]) => field);
}

export async function buildContactsExport(): Promise<ContactsExport> {
  const db = getDb();
  const rows = await db.select().from(contacts).orderBy(asc(contacts.displayName));

  const contactIds = rows.map((row) => row.id);
  if (contactIds.length === 0) {
    return {
      exportedAt: new Date().toISOString(),
      version: EXPORT_VERSION,
      contacts: [],
    };
  }

  const tagRows = await db
    .select({
      contactId: contactTags.contactId,
      name: tags.name,
    })
    .from(contactTags)
    .innerJoin(tags, eq(contactTags.tagId, tags.id));

  const interactionRows = await db
    .select()
    .from(interactions)
    .orderBy(interactions.occurredAt);

  const linkRows = await db
    .select({
      contactId: googleContactLinks.contactId,
      email: googleAccounts.email,
    })
    .from(googleContactLinks)
    .innerJoin(
      googleAccounts,
      eq(googleContactLinks.googleAccountId, googleAccounts.id),
    );

  const tagsByContact = new Map<string, string[]>();
  for (const row of tagRows) {
    const existing = tagsByContact.get(row.contactId) ?? [];
    existing.push(row.name);
    tagsByContact.set(row.contactId, existing);
  }

  const interactionsByContact = new Map<string, typeof interactionRows>();
  for (const row of interactionRows) {
    const existing = interactionsByContact.get(row.contactId) ?? [];
    existing.push(row);
    interactionsByContact.set(row.contactId, existing);
  }

  const accountsByContact = new Map<string, string[]>();
  for (const row of linkRows) {
    const existing = accountsByContact.get(row.contactId) ?? [];
    if (!existing.includes(row.email)) {
      existing.push(row.email);
    }
    accountsByContact.set(row.contactId, existing);
  }

  return {
    exportedAt: new Date().toISOString(),
    version: EXPORT_VERSION,
    contacts: rows.map((contact) => {
      const contactInteractions = interactionsByContact.get(contact.id) ?? [];
      const notes = contactInteractions
        .filter((entry) => entry.type === "note" && entry.content)
        .map((entry) => ({
          content: entry.content!,
          occurredAt: entry.occurredAt.toISOString(),
        }));

      return {
        id: contact.id,
        displayName: contact.displayName,
        emails: contact.emails,
        phones: contact.phones,
        company: contact.company,
        title: contact.title,
        location: contact.location,
        tags: tagsByContact.get(contact.id) ?? [],
        notes,
        enrichment: (contact.enrichmentBlob as Record<string, unknown> | null) ?? null,
        userOverrides: overridesToList(contact.userOverrides ?? {}),
        interactions: contactInteractions.map((entry) => ({
          type: entry.type,
          content: entry.content,
          metadata: entry.metadata,
          occurredAt: entry.occurredAt.toISOString(),
        })),
        googleAccounts: accountsByContact.get(contact.id) ?? [],
        createdAt: contact.createdAt.toISOString(),
        updatedAt: contact.updatedAt.toISOString(),
      };
    }),
  };
}
