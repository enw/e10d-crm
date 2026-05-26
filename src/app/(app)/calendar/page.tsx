import Link from "next/link";
import { Suspense } from "react";

import { CrmCalendar } from "@/components/calendar/crm-calendar";
import { listGoogleAccountSources } from "@/lib/google/accounts";
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
  const [events, accountSources] = await Promise.all([
    listCalendarEventsForFeed(),
    listGoogleAccountSources(),
  ]);

  return (
    <main className="flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden">
      <header className="flex shrink-0 flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-border px-4 py-3 md:px-6">
        <h1 className="text-xl leading-none sm:text-2xl">Calendar</h1>
        <p className="text-sm text-muted-foreground">
          {CALENDAR_PAST_DAYS}d past · {CALENDAR_FUTURE_DAYS}d future
        </p>
      </header>

      {events.length === 0 ? (
        <section className="mx-4 mt-8 rounded-sm border border-dashed border-border bg-muted/40 p-8 text-center text-sm text-muted-foreground md:mx-6">
          No calendar events yet. Connect Google and run sync from{" "}
          <Link
            href="/settings"
            className="text-foreground underline decoration-accent/50 underline-offset-4"
          >
            Settings
          </Link>
          .
        </section>
      ) : (
        <Suspense fallback={null}>
          <CrmCalendar
            initialEvents={events}
            accountSources={accountSources}
            initialEventId={initialEventId}
            initialDate={initialDate}
          />
        </Suspense>
      )}
    </main>
  );
}
