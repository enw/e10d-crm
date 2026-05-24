/** Minimum query length for trigram `%` match; shorter queries use ILIKE only. */
export const TRIGRAM_MIN_LENGTH = 3;

export function emailMatchesQuery(email: string, query: string): boolean {
  return email.toLowerCase().includes(query.toLowerCase());
}

export function nameMatchesQuery(name: string, query: string): boolean {
  const normalized = query.toLowerCase();
  return name.toLowerCase().includes(normalized);
}

export function contactMatchesQuery(
  contact: { displayName: string; emails: string[] },
  query: string,
): boolean {
  const trimmed = query.trim();
  if (!trimmed) {
    return true;
  }

  if (nameMatchesQuery(contact.displayName, trimmed)) {
    return true;
  }

  return contact.emails.some((email) => emailMatchesQuery(email, trimmed));
}
