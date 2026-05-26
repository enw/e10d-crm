import { describe, expect, it, vi } from "vitest";

import {
  enrichWithLeadPure,
  isLeadPureConfigured,
  mapLeadPureResponse,
} from "@/lib/enrichment/leadpure";
import { mergeEnrichmentIntoContact } from "@/lib/enrichment/pipeline";

describe("isLeadPureConfigured", () => {
  it("returns false for missing or blank keys", () => {
    expect(isLeadPureConfigured(undefined)).toBe(false);
    expect(isLeadPureConfigured("")).toBe(false);
    expect(isLeadPureConfigured("   ")).toBe(false);
  });

  it("returns true when a key is present", () => {
    expect(isLeadPureConfigured("test-key")).toBe(true);
  });
});

describe("mapLeadPureResponse", () => {
  it("maps common enrichment fields", () => {
    const result = mapLeadPureResponse({
      data: {
        companyName: "Acme",
        jobTitle: "CEO",
        city: "Boston",
        linkedinUrl: "https://linkedin.com/in/jane",
      },
    });

    expect(result.company).toBe("Acme");
    expect(result.title).toBe("CEO");
    expect(result.location).toBe("Boston");
    expect(result.linkedinUrl).toBe("https://linkedin.com/in/jane");
  });
});

describe("mergeEnrichmentIntoContact", () => {
  it("fills empty fields and preserves user overrides", () => {
    const merged = mergeEnrichmentIntoContact(
      {
        company: "User Corp",
        title: null,
        location: null,
        enrichmentBlob: null,
        userOverrides: { company: true },
      },
      "leadpure",
      {
        company: "LeadPure Co",
        title: "VP",
        location: "NYC",
        raw: { source: "test" },
      },
    );

    expect(merged.company).toBe("User Corp");
    expect(merged.title).toBe("VP");
    expect(merged.location).toBe("NYC");
    expect(merged.enrichmentBlob).toEqual({ leadpure: { source: "test" } });
  });
});

describe("enrichWithLeadPure", () => {
  it("calls LeadPure HTTP API with email", async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        company: "Acme",
        title: "Founder",
      }),
    });

    const result = await enrichWithLeadPure("jane@example.com", {
      apiKey: "test-key",
      apiUrl: "https://example.com/enrich",
      fetchFn,
    });

    expect(fetchFn).toHaveBeenCalledWith(
      "https://example.com/enrich",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-key",
        }),
        body: JSON.stringify({ email: "jane@example.com" }),
      }),
    );
    expect(result.company).toBe("Acme");
    expect(result.title).toBe("Founder");
  });
});
