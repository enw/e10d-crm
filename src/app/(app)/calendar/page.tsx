import Link from "next/link";
import { Suspense } from "react";

import { CrmCalendar } from "@/components/calendar/crm-calendar";
import {
  CALENDAR_FUTURE_DAYS,
  CALENDAR_PAST_DAYS,
} from "@/lib/sync/calendar";
import { listCalendarEventsForFeed } from "@/lib/sync/calendar-attendees";

export const dynamic = "force-dynamic";

type CalendarPageProps = {
  searchParams: Promise<{ event?: string; date?: string }>;
};

export default async function CalendarPage({ searchParams }: CalendarPageProps) {
  const { event: initialEventId, date: initialDate } = await searchParams;
  const events = await listCalendarEventsForFeed();

  return (
    <main className="flex min-h-0 flex-1 flex-col">
      <header className="border-b border-border px-4 py-4 md:px-6">
        <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Meeting prep · {CALENDAR_PAST_DAYS}d past · {CALENDAR_FUTURE_DAYS}d
          future
        </p>
      </header>

      {events.length === 0 ? (
        <section className="mx-4 mt-8 rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center text-sm text-muted-foreground md:mx-6">
          No calendar events yet. Connect Google and run sync from{" "}
          <Link href="/settings" className="font-medium text-foreground underline">
            Settings
          </Link>
          .
        </section>
      ) : (
        <Suspense fallback={null}>
          <CrmCalendar
            initialEvents={events}
            initialEventId={initialEventId}
            initialDate={initialDate}
          />
        </Suspense>
      )}
    </main>
  );
}
