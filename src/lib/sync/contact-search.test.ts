import { describe, expect, it } from "vitest";

import {
  contactMatchesQuery,
  emailMatchesQuery,
  nameMatchesQuery,
} from "@/lib/sync/contact-search";

describe("contact search matching", () => {
  it("matches display name substring", () => {
    expect(nameMatchesQuery("Jane Doe", "jane")).toBe(true);
    expect(nameMatchesQuery("Jane Doe", "smith")).toBe(false);
  });

  it("matches email substring case-insensitively", () => {
    expect(emailMatchesQuery("Jane@Example.com", "example")).toBe(true);
    expect(emailMatchesQuery("Jane@Example.com", "work")).toBe(false);
  });

  it("matches contact by name or any email", () => {
    const contact = {
      displayName: "Jane Doe",
      emails: ["jane@work.com", "jane@home.com"],
    };

    expect(contactMatchesQuery(contact, "doe")).toBe(true);
    expect(contactMatchesQuery(contact, "work.com")).toBe(true);
    expect(contactMatchesQuery(contact, "")).toBe(true);
    expect(contactMatchesQuery(contact, "missing")).toBe(false);
  });
});
