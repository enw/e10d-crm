import Link from "next/link";

import { LogoutButton } from "@/components/logout-button";
import { listCalendarEvents } from "@/lib/sync/calendar";

export const dynamic = "force-dynamic";

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

export default async function CalendarPage() {
  const events = await listCalendarEvents();

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-8">
      <header className="flex items-center justify-between gap-4 border-b border-zinc-200 pb-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            Calendar
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {events.length} event{events.length === 1 ? "" : "s"} synced (30 days
            past · 90 days future)
          </p>
        </div>
        <nav className="flex items-center gap-3 text-sm">
          <Link href="/contacts" className="text-zinc-600 hover:text-zinc-900">
            Contacts
          </Link>
          <Link href="/settings" className="text-zinc-600 hover:text-zinc-900">
            Settings
          </Link>
          <LogoutButton />
        </nav>
      </header>

      {events.length === 0 ? (
        <section className="mt-8 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-8 text-center text-sm text-zinc-600">
          No calendar events yet. Connect Google and run sync from{" "}
          <Link href="/settings" className="font-medium text-zinc-900 underline">
            Settings
          </Link>
          .
        </section>
      ) : (
        <ul className="mt-8 divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white">
          {events.map((event) => (
            <li key={event.id} className="px-4 py-3">
              <p className="font-medium text-zinc-900">
                {event.title || "Untitled event"}
              </p>
              <p className="text-sm text-zinc-500">
                {formatEventTime(event.startTime, event.endTime)}
              </p>
              <p className="text-xs text-zinc-500">
                {event.accountEmail}
                {event.linkedContactId && event.linkedContactName ? (
                  <>
                    {" · "}
                    <Link
                      href={`/contacts/${event.linkedContactId}`}
                      className="text-zinc-700 underline hover:text-zinc-900"
                    >
                      {event.linkedContactName}
                    </Link>
                  </>
                ) : null}
              </p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
