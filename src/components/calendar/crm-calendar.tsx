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
import { ChevronDown, ChevronUp } from "lucide-react";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { AccountLegend } from "@/components/account-legend";
import { EventPrepPanel } from "@/components/calendar/event-prep-panel";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  buildScheduleXCalendars,
  sortAccountSources,
  type AccountSource,
} from "@/lib/google/account-colors";
import type { CalendarEventFeedItem } from "@/lib/sync/calendar-attendees";

const DATE_GRID_EXPANDED_KEY = "e10d-calendar-date-grid-expanded";

function countDateGridEvents(root: HTMLElement) {
  return root.querySelectorAll(
    ".sx__date-grid-event:not(.sx__date-grid-event--copy)",
  ).length;
}

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
  const [currentView, setCurrentView] = useState("day");
  const [dateGridExpanded, setDateGridExpanded] = useState(false);
  const [allDayCount, setAllDayCount] = useState(0);
  const calendarRootRef = useRef<HTMLDivElement>(null);
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
    setDateGridExpanded(
      localStorage.getItem(DATE_GRID_EXPANDED_KEY) === "true",
    );
  }, []);

  useEffect(() => {
    const root = calendarRootRef.current;
    if (!root || !calendar) {
      return;
    }

    const updateCount = () => {
      setAllDayCount(countDateGridEvents(root));
    };

    updateCount();
    const observer = new MutationObserver(updateCount);
    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [calendar, currentView, initialEvents]);

  useEffect(() => {
    eventsPlugin.set(feedToScheduleX(initialEvents));
  }, [initialEvents, eventsPlugin]);

  const setView = useCallback(
    (view: string) => {
      setCurrentView(view);
      controlsPlugin.setView(view);
    },
    [controlsPlugin],
  );

  const toggleDateGrid = useCallback(() => {
    setDateGridExpanded((expanded) => {
      const next = !expanded;
      localStorage.setItem(DATE_GRID_EXPANDED_KEY, String(next));
      return next;
    });
  }, []);

  const showDateGridToggle =
    (currentView === "day" || currentView === "week") && allDayCount > 0;

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
    <div
      ref={calendarRootRef}
      className={`crm-calendar flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden${
        showDateGridToggle && !dateGridExpanded
          ? " crm-calendar--date-grid-collapsed"
          : ""
      }`}
    >
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-border px-4 py-3 md:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <Tabs value={currentView} onValueChange={setView}>
            <TabsList className="h-8">
              <TabsTrigger value="day" className="px-2.5 text-xs">
                Day
              </TabsTrigger>
              <TabsTrigger value="week" className="px-2.5 text-xs">
                Week
              </TabsTrigger>
              <TabsTrigger value="month-grid" className="px-2.5 text-xs">
                Month
              </TabsTrigger>
            </TabsList>
          </Tabs>
          {showDateGridToggle ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1 px-2.5 text-xs"
              onClick={toggleDateGrid}
              aria-expanded={dateGridExpanded}
            >
              {dateGridExpanded ? (
                <ChevronUp className="size-3.5" aria-hidden />
              ) : (
                <ChevronDown className="size-3.5" aria-hidden />
              )}
              All-day ({allDayCount})
            </Button>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-1">
          {orderedAccounts.length > 0 ? (
            <AccountLegend
              accounts={orderedAccounts}
              className="flex flex-wrap justify-end gap-x-3 gap-y-1"
            />
          ) : null}
          <p className="text-xs text-muted-foreground">
            {initialEvents.length} event{initialEvents.length === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-1 overflow-hidden px-2 pb-2 pt-1 [&_.sx-react-calendar-wrapper]:col-start-1 [&_.sx-react-calendar-wrapper]:row-start-1">
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
