import { listTags } from "@/lib/tags";
import { listCalendarEvents } from "@/lib/sync/calendar";
import { searchContacts } from "@/lib/sync/contacts";

export type CommandContactResult = {
  id: string;
  displayName: string | null;
  emails: string[];
  company: string | null;
};

export type CommandEventResult = {
  id: string;
  title: string | null;
  startTime: string | null;
  linkedContactId: string | null;
  linkedContactName: string | null;
};

export type CommandTagResult = {
  id: string;
  name: string;
};

export type CommandSearchResponse = {
  contacts: CommandContactResult[];
  events: CommandEventResult[];
  tags: CommandTagResult[];
};

function toEventResult(
  event: Awaited<ReturnType<typeof listCalendarEvents>>[number],
): CommandEventResult {
  return {
    id: event.id,
    title: event.title,
    startTime: event.startTime?.toISOString() ?? null,
    linkedContactId: event.linkedContactId,
    linkedContactName: event.linkedContactName,
  };
}

function matchesEvent(
  event: Awaited<ReturnType<typeof listCalendarEvents>>[number],
  query: string,
): boolean {
  const haystack = [
    event.title,
    event.linkedContactName,
    event.accountEmail,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(query);
}

async function searchCalendarEvents(
  query: string,
  limit: number,
  includeUpcomingWhenEmpty = false,
): Promise<CommandEventResult[]> {
  const events = await listCalendarEvents();
  const normalized = query.trim().toLowerCase();

  if (!normalized) {
    if (!includeUpcomingWhenEmpty) {
      return [];
    }

    const now = Date.now();
    return events
      .filter((event) => (event.startTime?.getTime() ?? 0) >= now)
      .slice(0, limit)
      .map(toEventResult);
  }

  return events
    .filter((event) => matchesEvent(event, normalized))
    .slice(0, limit)
    .map(toEventResult);
}

async function searchTags(query: string, limit: number): Promise<CommandTagResult[]> {
  const tags = await listTags();
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return [];
  }

  return tags
    .filter((tag) => tag.name.includes(normalized))
    .slice(0, limit)
    .map((tag) => ({ id: tag.id, name: tag.name }));
}

export async function commandSearch(
  query: string,
  options: { includeUpcomingEvents?: boolean } = {},
): Promise<CommandSearchResponse> {
  const trimmed = query.trim();
  const limit = 8;

  const [contacts, events, tags] = await Promise.all([
    trimmed
      ? searchContacts({ q: trimmed }).then((rows) =>
          rows.slice(0, limit).map((row) => ({
            id: row.id,
            displayName: row.displayName,
            emails: row.emails,
            company: row.company,
          })),
        )
      : Promise.resolve([]),
    searchCalendarEvents(trimmed, limit, options.includeUpcomingEvents && !trimmed),
    searchTags(trimmed, limit),
  ]);

  return { contacts, events, tags };
}
