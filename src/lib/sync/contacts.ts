import { and, eq } from "drizzle-orm";
import { google } from "googleapis";

import { getDb } from "@/db";
import {
  contacts,
  googleAccounts,
  googleContactLinks,
} from "@/db/schema";
import { getValidAccessToken } from "@/lib/google/tokens";
import {
  findContactIdByEmail,
  mergeContactFields,
  parseGooglePerson,
  pickPrimaryEmail,
} from "@/lib/sync/contact-merge";

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
      const merged = mergeContactFields(existing, person);
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

export async function listContacts() {
  const db = getDb();
  return db
    .select({
      id: contacts.id,
      displayName: contacts.displayName,
      emails: contacts.emails,
      company: contacts.company,
    })
    .from(contacts)
    .orderBy(contacts.displayName);
}
