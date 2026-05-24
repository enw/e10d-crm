import { describe, expect, it } from "vitest";

import {
  findContactIdByEmail,
  mergeContactFields,
  normalizeEmail,
  parseGooglePerson,
  pickPrimaryEmail,
} from "@/lib/sync/contact-merge";

describe("normalizeEmail", () => {
  it("lowercases and trims", () => {
    expect(normalizeEmail("  Jane@Example.com ")).toBe("jane@example.com");
  });
});

describe("pickPrimaryEmail", () => {
  it("returns first normalized email", () => {
    expect(pickPrimaryEmail(["Work@Example.com", "other@example.com"])).toBe(
      "work@example.com",
    );
  });
});

describe("findContactIdByEmail", () => {
  it("finds contact by any stored email", () => {
    const id = findContactIdByEmail(
      [
        { id: "a", emails: ["one@example.com"] },
        { id: "b", emails: ["two@example.com", "alias@example.com"] },
      ],
      "alias@example.com",
    );
    expect(id).toBe("b");
  });

  it("returns null when no match", () => {
    expect(
      findContactIdByEmail([{ id: "a", emails: ["one@example.com"] }], "nope@example.com"),
    ).toBeNull();
  });
});

describe("mergeContactFields", () => {
  it("unions emails and phones and prefers longer name", () => {
    const merged = mergeContactFields(
      {
        displayName: "Jane",
        emails: ["jane@work.com"],
        phones: ["+1 555 0100"],
        company: "Acme",
        title: null,
      },
      {
        resourceName: "people/c2",
        displayName: "Jane Doe",
        emails: ["jane@personal.com"],
        phones: ["+1 555 0100", "+1 555 0199"],
        company: null,
        title: "CEO",
      },
    );

    expect(merged.displayName).toBe("Jane Doe");
    expect(merged.emails).toEqual(["jane@work.com", "jane@personal.com"]);
    expect(merged.phones).toEqual(["+1 555 0100", "+1 555 0199"]);
    expect(merged.company).toBe("Acme");
    expect(merged.title).toBe("CEO");
  });
});

describe("parseGooglePerson", () => {
  it("parses people API payload", () => {
    const parsed = parseGooglePerson({
      resourceName: "people/c123",
      names: [{ displayName: "Jane Doe" }],
      emailAddresses: [{ value: "jane@example.com" }],
      phoneNumbers: [{ value: "+15550100" }],
      organizations: [{ name: "Acme", title: "CEO" }],
    });

    expect(parsed).toEqual({
      resourceName: "people/c123",
      displayName: "Jane Doe",
      emails: ["jane@example.com"],
      phones: ["+15550100"],
      company: "Acme",
      title: "CEO",
    });
  });

  it("returns null without email or name", () => {
    expect(parseGooglePerson({ resourceName: "people/c123" })).toBeNull();
  });
});
