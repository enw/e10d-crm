import { and, eq, inArray, sql } from "drizzle-orm";
import { google } from "googleapis";

import { getDb } from "@/db";
import {
  contactTags,
  contacts,
  googleAccounts,
  googleContactLinks,
  interactions,
  tags,
} from "@/db/schema";
import { getValidAccessToken } from "@/lib/google/tokens";
import {
  findContactIdByEmail,
  parseGooglePerson,
  pickPrimaryEmail,
} from "@/lib/sync/contact-merge";
import { TRIGRAM_MIN_LENGTH } from "@/lib/sync/contact-search";

const PERSON_FIELDS =
  "names,emailAddresses,phoneNumbers,organizations,metadata";

export async function syncContactsForAccount(
  googleAccountId: string,
): Promise<number> {
  const accessToken = await getValidAccessToken(googleAccountId);
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  const people = google.people({ version: "v1", auth });

  let pageToken: string | undefined;
  let synced = 0;

  do {
    const response = await people.people.connections.list({
      resourceName: "people/me",
      personFields: PERSON_FIELDS,
      pageSize: 500,
      pageToken,
    });

    const connections = response.data.connections ?? [];
    for (const connection of connections) {
      const parsed = parseGooglePerson(connection as Record<string, unknown>);
      if (!parsed) {
        continue;
      }

      await upsertSyncedContact(googleAccountId, parsed);
      synced += 1;
    }

    pageToken = response.data.nextPageToken ?? undefined;
  } while (pageToken);

  const db = getDb();
  await db
    .update(googleAccounts)
    .set({ lastContactsSyncAt: new Date(), updatedAt: new Date() })
    .where(eq(googleAccounts.id, googleAccountId));

  return synced;
}

async function upsertSyncedContact(
  googleAccountId: string,
  person: ReturnType<typeof parseGooglePerson> & object,
) {
  const db = getDb();
  const primaryEmail = pickPrimaryEmail(person.emails);

  const [existingLink] = await db
    .select({
      id: googleContactLinks.id,
      contactId: googleContactLinks.contactId,
    })
    .from(googleContactLinks)
    .where(
      and(
        eq(googleContactLinks.googleResourceId, person.resourceName),
        eq(googleContactLinks.googleAccountId, googleAccountId),
      ),
    )
    .limit(1);

  let contactId: string | null = existingLink?.contactId ?? null;

  if (!contactId && primaryEmail) {
    const allContacts = await db
      .select({ id: contacts.id, emails: contacts.emails })
      .from(contacts);
    contactId = findContactIdByEmail(allContacts, primaryEmail);
  }

  const now = new Date();

  if (!contactId) {
    const [created] = await db
      .insert(contacts)
      .values({
        displayName: person.displayName,
        emails: person.emails,
        phones: person.phones,
        company: person.company,
        title: person.title,
        updatedAt: now,
      })
      .returning({ id: contacts.id });
    contactId = created.id;
  } else {
    const [existing] = await db
      .select()
      .from(contacts)
      .where(eq(contacts.id, contactId))
      .limit(1);

    if (existing) {
      const { applyUserOverridesToSyncMerge } = await import(
        "@/lib/sync/user-overrides"
      );
      const merged = applyUserOverridesToSyncMerge(existing, person);
      await db
        .update(contacts)
        .set({ ...merged, updatedAt: now })
        .where(eq(contacts.id, contactId));
    }
  }

  await db
    .insert(googleContactLinks)
    .values({
      contactId,
      googleAccountId,
      googleResourceId: person.resourceName,
      rawJson: person,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [
        googleContactLinks.googleAccountId,
        googleContactLinks.googleResourceId,
      ],
      set: {
        contactId,
        rawJson: person,
        updatedAt: now,
      },
    });
}

export type ContactListItem = {
  id: string;
  displayName: string;
  emails: string[];
  company: string | null;
  tags: { id: string; name: string }[];
  googleAccountIds: string[];
};

export type ContactSearchOptions = {
  q?: string;
  tagId?: string;
};

