import { describe, expect, it } from "vitest";

import {
  eventIncludesContactEmail,
  linkedContactNamesFromAttendees,
  resolveAttendees,
} from "@/lib/sync/calendar-attendees";

describe("calendar attendee resolution", () => {
  const context = {
    byEmail: new Map([
      [
        "alice@example.com",
        {
          id: "contact-1",
          displayName: "Alice Smith",
          emails: ["alice@example.com"],
          company: "Acme",
          lastInteractionAt: null,
        },
      ],
      [
        "bob@example.com",
        {
          id: "contact-2",
          displayName: "Bob Jones",
          emails: ["bob@example.com"],
          company: null,
          lastInteractionAt: null,
        },
      ],
    ]),
    tagsByContact: new Map([["contact-1", ["vip"]]]),
    latestNoteByContact: new Map([["contact-1", "Follow up on proposal"]]),
  };

  it("resolves all non-owner attendees with contact metadata", () => {
    const attendees = resolveAttendees(
      [
        { email: "me@example.com", responseStatus: "accepted" },
        { email: "alice@example.com", name: "Alice", responseStatus: "accepted" },
        { email: "stranger@example.com", responseStatus: "needsAction" },
      ],
      "me@example.com",
      context,
    );

    expect(attendees).toHaveLength(2);
    expect(attendees[0]).toMatchObject({
      email: "alice@example.com",
      contactId: "contact-1",
      tags: ["vip"],
      latestNote: "Follow up on proposal",
    });
    expect(attendees[1]).toMatchObject({
      email: "stranger@example.com",
      contactId: null,
    });
  });

  it("returns linked contact names for calendar feed chips", () => {
    const names = linkedContactNamesFromAttendees(
      [{ email: "alice@example.com" }, { email: "stranger@example.com" }],
      "me@example.com",
      context,
    );

    expect(names).toEqual(["Alice Smith"]);
  });

  it("matches events to contacts by any attendee email", () => {
    expect(
      eventIncludesContactEmail(
        [{ email: "bob@example.com" }],
        ["other@example.com", "bob@example.com"],
      ),
    ).toBe(true);
    expect(
      eventIncludesContactEmail([{ email: "unknown@example.com" }], [
        "bob@example.com",
      ]),
    ).toBe(false);
  });
});
