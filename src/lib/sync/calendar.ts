import { and, asc, eq, gte } from "drizzle-orm";
import { google } from "googleapis";

import { getDb } from "@/db";
import { calendarEvents, contacts, googleAccounts } from "@/db/schema";
import { getGoogleAccountById } from "@/lib/google/accounts";
import { getValidAccessToken } from "@/lib/google/tokens";
import { findContactIdByEmail, normalizeEmail } from "@/lib/sync/contact-merge";

export const CALENDAR_PAST_DAYS = 30;
export const CALENDAR_FUTURE_DAYS = 90;

type ParsedCalendarEvent = {
  googleEventId: string;
  title: string | null;
  description: string | null;
  startTime: Date | null;
  endTime: Date | null;
  attendees: Array<{ email?: string; name?: string; responseStatus?: string }>;
};

export async function syncCalendarForAccount(
  googleAccountId: string,
): Promise<number> {
  const account = await getGoogleAccountById(googleAccountId);
  if (!account) {
    throw new Error("Google account not found");
  }

  const accessToken = await getValidAccessToken(googleAccountId);
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  const calendar = google.calendar({ version: "v3", auth });

  const timeMin = new Date(
    Date.now() - CALENDAR_PAST_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();
  const timeMax = new Date(
    Date.now() + CALENDAR_FUTURE_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  let pageToken: string | undefined;
  let synced = 0;

  const db = getDb();
  const allContacts = await db
    .select({ id: contacts.id, emails: contacts.emails })
    .from(contacts);
  const ownerEmail = normalizeEmail(account.email);

  do {
    const response = await calendar.events.list({
      calendarId: "primary",
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: "startTime",
      maxResults: 250,
      pageToken,
    });

    const items = response.data.items ?? [];
    for (const item of items) {
      const parsed = parseGoogleEvent(item as Record<string, unknown>);
      if (!parsed) {
        continue;
      }

      const linkedContactId = linkEventToContact(
        parsed.attendees,
        ownerEmail,
        allContacts,
      );

      const now = new Date();
      await db
        .insert(calendarEvents)
        .values({
          googleAccountId,
          googleEventId: parsed.googleEventId,
          title: parsed.title,
          description: parsed.description,
          startTime: parsed.startTime,
          endTime: parsed.endTime,
          attendees: parsed.attendees,
          linkedContactId,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [
            calendarEvents.googleAccountId,
            calendarEvents.googleEventId,
          ],
          set: {
            title: parsed.title,
            description: parsed.description,
            startTime: parsed.startTime,
            endTime: parsed.endTime,
            attendees: parsed.attendees,
            linkedContactId,
            updatedAt: now,
          },
        });

      synced += 1;
    }

    pageToken = response.data.nextPageToken ?? undefined;
  } while (pageToken);

  await db
    .update(googleAccounts)
    .set({ lastCalendarSyncAt: new Date(), updatedAt: new Date() })
    .where(eq(googleAccounts.id, googleAccountId));

  return synced;
}

export function linkEventToContact(
  attendees: ParsedCalendarEvent["attendees"],
  ownerEmail: string,
  contactRows: Array<{ id: string; emails: string[] }>,
): string | null {
  for (const attendee of attendees) {
    if (!attendee.email) {
      continue;
    }

    const normalized = normalizeEmail(attendee.email);
    if (normalized === ownerEmail) {
      continue;
    }

    const contactId = findContactIdByEmail(contactRows, normalized);
    if (contactId) {
      return contactId;
    }
  }

  return null;
}

function parseGoogleEvent(
  event: Record<string, unknown>,
): ParsedCalendarEvent | null {
  const googleEventId = event.id;
  if (typeof googleEventId !== "string") {
    return null;
  }

  const summary = typeof event.summary === "string" ? event.summary : null;
  const description =
    typeof event.description === "string" ? event.description : null;

  const start = readEventDateTime(event.start);
  const end = readEventDateTime(event.end);

  const attendees = Array.isArray(event.attendees)
    ? event.attendees.flatMap((entry) => {
        if (!entry || typeof entry !== "object") {
          return [];
        }
        const record = entry as Record<string, unknown>;
        return [
          {
            email:
              typeof record.email === "string" ? record.email : undefined,
            name:
              typeof record.displayName === "string"
                ? record.displayName
                : undefined,
            responseStatus:
              typeof record.responseStatus === "string"
                ? record.responseStatus
                : undefined,
          },
        ];
      })
    : [];

  return {
    googleEventId,
    title: summary,
    description,
    startTime: start,
    endTime: end,
    attendees,
  };
}

function readEventDateTime(value: unknown): Date | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  if (typeof record.dateTime === "string") {
    const parsed = new Date(record.dateTime);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  if (typeof record.date === "string") {
    const parsed = new Date(`${record.date}T00:00:00.000Z`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
}

export type CalendarEventListItem = {
  id: string;
  title: string | null;
  startTime: Date | null;
  endTime: Date | null;
  accountEmail: string;
  linkedContactId: string | null;
  linkedContactName: string | null;
};

export async function listCalendarEvents(): Promise<CalendarEventListItem[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: calendarEvents.id,
      title: calendarEvents.title,
      startTime: calendarEvents.startTime,
      endTime: calendarEvents.endTime,
      accountEmail: googleAccounts.email,
      linkedContactId: calendarEvents.linkedContactId,
      linkedContactName: contacts.displayName,
    })
    .from(calendarEvents)
    .innerJoin(
      googleAccounts,
      eq(calendarEvents.googleAccountId, googleAccounts.id),
    )
    .leftJoin(contacts, eq(calendarEvents.linkedContactId, contacts.id))
    .orderBy(asc(calendarEvents.startTime));

  return rows;
}

export type ContactCalendarEvent = {
  id: string;
  title: string | null;
  startTime: Date | null;
  endTime: Date | null;
  accountEmail: string;
};

export async function listUpcomingEventsForContact(
  contactId: string,
  limit = 10,
): Promise<ContactCalendarEvent[]> {
  const db = getDb();
  const now = new Date();

  return db
    .select({
      id: calendarEvents.id,
      title: calendarEvents.title,
      startTime: calendarEvents.startTime,
      endTime: calendarEvents.endTime,
      accountEmail: googleAccounts.email,
    })
    .from(calendarEvents)
    .innerJoin(
      googleAccounts,
      eq(calendarEvents.googleAccountId, googleAccounts.id),
    )
    .where(
      and(
        eq(calendarEvents.linkedContactId, contactId),
        gte(calendarEvents.startTime, now),
      ),
    )
    .orderBy(asc(calendarEvents.startTime))
    .limit(limit);
}

export async function syncAllGoogleAccounts() {
  const { syncAllGoogleAccounts: runSync } = await import("@/lib/sync/runner");
  return runSync();
}
