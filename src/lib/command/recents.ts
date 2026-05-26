export type RecentContact = {
  id: string;
  name: string;
  visitedAt: number;
};

const STORAGE_KEY = "e10d-crm-recent-contacts";
const MAX_RECENTS = 5;

export function readRecentContacts(): RecentContact[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as RecentContact[];
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter(
        (item) =>
          item &&
          typeof item.id === "string" &&
          typeof item.name === "string" &&
          typeof item.visitedAt === "number",
      )
      .slice(0, MAX_RECENTS);
  } catch {
    return [];
  }
}

export function rememberRecentContact(contact: { id: string; name: string }) {
  if (typeof window === "undefined") {
    return;
  }

  const existing = readRecentContacts().filter((item) => item.id !== contact.id);
  const next: RecentContact[] = [
    { id: contact.id, name: contact.name, visitedAt: Date.now() },
    ...existing,
  ].slice(0, MAX_RECENTS);

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}
