export type CalendarViewName = "day" | "week" | "month-grid";

export function stepCalendarDate(
  view: string,
  date: Temporal.PlainDate,
  direction: -1 | 1,
): Temporal.PlainDate {
  switch (view) {
    case "day":
      return date.add({ days: direction });
    case "week":
      return date.add({ days: 7 * direction });
    case "month-grid":
      return date.add({ months: direction });
    default:
      return date;
  }
}

export function shouldIgnoreCalendarKeyboardEvent(
  event: KeyboardEvent,
  options: { panelOpen: boolean },
) {
  if (options.panelOpen) {
    return true;
  }

  if (event.metaKey || event.ctrlKey || event.altKey) {
    return true;
  }

  const target = event.target;
  if (
    typeof target !== "object" ||
    target === null ||
    !("closest" in target) ||
    typeof target.closest !== "function"
  ) {
    return true;
  }

  const element = target as {
    isContentEditable?: boolean;
    closest: (selector: string) => Element | null;
  };

  if (element.isContentEditable) {
    return true;
  }

  return Boolean(
    element.closest(
      'input, textarea, select, [role="dialog"], [role="menu"], [role="listbox"], [data-slot="sheet-content"]',
    ),
  );
}

export function handleCalendarKeyboardEvent(
  event: KeyboardEvent,
  options: {
    panelOpen: boolean;
    currentView: string;
    selectedDate: Temporal.PlainDate;
    onDateChange: (date: Temporal.PlainDate) => void;
  },
) {
  if (shouldIgnoreCalendarKeyboardEvent(event, { panelOpen: options.panelOpen })) {
    return false;
  }

  if (event.key === "ArrowLeft") {
    event.preventDefault();
    options.onDateChange(
      stepCalendarDate(options.currentView, options.selectedDate, -1),
    );
    return true;
  }

  if (event.key === "ArrowRight") {
    event.preventDefault();
    options.onDateChange(
      stepCalendarDate(options.currentView, options.selectedDate, 1),
    );
    return true;
  }

  if (event.key.toLowerCase() === "t") {
    event.preventDefault();
    options.onDateChange(Temporal.Now.plainDateISO());
    return true;
  }

  return false;
}
