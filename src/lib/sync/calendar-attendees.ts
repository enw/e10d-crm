import { asc, desc, eq, gte, inArray, sql } from "drizzle-orm";

import { getDb } from "@/db";
import {
  calendarEvents,
  contacts,
  googleAccounts,
  interactions,
  tags,
  contactTags,
} from "@/db/schema";
import { findContactIdByEmail, normalizeEmail } from "@/lib/sync/contact-merge";

export type AttendeeRecord = {
  email?: string;
  name?: string;
  responseStatus?: string;
};

export type ResolvedAttendee = {
  email: string;
  name: string | null;
  responseStatus: string | null;
  contactId: string | null;
  contactName: string | null;
  company: string | null;
  tags: string[];
  lastInteractionAt: Date | null;
  latestNote: string | null;
};

export type CalendarEventDetail = {
  id: string;
  title: string | null;
  description: string | null;
  startTime: Date | null;
  endTime: Date | null;
  accountEmail: string;
  attendees: ResolvedAttendee[];
};

export type CalendarEventFeedItem = {
  id: string;
  title: string | null;
  description: string | null;
  startTime: string | null;
  endTime: string | null;
  accountEmail: string;
  linkedContactNames: string[];
};

export type ContactMeetingSummary = {
  id: string;
  title: string | null;
  startTime: Date | null;
  endTime: Date | null;
  accountEmail: string;
};

export type NextMeetingBadge = {
  contactId: string;
  eventId: string;
  title: string | null;
  startTime: Date;
};

type ContactRow = {
  id: string;
  displayName: string;
  emails: string[];
  company: string | null;
  lastInteractionAt: Date | null;
};

type ContactContext = {
  byEmail: Map<string, ContactRow>;
  tagsByContact: Map<string, string[]>;
  latestNoteByContact: Map<string, string>;
};

function attendeeEmails(
  attendees: AttendeeRecord[] | null | undefined,
): string[] {
  if (!attendees) {
    return [];
  }

  return attendees
    .map((attendee) => attendee.email)
    .filter((email): email is string => Boolean(email))
    .map(normalizeEmail);
}

export function eventIncludesContactEmail(
  attendees: AttendeeRecord[] | null | undefined,
  contactEmails: string[],
): boolean {
  const contactSet = new Set(contactEmails.map(normalizeEmail));
  return attendeeEmails(attendees).some((email) => contactSet.has(email));
}

async function loadContactContext(): Promise<ContactContext> {
  const db = getDb();
  const [contactRows, tagRows, noteRows] = await Promise.all([
    db
      .select({
        id: contacts.id,
        displayName: contacts.displayName,
        emails: contacts.emails,
        company: contacts.company,
        lastInteractionAt: contacts.lastInteractionAt,
      })
      .from(contacts),
    db
      .select({
        contactId: contactTags.contactId,
        tagName: tags.name,
      })
      .from(contactTags)
      .innerJoin(tags, eq(contactTags.tagId, tags.id)),
    db
      .select({
        contactId: interactions.contactId,
        content: interactions.content,
        occurredAt: interactions.occurredAt,
      })
      .from(interactions)
      .where(eq(interactions.type, "note"))
      .orderBy(desc(interactions.occurredAt)),
  ]);

  const byEmail = new Map<string, ContactRow>();
  for (const contact of contactRows) {
    for (const email of contact.emails) {
      byEmail.set(normalizeEmail(email), contact);
    }
  }

  const tagsByContact = new Map<string, string[]>();
  for (const row of tagRows) {
    const existing = tagsByContact.get(row.contactId) ?? [];
    existing.push(row.tagName);
    tagsByContact.set(row.contactId, existing);
  }

  const latestNoteByContact = new Map<string, string>();
  for (const row of noteRows) {
    if (!latestNoteByContact.has(row.contactId) && row.content) {
      latestNoteByContact.set(row.contactId, row.content);
    }
  }

  return { byEmail, tagsByContact, latestNoteByContact };
}

export function resolveAttendees(
  attendees: AttendeeRecord[] | null | undefined,
  ownerEmail: string,
  context: ContactContext,
): ResolvedAttendee[] {
  const owner = normalizeEmail(ownerEmail);
  const seen = new Set<string>();

  return (attendees ?? []).flatMap((attendee) => {
    if (!attendee.email) {
      return [];
    }

    const email = normalizeEmail(attendee.email);
    if (email === owner || seen.has(email)) {
      return [];
    }
    seen.add(email);

    const contact = context.byEmail.get(email);
    return [
      {
        email: attendee.email,
        name: attendee.name ?? null,
        responseStatus: attendee.responseStatus ?? null,
        contactId: contact?.id ?? null,
        contactName: contact?.displayName || null,
        company: contact?.company ?? null,
        tags: contact ? (context.tagsByContact.get(contact.id) ?? []) : [],
        lastInteractionAt: contact?.lastInteractionAt ?? null,
        latestNote: contact
          ? (context.latestNoteByContact.get(contact.id) ?? null)
          : null,
      },
    ];
  });
}

export function linkedContactNamesFromAttendees(
  attendees: AttendeeRecord[] | null | undefined,
  ownerEmail: string,
  context: ContactContext,
): string[] {
  return resolveAttendees(attendees, ownerEmail, context)
    .filter((attendee) => attendee.contactId)
    .map((attendee) => attendee.contactName || attendee.email);
}

