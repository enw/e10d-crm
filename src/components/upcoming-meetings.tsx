import Link from "next/link";

import type { ContactCalendarEvent } from "@/lib/sync/calendar";

function formatEventTime(start: Date | null, end: Date | null) {
  if (!start) {
    return "Unknown time";
  }

  const startLabel = start.toLocaleString();
  if (!end) {
    return startLabel;
  }

  return `${startLabel} – ${end.toLocaleTimeString()}`;
}

export function UpcomingMeetings({
  events,
}: {
  events: ContactCalendarEvent[];
}) {
  if (events.length === 0) {
    return <p className="text-sm text-zinc-500">No upcoming meetings linked.</p>;
  }

  return (
    <ul className="space-y-3">
      {events.map((event) => (
        <li key={event.id} className="rounded-lg border border-zinc-200 px-3 py-2">
          <p className="font-medium text-zinc-900">
            {event.title || "Untitled event"}
          </p>
          <p className="text-sm text-zinc-500">
            {formatEventTime(event.startTime, event.endTime)}
          </p>
          <p className="text-xs text-zinc-500">
            {event.accountEmail} ·{" "}
            <Link href="/calendar" className="underline hover:text-zinc-900">
              Calendar
            </Link>
          </p>
        </li>
      ))}
    </ul>
  );
}