async function loadGoogleAccountsForContacts(contactIds: string[]) {
  if (contactIds.length === 0) {
    return new Map<string, string[]>();
  }

  const db = getDb();
  const rows = await db
    .select({
      contactId: googleContactLinks.contactId,
      googleAccountId: googleContactLinks.googleAccountId,
    })
    .from(googleContactLinks)
    .where(inArray(googleContactLinks.contactId, contactIds));

  const byContact = new Map<string, string[]>();
  for (const row of rows) {
    const existing = byContact.get(row.contactId) ?? [];
    if (!existing.includes(row.googleAccountId)) {
      existing.push(row.googleAccountId);
    }
    byContact.set(row.contactId, existing);
  }

  return byContact;
}

async function loadTagsForContacts(contactIds: string[]) {
  if (contactIds.length === 0) {
    return new Map<string, { id: string; name: string }[]>();
  }

  const db = getDb();
  const rows = await db
    .select({
      contactId: contactTags.contactId,
      id: tags.id,
      name: tags.name,
    })
    .from(contactTags)
    .innerJoin(tags, eq(contactTags.tagId, tags.id))
    .where(inArray(contactTags.contactId, contactIds))
    .orderBy(tags.name);

  const byContact = new Map<string, { id: string; name: string }[]>();
  for (const row of rows) {
    const existing = byContact.get(row.contactId) ?? [];
    existing.push({ id: row.id, name: row.name });
    byContact.set(row.contactId, existing);
  }
  return byContact;
}

function buildSearchWhere(q: string, tagContactIds: string[] | null) {
  const conditions = [];

  const trimmed = q.trim();
  if (trimmed) {
    const pattern = `%${trimmed}%`;
    if (trimmed.length >= TRIGRAM_MIN_LENGTH) {
      conditions.push(
        sql`(
          ${contacts.displayName} % ${trimmed}
          OR ${contacts.displayName} ILIKE ${pattern}
          OR EXISTS (
            SELECT 1 FROM jsonb_array_elements_text(${contacts.emails}) AS email
            WHERE email ILIKE ${pattern}
          )
          OR EXISTS (
            SELECT 1 FROM ${interactions} AS note
            WHERE note.contact_id = ${contacts.id}
              AND note.type = 'note'
              AND note.content ILIKE ${pattern}
          )
        )`,
      );
    } else {
      conditions.push(
        sql`(
          ${contacts.displayName} ILIKE ${pattern}
          OR EXISTS (
            SELECT 1 FROM jsonb_array_elements_text(${contacts.emails}) AS email
            WHERE email ILIKE ${pattern}
          )
          OR EXISTS (
            SELECT 1 FROM ${interactions} AS note
            WHERE note.contact_id = ${contacts.id}
              AND note.type = 'note'
              AND note.content ILIKE ${pattern}
          )
        )`,
      );
    }
  }

  if (tagContactIds) {
    if (tagContactIds.length === 0) {
      return sql`false`;
    }
    conditions.push(inArray(contacts.id, tagContactIds));
  }

  if (conditions.length === 0) {
    return undefined;
  }

  return and(...conditions);
}

export async function searchContacts(
  options: ContactSearchOptions = {},
): Promise<ContactListItem[]> {
  const db = getDb();
  const q = options.q?.trim() ?? "";
  const tagId = options.tagId?.trim() ?? "";

  let tagContactIds: string[] | null = null;
  if (tagId) {
    const rows = await db
      .select({ contactId: contactTags.contactId })
      .from(contactTags)
      .where(eq(contactTags.tagId, tagId));
    tagContactIds = rows.map((row) => row.contactId);
  }

  const rows = await db
    .select({
      id: contacts.id,
      displayName: contacts.displayName,
      emails: contacts.emails,
      company: contacts.company,
    })
    .from(contacts)
    .where(buildSearchWhere(q, tagContactIds))
    .orderBy(contacts.displayName);

  const tagsByContact = await loadTagsForContacts(rows.map((row) => row.id));
  const accountsByContact = await loadGoogleAccountsForContacts(
    rows.map((row) => row.id),
  );

  return rows.map((row) => ({
    ...row,
    tags: tagsByContact.get(row.id) ?? [],
    googleAccountIds: accountsByContact.get(row.id) ?? [],
  }));
}

export async function getContactById(id: string) {
  const db = getDb();
  const [contact] = await db
    .select()
    .from(contacts)
    .where(eq(contacts.id, id))
    .limit(1);
  return contact ?? null;
}

export async function listContacts() {
  return searchContacts();
}
