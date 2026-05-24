export type ParsedGooglePerson = {
  resourceName: string;
  displayName: string;
  emails: string[];
  phones: string[];
  company: string | null;
  title: string | null;
};

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function pickPrimaryEmail(emails: string[]): string | null {
  const normalized = emails.map(normalizeEmail).filter(Boolean);
  return normalized[0] ?? null;
}

export function mergeContactFields(
  existing: {
    displayName: string;
    emails: string[];
    phones: string[];
    company: string | null;
    title: string | null;
  },
  incoming: ParsedGooglePerson,
): {
  displayName: string;
  emails: string[];
  phones: string[];
  company: string | null;
  title: string | null;
} {
  const emails = uniqueStrings([
    ...existing.emails.map(normalizeEmail),
    ...incoming.emails.map(normalizeEmail),
  ]);
  const phones = uniqueStrings([...existing.phones, ...incoming.phones]);

  return {
    displayName: pickLongerName(existing.displayName, incoming.displayName),
    emails,
    phones,
    company: existing.company || incoming.company,
    title: existing.title || incoming.title,
  };
}

export function findContactIdByEmail(
  contacts: Array<{ id: string; emails: string[] }>,
  email: string,
): string | null {
  const normalized = normalizeEmail(email);
  for (const contact of contacts) {
    if (contact.emails.some((value) => normalizeEmail(value) === normalized)) {
      return contact.id;
    }
  }
  return null;
}

function pickLongerName(current: string, incoming: string): string {
  const a = current.trim();
  const b = incoming.trim();
  if (!a) return b;
  if (!b) return a;
  return b.length > a.length ? b : a;
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

export function parseGooglePerson(
  person: Record<string, unknown>,
): ParsedGooglePerson | null {
  const resourceName = person.resourceName;
  if (typeof resourceName !== "string") {
    return null;
  }

  const names = Array.isArray(person.names) ? person.names : [];
  const emailAddresses = Array.isArray(person.emailAddresses)
    ? person.emailAddresses
    : [];
  const phoneNumbers = Array.isArray(person.phoneNumbers)
    ? person.phoneNumbers
    : [];
  const organizations = Array.isArray(person.organizations)
    ? person.organizations
    : [];

  const displayName =
    readString(names[0], "displayName") ??
    [readString(names[0], "givenName"), readString(names[0], "familyName")]
      .filter(Boolean)
      .join(" ") ??
    "";

  const emails = emailAddresses
    .map((entry) => readString(entry, "value"))
    .filter((value): value is string => Boolean(value))
    .map(normalizeEmail);

  const phones = phoneNumbers
    .map((entry) => readString(entry, "value"))
    .filter((value): value is string => Boolean(value));

  const org = organizations[0];
  const company = readString(org, "name");
  const title = readString(org, "title");

  if (emails.length === 0 && !displayName) {
    return null;
  }

  return {
    resourceName,
    displayName,
    emails,
    phones,
    company,
    title,
  };
}

function readString(value: unknown, key: string): string | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const field = (value as Record<string, unknown>)[key];
  return typeof field === "string" && field.trim() ? field.trim() : null;
}
