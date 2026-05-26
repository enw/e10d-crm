import "temporal-polyfill/global";

import { describe, expect, it } from "vitest";

import {
  handleCalendarKeyboardEvent,
  shouldIgnoreCalendarKeyboardEvent,
  stepCalendarDate,
} from "@/lib/calendar/keyboard-nav";

describe("calendar keyboard nav", () => {
  it("steps by day, week, and month", () => {
    const date = Temporal.PlainDate.from("2026-05-26");
    expect(stepCalendarDate("day", date, 1).toString()).toBe("2026-05-27");
    expect(stepCalendarDate("week", date, -1).toString()).toBe("2026-05-19");
    expect(stepCalendarDate("month-grid", date, 1).toString()).toBe("2026-06-26");
  });

  it("ignores keyboard events in inputs and when panel is open", () => {
    const input = {
      isContentEditable: false,
      closest: () => input,
    } as unknown as HTMLElement;
    expect(
      shouldIgnoreCalendarKeyboardEvent(
        { target: input } as KeyboardEvent,
        { panelOpen: false },
      ),
    ).toBe(true);
    expect(
      shouldIgnoreCalendarKeyboardEvent(
        {
          target: { isContentEditable: false, closest: () => null },
        } as unknown as KeyboardEvent,
        { panelOpen: true },
      ),
    ).toBe(true);
  });

  it("moves dates with arrow keys and jumps to today with t", () => {
    const selectedDate = Temporal.PlainDate.from("2026-05-26");
    const changes: Temporal.PlainDate[] = [];
    const target = {
      isContentEditable: false,
      closest: () => null,
    } as unknown as HTMLElement;

    handleCalendarKeyboardEvent(
      {
        key: "ArrowRight",
        target,
        preventDefault() {},
      } as KeyboardEvent,
      {
        panelOpen: false,
        currentView: "day",
        selectedDate,
        onDateChange: (date) => changes.push(date),
      },
    );

    handleCalendarKeyboardEvent(
      {
        key: "t",
        target,
        preventDefault() {},
      } as KeyboardEvent,
      {
        panelOpen: false,
        currentView: "week",
        selectedDate,
        onDateChange: (date) => changes.push(date),
      },
    );

    expect(changes[0]?.toString()).toBe("2026-05-27");
    expect(changes[1]?.equals(Temporal.Now.plainDateISO())).toBe(true);
  });
});
