import { describe, expect, it } from "vitest";

import { linkEventToContact } from "@/lib/sync/calendar";

describe("linkEventToContact", () => {
  const contacts = [
    { id: "c1", emails: ["alice@example.com"] },
    { id: "c2", emails: ["bob@example.com"] },
  ];

  it("links to attendee email excluding account owner", () => {
    const linked = linkEventToContact(
      [
        { email: "owner@example.com" },
        { email: "alice@example.com" },
      ],
      "owner@example.com",
      contacts,
    );

    expect(linked).toBe("c1");
  });

  it("returns null when no attendee matches a contact", () => {
    const linked = linkEventToContact(
      [{ email: "owner@example.com" }, { email: "unknown@example.com" }],
      "owner@example.com",
      contacts,
    );

    expect(linked).toBeNull();
  });
});
