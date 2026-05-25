import { describe, expect, it } from "vitest";

import {
  getAccountColorIndex,
  getAccountColors,
  sortAccountSources,
} from "@/lib/google/account-colors";

describe("account colors", () => {
  const accounts = sortAccountSources([
    { id: "bbb", email: "bob@example.com" },
    { id: "aaa", email: "alice@example.com" },
  ]);

  it("assigns stable indices by sorted email", () => {
    expect(getAccountColorIndex("aaa", accounts)).toBe(0);
    expect(getAccountColorIndex("bbb", accounts)).toBe(1);
  });

  it("returns different main colors for different accounts", () => {
    const alice = getAccountColors("aaa", accounts, false);
    const bob = getAccountColors("bbb", accounts, false);
    expect(alice.main).not.toBe(bob.main);
  });
});
