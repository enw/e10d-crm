import type { ParsedGooglePerson } from "@/lib/sync/contact-merge";
import { mergeContactFields } from "@/lib/sync/contact-merge";

export const OVERRIDABLE_FIELDS = [
  "display_name",
  "company",
  "title",
  "location",
  "emails",
  "phones",
] as const;

export type OverrideField = (typeof OVERRIDABLE_FIELDS)[number];
export type UserOverrides = Partial<Record<OverrideField, boolean>>;

export type ContactSyncFields = {
  displayName: string;
  emails: string[];
  phones: string[];
  company: string | null;
  title: string | null;
  location: string | null;
  userOverrides: UserOverrides;
};

export type ContactUpdateInput = {
  displayName?: string;
  company?: string | null;
  title?: string | null;
  location?: string | null;
  emails?: string[];
  phones?: string[];
};

const FIELD_TO_OVERRIDE: Record<
  keyof ContactUpdateInput,
  OverrideField
> = {
  displayName: "display_name",
  company: "company",
  title: "title",
  location: "location",
  emails: "emails",
  phones: "phones",
};

export function applyUserOverridesToSyncMerge(
  existing: ContactSyncFields,
  incoming: ParsedGooglePerson,
): Omit<ContactSyncFields, "userOverrides"> {
  const merged = mergeContactFields(existing, incoming);
  const overrides = existing.userOverrides ?? {};

  return {
    displayName: overrides.display_name ? existing.displayName : merged.displayName,
    emails: overrides.emails ? existing.emails : merged.emails,
    phones: overrides.phones ? existing.phones : merged.phones,
    company: overrides.company ? existing.company : merged.company,
    title: overrides.title ? existing.title : merged.title,
    location: overrides.location ? existing.location : existing.location,
  };
}

export function buildOverridesFromUpdate(
  existing: UserOverrides,
  input: ContactUpdateInput,
): UserOverrides {
  const next = { ...existing };

  for (const [field, overrideKey] of Object.entries(FIELD_TO_OVERRIDE) as Array<
    [keyof ContactUpdateInput, OverrideField]
  >) {
    if (field in input) {
      next[overrideKey] = true;
    }
  }

  return next;
}
