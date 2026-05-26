import "temporal-polyfill/global";

import { describe, expect, it } from "vitest";

import {
  isSingleDayTimedEvent,
  pickScrollTargetForDay,
  pickScrollTargetForWeek,
} from "@/lib/calendar/auto-scroll";
import type { CalendarEventFeedItem } from "@/lib/sync/calendar-attendees";

const TZ = "America/New_York";

function event(
  id: string,
  startTime: string,
  endTime: string,
): CalendarEventFeedItem {
  return {
    id,
    title: id,
    description: null,
    startTime,
    endTime,
    googleAccountId: "acct",
    accountEmail: "test@example.com",
    linkedContactNames: [],
  };
}

describe("calendar auto-scroll", () => {
  it("detects single-day timed events", () => {
    expect(
      isSingleDayTimedEvent(
        "2026-05-26T09:00:00-04:00",
        "2026-05-26T10:00:00-04:00",
        TZ,
      ),
    ).toBe(true);
    expect(
      isSingleDayTimedEvent(
        "2026-05-26T00:00:00-04:00",
        "2026-05-27T00:00:00-04:00",
        TZ,
      ),
    ).toBe(false);
  });

  it("picks the next upcoming timed event for today", () => {
    const selectedDate = Temporal.PlainDate.from("2026-05-26");
    const now = Temporal.ZonedDateTime.from("2026-05-26T14:00:00-04:00[America/New_York]");
    const events = [
      event("early", "2026-05-26T09:00:00-04:00", "2026-05-26T10:00:00-04:00"),
      event("next", "2026-05-26T15:00:00-04:00", "2026-05-26T16:00:00-04:00"),
      event("later", "2026-05-26T17:00:00-04:00", "2026-05-26T18:00:00-04:00"),
    ];

    expect(
      pickScrollTargetForDay(events, selectedDate, TZ, now)?.id,
    ).toBe("next");
  });

  it("picks the earliest timed event for another day", () => {
    const selectedDate = Temporal.PlainDate.from("2026-05-27");
    const events = [
      event("late", "2026-05-27T15:00:00-04:00", "2026-05-27T16:00:00-04:00"),
      event("early", "2026-05-27T09:00:00-04:00", "2026-05-27T10:00:00-04:00"),
    ];

    expect(
      pickScrollTargetForDay(events, selectedDate, TZ)?.id,
    ).toBe("early");
  });

  it("picks the earliest timed event in the visible week", () => {
    const range = {
      start: Temporal.ZonedDateTime.from("2026-05-25T00:00:00-04:00[America/New_York]"),
      end: Temporal.ZonedDateTime.from("2026-05-31T23:59:00-04:00[America/New_York]"),
    };
    const events = [
      event("wed", "2026-05-27T15:00:00-04:00", "2026-05-27T16:00:00-04:00"),
      event("mon", "2026-05-25T10:00:00-04:00", "2026-05-25T11:00:00-04:00"),
      event("all-day", "2026-05-26T00:00:00-04:00", "2026-05-27T00:00:00-04:00"),
    ];

    expect(pickScrollTargetForWeek(events, range, TZ)?.id).toBe("mon");
  });
});
