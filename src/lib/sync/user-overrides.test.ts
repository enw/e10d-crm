import { describe, expect, it } from "vitest";

import {
  applyUserOverridesToSyncMerge,
  buildOverridesFromUpdate,
} from "@/lib/sync/user-overrides";

const incoming = {
  resourceName: "people/c2",
  displayName: "Jane Doe",
  emails: ["jane@personal.com"],
  phones: ["+1 555 0199"],
  company: "NewCo",
  title: "CEO",
};

describe("applyUserOverridesToSyncMerge", () => {
  it("uses merged values when no overrides", () => {
    const result = applyUserOverridesToSyncMerge(
      {
        displayName: "Jane",
        emails: ["jane@work.com"],
        phones: ["+1 555 0100"],
        company: "Acme",
        title: null,
        location: null,
        userOverrides: {},
      },
      incoming,
    );

    expect(result.displayName).toBe("Jane Doe");
    expect(result.emails).toEqual(["jane@work.com", "jane@personal.com"]);
    expect(result.company).toBe("Acme");
    expect(result.title).toBe("CEO");
  });

  it("preserves user-edited fields during sync", () => {
    const result = applyUserOverridesToSyncMerge(
      {
        displayName: "Custom Name",
        emails: ["custom@example.com"],
        phones: ["+1 555 0100"],
        company: "User Corp",
        title: "Founder",
        location: "Boston",
        userOverrides: {
          display_name: true,
          company: true,
          title: true,
          location: true,
          emails: true,
        },
      },
      incoming,
    );

    expect(result.displayName).toBe("Custom Name");
    expect(result.emails).toEqual(["custom@example.com"]);
    expect(result.company).toBe("User Corp");
    expect(result.title).toBe("Founder");
    expect(result.location).toBe("Boston");
    expect(result.phones).toEqual(["+1 555 0100", "+1 555 0199"]);
  });
});

describe("buildOverridesFromUpdate", () => {
  it("marks edited fields in user_overrides", () => {
    const overrides = buildOverridesFromUpdate({}, {
      displayName: "Edited",
      company: "New Co",
    });

    expect(overrides).toEqual({
      display_name: true,
      company: true,
    });
  });

  it("accumulates overrides across edits", () => {
    const overrides = buildOverridesFromUpdate(
      { display_name: true },
      { title: "VP" },
    );

    expect(overrides).toEqual({
      display_name: true,
      title: true,
    });
  });
});
