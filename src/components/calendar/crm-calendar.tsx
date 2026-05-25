"use client";

import "temporal-polyfill/global";
import "@schedule-x/theme-default/dist/index.css";

import {
  createViewDay,
  createViewMonthGrid,
  createViewWeek,
  type CalendarEvent,
} from "@schedule-x/calendar";
import { createCalendarControlsPlugin } from "@schedule-x/calendar-controls";
import { createEventsServicePlugin } from "@schedule-x/events-service";
import { ScheduleXCalendar, useNextCalendarApp } from "@schedule-x/react";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AccountLegend } from "@/components/account-legend";
import { EventPrepPanel } from "@/components/calendar/event-prep-panel";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  buildScheduleXCalendars,
  sortAccountSources,
  type AccountSource,
} from "@/lib/google/account-colors";
import type { CalendarEventFeedItem } from "@/lib/sync/calendar-attendees";

type CrmCalendarProps = {
  initialEvents: CalendarEventFeedItem[];
  accountSources: AccountSource[];
  initialEventId?: string;
  initialDate?: string;
};

function toZonedDateTime(iso: string): Temporal.ZonedDateTime {
  return Temporal.Instant.from(iso).toZonedDateTimeISO(
    Temporal.Now.timeZoneId(),
  );
}

function feedToScheduleX(events: CalendarEventFeedItem[]): CalendarEvent[] {
  return events.flatMap((event) => {
    if (!event.startTime || !event.endTime) {
      return [];
    }

    return [
      {
        id: event.id,
        title: event.title || "Untitled event",
        start: toZonedDateTime(event.startTime),
        end: toZonedDateTime(event.endTime),
        calendarId: event.googleAccountId,
        people: event.linkedContactNames,
        description: event.description ?? undefined,
      },
    ];
  });
}

export function CrmCalendar({
  initialEvents,
  accountSources,
  initialEventId,
  initialDate,
}: CrmCalendarProps) {
  const { resolvedTheme } = useTheme();
  const orderedAccounts = useMemo(
    () => sortAccountSources(accountSources),
    [accountSources],
  );
  const calendars = useMemo(
    () => buildScheduleXCalendars(orderedAccounts),
    [orderedAccounts],
  );
  const [selectedEventId, setSelectedEventId] = useState<string | null>(
    initialEventId ?? null,
  );
  const [panelOpen, setPanelOpen] = useState(Boolean(initialEventId));
  const [controlsPlugin] = useState(() => createCalendarControlsPlugin());
  const [eventsPlugin] = useState(() => createEventsServicePlugin());

  const calendar = useNextCalendarApp(
    {
      views: [createViewDay(), createViewWeek(), createViewMonthGrid()],
      defaultView: "day",
      selectedDate: initialDate
        ? Temporal.PlainDate.from(initialDate)
        : Temporal.Now.plainDateISO(),
      events: feedToScheduleX(initialEvents),
      calendars,
      isDark: resolvedTheme === "dark",
      callbacks: {
        onEventClick(calendarEvent) {
          setSelectedEventId(String(calendarEvent.id));
          setPanelOpen(true);
        },
      },
    },
    [controlsPlugin, eventsPlugin],
  );

  useEffect(() => {
    if (initialDate) {
      controlsPlugin.setDate(Temporal.PlainDate.from(initialDate));
    }
  }, [initialDate, controlsPlugin]);

  useEffect(() => {
    if (!calendar) {
      return;
    }
    calendar.setTheme(resolvedTheme === "dark" ? "dark" : "light");
  }, [calendar, resolvedTheme]);

  useEffect(() => {
    eventsPlugin.set(feedToScheduleX(initialEvents));
  }, [initialEvents, eventsPlugin]);

  const setView = useCallback(
    (view: string) => {
      controlsPlugin.setView(view);
    },
    [controlsPlugin],
  );

  const handlePanelOpenChange = useCallback((open: boolean) => {
    setPanelOpen(open);
    if (!open) {
      setSelectedEventId(null);
    }
  }, []);

  const handleContactCreated = useCallback(() => {
    window.location.reload();
  }, []);

  if (!calendar) {
    return null;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border px-4 py-3">
        <Tabs defaultValue="day" onValueChange={setView}>
          <TabsList>
            <TabsTrigger value="day">Day</TabsTrigger>
            <TabsTrigger value="week">Week</TabsTrigger>
            <TabsTrigger value="month-grid">Month</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center">
          {orderedAccounts.length > 0 ? (
            <AccountLegend
              accounts={orderedAccounts}
              className="flex flex-wrap justify-end gap-x-4 gap-y-1"
            />
          ) : null}
          <p className="text-sm text-muted-foreground">
            {initialEvents.length} event{initialEvents.length === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      <div className="min-h-[560px] flex-1 overflow-hidden p-2 [&_.sx__calendar]:h-full">
        <ScheduleXCalendar calendarApp={calendar} />
      </div>

      <EventPrepPanel
        eventId={selectedEventId}
        accountSources={orderedAccounts}
        open={panelOpen}
        onOpenChange={handlePanelOpenChange}
        onContactCreated={handleContactCreated}
      />
    </div>
  );
}