export async function getCalendarEventById(
  eventId: string,
): Promise<CalendarEventDetail | null> {
  const db = getDb();
  const [row] = await db
    .select({
      id: calendarEvents.id,
      title: calendarEvents.title,
      description: calendarEvents.description,
      startTime: calendarEvents.startTime,
      endTime: calendarEvents.endTime,
      accountEmail: googleAccounts.email,
      attendees: calendarEvents.attendees,
    })
    .from(calendarEvents)
    .innerJoin(
      googleAccounts,
      eq(calendarEvents.googleAccountId, googleAccounts.id),
    )
    .where(eq(calendarEvents.id, eventId))
    .limit(1);

  if (!row) {
    return null;
  }

  const context = await loadContactContext();
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    startTime: row.startTime,
    endTime: row.endTime,
    accountEmail: row.accountEmail,
    attendees: resolveAttendees(row.attendees, row.accountEmail, context),
  };
}

export async function listCalendarEventsForFeed(): Promise<
  CalendarEventFeedItem[]
> {
  const db = getDb();
  const rows = await db
    .select({
      id: calendarEvents.id,
      title: calendarEvents.title,
      description: calendarEvents.description,
      startTime: calendarEvents.startTime,
      endTime: calendarEvents.endTime,
      accountEmail: googleAccounts.email,
      attendees: calendarEvents.attendees,
    })
    .from(calendarEvents)
    .innerJoin(
      googleAccounts,
      eq(calendarEvents.googleAccountId, googleAccounts.id),
    )
    .orderBy(asc(calendarEvents.startTime));

  const context = await loadContactContext();

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    startTime: row.startTime?.toISOString() ?? null,
    endTime: row.endTime?.toISOString() ?? null,
    accountEmail: row.accountEmail,
    linkedContactNames: linkedContactNamesFromAttendees(
      row.attendees,
      row.accountEmail,
      context,
    ),
  }));
}

export async function listMeetingsForContact(
  contactId: string,
): Promise<{ upcoming: ContactMeetingSummary[]; past: ContactMeetingSummary[] }> {
  const db = getDb();
  const [contact] = await db
    .select({ emails: contacts.emails })
    .from(contacts)
    .where(eq(contacts.id, contactId))
    .limit(1);

  if (!contact || contact.emails.length === 0) {
    return { upcoming: [], past: [] };
  }

  const normalizedEmails = contact.emails.map(normalizeEmail);
  const emailList = sql.join(
    normalizedEmails.map((email) => sql`${email}`),
    sql`, `,
  );

  const rows = await db
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
      sql`EXISTS (
        SELECT 1 FROM jsonb_array_elements(${calendarEvents.attendees}) AS attendee
        WHERE lower(attendee->>'email') IN (${emailList})
      )`,
    )
    .orderBy(asc(calendarEvents.startTime));

  const now = Date.now();
  const upcoming: ContactMeetingSummary[] = [];
  const past: ContactMeetingSummary[] = [];

  for (const row of rows) {
    const startMs = row.startTime?.getTime() ?? 0;
    const item = { ...row };
    if (startMs >= now) {
      upcoming.push(item);
    } else {
      past.push(item);
    }
  }

  past.reverse();
  return { upcoming, past };
}

export async function getNextMeetingsForContacts(
  contactIds: string[],
): Promise<Map<string, NextMeetingBadge>> {
  if (contactIds.length === 0) {
    return new Map();
  }

  const db = getDb();
  const contactRows = await db
    .select({ id: contacts.id, emails: contacts.emails })
    .from(contacts)
    .where(inArray(contacts.id, contactIds));

  const emailToContactId = new Map<string, string>();
  for (const contact of contactRows) {
    for (const email of contact.emails) {
      emailToContactId.set(normalizeEmail(email), contact.id);
    }
  }

  if (emailToContactId.size === 0) {
    return new Map();
  }

  const now = new Date();
  const rows = await db
    .select({
      id: calendarEvents.id,
      title: calendarEvents.title,
      startTime: calendarEvents.startTime,
      attendees: calendarEvents.attendees,
    })
    .from(calendarEvents)
    .where(gte(calendarEvents.startTime, now))
    .orderBy(asc(calendarEvents.startTime));

  const result = new Map<string, NextMeetingBadge>();

  for (const row of rows) {
    if (!row.startTime) {
      continue;
    }

    for (const email of attendeeEmails(row.attendees)) {
      const contactId = emailToContactId.get(email);
      if (contactId && !result.has(contactId)) {
        result.set(contactId, {
          contactId,
          eventId: row.id,
          title: row.title,
          startTime: row.startTime,
        });
      }
    }
  }

  return result;
}

export async function createContactFromAttendee(input: {
  email: string;
  displayName?: string;
}): Promise<{ id: string; created: boolean }> {
  const email = normalizeEmail(input.email);
  if (!email) {
    throw new Error("Email is required");
  }

  const db = getDb();
  const allContacts = await db
    .select({ id: contacts.id, emails: contacts.emails })
    .from(contacts);

  const existingId = findContactIdByEmail(allContacts, email);
  if (existingId) {
    return { id: existingId, created: false };
  }

  const displayName =
    input.displayName?.trim() ||
    email.split("@")[0]?.replace(/[._]/g, " ") ||
    email;

  const [created] = await db
    .insert(contacts)
    .values({
      displayName,
      emails: [email],
    })
    .returning({ id: contacts.id });

  return { id: created.id, created: true };
}
