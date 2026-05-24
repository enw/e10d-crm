import { eq } from "drizzle-orm";

import { getDb } from "@/db";
import { googleAccounts } from "@/db/schema";
import { syncCalendarForAccount } from "@/lib/sync/calendar";
import { syncContactsForAccount } from "@/lib/sync/contacts";

export type AccountSyncResult = {
  accountId: string;
  email: string;
  contactsSynced: number;
  eventsSynced: number;
  contactsError: string | null;
  calendarError: string | null;
};

export type SyncAllResult = {
  contacts: number;
  events: number;
  accounts: AccountSyncResult[];
};

export async function syncGoogleAccount(accountId: string): Promise<AccountSyncResult> {
  const db = getDb();
  const [account] = await db
    .select({
      id: googleAccounts.id,
      email: googleAccounts.email,
    })
    .from(googleAccounts)
    .where(eq(googleAccounts.id, accountId))
    .limit(1);

  if (!account) {
    throw new Error("Google account not found");
  }

  let contactsSynced = 0;
  let eventsSynced = 0;
  let contactsError: string | null = null;
  let calendarError: string | null = null;

  try {
    contactsSynced = await syncContactsForAccount(accountId);
    await db
      .update(googleAccounts)
      .set({ lastContactsSyncError: null, updatedAt: new Date() })
      .where(eq(googleAccounts.id, accountId));
  } catch (error) {
    contactsError = error instanceof Error ? error.message : "Contact sync failed";
    await db
      .update(googleAccounts)
      .set({
        lastContactsSyncError: contactsError,
        updatedAt: new Date(),
      })
      .where(eq(googleAccounts.id, accountId));
  }

  try {
    eventsSynced = await syncCalendarForAccount(accountId);
    await db
      .update(googleAccounts)
      .set({ lastCalendarSyncError: null, updatedAt: new Date() })
      .where(eq(googleAccounts.id, accountId));
  } catch (error) {
    calendarError = error instanceof Error ? error.message : "Calendar sync failed";
    await db
      .update(googleAccounts)
      .set({
        lastCalendarSyncError: calendarError,
        updatedAt: new Date(),
      })
      .where(eq(googleAccounts.id, accountId));
  }

  return {
    accountId: account.id,
    email: account.email,
    contactsSynced,
    eventsSynced,
    contactsError,
    calendarError,
  };
}

export async function syncAllGoogleAccounts(): Promise<SyncAllResult> {
  const db = getDb();
  const accounts = await db
    .select({ id: googleAccounts.id })
    .from(googleAccounts);

  const results: AccountSyncResult[] = [];
  let contacts = 0;
  let events = 0;

  for (const account of accounts) {
    const result = await syncGoogleAccount(account.id);
    results.push(result);
    contacts += result.contactsSynced;
    events += result.eventsSynced;
  }

  return { contacts, events, accounts: results };
}

export async function runScheduledSync() {
  if (process.env.NODE_ENV === "test") {
    return;
  }

  console.info("[sync] Running scheduled sync");
  const result = await syncAllGoogleAccounts();
  console.info(
    `[sync] Complete: ${result.contacts} contacts, ${result.events} events`,
  );
  return result;
}
