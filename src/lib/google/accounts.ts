import { desc, eq, inArray } from "drizzle-orm";

import { getDb } from "@/db";
import {
  calendarEvents,
  contacts,
  googleAccounts,
  googleContactLinks,
} from "@/db/schema";
import { decryptToken, encryptToken } from "@/lib/crypto/tokens";
import { revokeGoogleToken } from "@/lib/google/tokens";

export type GoogleAccountSummary = {
  id: string;
  email: string;
  scopes: string[];
  connectedAt: Date;
  tokenExpiresAt: Date | null;
};

export type UpsertGoogleAccountInput = {
  email: string;
  googleSub: string;
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date | null;
  scopes: string[];
};

export async function upsertGoogleAccount(
  input: UpsertGoogleAccountInput,
): Promise<GoogleAccountSummary> {
  const db = getDb();
  const now = new Date();

  const values = {
    email: input.email,
    googleSub: input.googleSub,
    encryptedAccessToken: encryptToken(input.accessToken),
    encryptedRefreshToken: input.refreshToken
      ? encryptToken(input.refreshToken)
      : null,
    tokenExpiresAt: input.expiresAt,
    scopes: input.scopes,
    updatedAt: now,
  };

  const [row] = await db
    .insert(googleAccounts)
    .values(values)
    .onConflictDoUpdate({
      target: googleAccounts.email,
      set: values,
    })
    .returning({
      id: googleAccounts.id,
      email: googleAccounts.email,
      scopes: googleAccounts.scopes,
      createdAt: googleAccounts.createdAt,
      tokenExpiresAt: googleAccounts.tokenExpiresAt,
    });

  return {
    id: row.id,
    email: row.email,
    scopes: row.scopes,
    connectedAt: row.createdAt,
    tokenExpiresAt: row.tokenExpiresAt,
  };
}

export async function listGoogleAccounts(): Promise<GoogleAccountSummary[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: googleAccounts.id,
      email: googleAccounts.email,
      scopes: googleAccounts.scopes,
      createdAt: googleAccounts.createdAt,
      tokenExpiresAt: googleAccounts.tokenExpiresAt,
    })
    .from(googleAccounts)
    .orderBy(desc(googleAccounts.createdAt));

  return rows.map((row) => ({
    id: row.id,
    email: row.email,
    scopes: row.scopes,
    connectedAt: row.createdAt,
    tokenExpiresAt: row.tokenExpiresAt,
  }));
}

export async function getGoogleAccountByEmail(email: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(googleAccounts)
    .where(eq(googleAccounts.email, email))
    .limit(1);

  return row ?? null;
}

export async function getGoogleAccountById(id: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(googleAccounts)
    .where(eq(googleAccounts.id, id))
    .limit(1);

  return row ?? null;
}

export async function disconnectGoogleAccount(id: string): Promise<void> {
  const account = await getGoogleAccountById(id);
  if (!account) {
    return;
  }

  try {
    const accessToken = decryptToken(account.encryptedAccessToken);
    await revokeGoogleToken(accessToken);
  } catch (error) {
    console.warn("Could not revoke Google token:", error);
  }

  const db = getDb();

  const linkedContactIds = await db
    .select({ contactId: googleContactLinks.contactId })
    .from(googleContactLinks)
    .where(eq(googleContactLinks.googleAccountId, id));

  await db.delete(calendarEvents).where(eq(calendarEvents.googleAccountId, id));
  await db
    .delete(googleContactLinks)
    .where(eq(googleContactLinks.googleAccountId, id));
  await db.delete(googleAccounts).where(eq(googleAccounts.id, id));

  const contactIds = linkedContactIds.map((row) => row.contactId);
  if (contactIds.length === 0) {
    return;
  }

  const remainingLinks = await db
    .select({ contactId: googleContactLinks.contactId })
    .from(googleContactLinks)
    .where(inArray(googleContactLinks.contactId, contactIds));

  const stillLinked = new Set(remainingLinks.map((row) => row.contactId));
  const orphanIds = contactIds.filter((contactId) => !stillLinked.has(contactId));

  if (orphanIds.length > 0) {
    await db.delete(contacts).where(inArray(contacts.id, orphanIds));
  }
}
