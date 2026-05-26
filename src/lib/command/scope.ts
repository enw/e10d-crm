export type CommandScope =
  | { type: "calendar"; eventId?: string }
  | { type: "contacts" }
  | { type: "dossier"; contactId: string }
  | { type: "edit"; contactId: string }
  | { type: "settings" }
  | { type: "other" };

export function parseCommandScope(
  pathname: string,
  searchParams: URLSearchParams,
): CommandScope {
  if (pathname === "/calendar" || pathname.startsWith("/calendar/")) {
    const eventId = searchParams.get("event") ?? undefined;
    return { type: "calendar", eventId };
  }

  if (pathname === "/contacts") {
    return { type: "contacts" };
  }

  if (pathname === "/settings") {
    return { type: "settings" };
  }

  const dossierMatch = pathname.match(/^\/contacts\/([^/]+)$/);
  if (dossierMatch) {
    return { type: "dossier", contactId: dossierMatch[1] };
  }

  const editMatch = pathname.match(/^\/contacts\/([^/]+)\/edit$/);
  if (editMatch) {
    return { type: "edit", contactId: editMatch[1] };
  }

  return { type: "other" };
}

export function formatEventDate(iso: string | null): string {
  if (!iso) {
    return "";
  }

  const date = new Date(iso);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const day = isToday
    ? "Today"
    : date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  const time = date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${day} · ${time}`;
}

export function calendarEventHref(eventId: string, startTime: string | null): string {
  const date =
    startTime != null
      ? startTime.slice(0, 10)
      : new Date().toISOString().slice(0, 10);
  return `/calendar?event=${encodeURIComponent(eventId)}&date=${encodeURIComponent(date)}`;
}

export function contactLabel(
  displayName: string | null,
  emails: string[],
): string {
  return displayName || emails[0] || "Unknown contact";
}
