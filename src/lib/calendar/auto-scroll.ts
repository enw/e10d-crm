import type { CalendarEventFeedItem } from "@/lib/sync/calendar-attendees";

export type DateRange = {
  start: Temporal.ZonedDateTime;
  end: Temporal.ZonedDateTime;
};

function zoned(iso: string, timeZone: string) {
  return Temporal.Instant.from(iso).toZonedDateTimeISO(timeZone);
}

export function isSingleDayTimedEvent(
  startTime: string,
  endTime: string,
  timeZone: string,
) {
  const start = zoned(startTime, timeZone);
  const end = zoned(endTime, timeZone);
  return start.toPlainDate().equals(end.toPlainDate());
}

function compareStart(a: CalendarEventFeedItem, b: CalendarEventFeedItem) {
  return Temporal.Instant.compare(
    Temporal.Instant.from(a.startTime!),
    Temporal.Instant.from(b.startTime!),
  );
}

export function pickScrollTargetForDay(
  events: CalendarEventFeedItem[],
  selectedDate: Temporal.PlainDate,
  timeZone: string,
  now: Temporal.ZonedDateTime = Temporal.Now.zonedDateTimeISO(timeZone),
): CalendarEventFeedItem | null {
  const dayStr = selectedDate.toString();
  const timed = events
    .filter(
      (event) =>
        event.startTime &&
        event.endTime &&
        isSingleDayTimedEvent(event.startTime, event.endTime, timeZone),
    )
    .filter(
      (event) =>
        zoned(event.startTime!, timeZone).toPlainDate().toString() === dayStr,
    )
    .sort(compareStart);

  if (timed.length === 0) {
    return null;
  }

  if (selectedDate.equals(now.toPlainDate())) {
    const upcoming = timed.find(
      (event) =>
        Temporal.Instant.from(event.startTime!).epochNanoseconds >=
        now.epochNanoseconds,
    );
    return upcoming ?? timed[timed.length - 1];
  }

  return timed[0];
}

export function pickScrollTargetForWeek(
  events: CalendarEventFeedItem[],
  range: DateRange,
  timeZone: string,
): CalendarEventFeedItem | null {
  const rangeStart = range.start.toPlainDate();
  const rangeEnd = range.end.toPlainDate();

  const timed = events
    .filter(
      (event) =>
        event.startTime &&
        event.endTime &&
        isSingleDayTimedEvent(event.startTime, event.endTime, timeZone),
    )
    .filter((event) => {
      const day = zoned(event.startTime!, timeZone).toPlainDate();
      return (
        Temporal.PlainDate.compare(day, rangeStart) >= 0 &&
        Temporal.PlainDate.compare(day, rangeEnd) <= 0
      );
    })
    .sort(compareStart);

  return timed[0] ?? null;
}

export function scrollTimeGridToEventId(
  root: HTMLElement,
  eventId: string,
): boolean {
  const container = root.querySelector(".sx__view-container");
  const eventEl = root.querySelector(
    `.sx__time-grid-event[data-event-id="${CSS.escape(eventId)}"]:not(.is-event-copy)`,
  );

  if (!(container instanceof HTMLElement) || !(eventEl instanceof HTMLElement)) {
    return false;
  }

  const offset =
    eventEl.getBoundingClientRect().top -
    container.getBoundingClientRect().top +
    container.scrollTop;
  container.scrollTo({ top: offset, behavior: "instant" });
  return true;
}

export function scrollTimeGridToTime(
  root: HTMLElement,
  time: Temporal.ZonedDateTime,
) {
  const container = root.querySelector(".sx__view-container");
  const grid = root.querySelector(".sx__week-grid");
  const header = root.querySelector(".sx__week-header");

  if (!(container instanceof HTMLElement) || !(grid instanceof HTMLElement)) {
    return;
  }

  const timePoints = time.hour * 100 + time.minute;
  const percent = (timePoints / 2400) * 100;
  const headerHeight = header instanceof HTMLElement ? header.offsetHeight : 0;

  container.scrollTo({
    top: headerHeight + (grid.offsetHeight * percent) / 100,
    behavior: "instant",
  });
}

export function scrollTimeGridToDefault(
  root: HTMLElement,
  selectedDate: Temporal.PlainDate,
  timeZone: string,
) {
  const now = Temporal.Now.zonedDateTimeISO(timeZone);
  const fallbackTime = selectedDate.equals(now.toPlainDate())
    ? now
    : Temporal.ZonedDateTime.from({
        year: selectedDate.year,
        month: selectedDate.month,
        day: selectedDate.day,
        hour: 8,
        minute: 0,
        timeZone,
      });

  scrollTimeGridToTime(root, fallbackTime);
}
