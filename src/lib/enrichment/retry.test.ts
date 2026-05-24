import { describe, expect, it, vi } from "vitest";

import {
  computeRetryDelayMs,
  isTransientEnrichmentError,
  withExponentialRetry,
} from "@/lib/enrichment/retry";

describe("computeRetryDelayMs", () => {
  it("doubles delay up to the cap", () => {
    expect(computeRetryDelayMs(0)).toBe(1_000);
    expect(computeRetryDelayMs(1)).toBe(2_000);
    expect(computeRetryDelayMs(2)).toBe(4_000);
    expect(computeRetryDelayMs(10)).toBe(60_000);
  });
});

describe("isTransientEnrichmentError", () => {
  it("treats rate limits and 5xx as transient", () => {
    expect(
      isTransientEnrichmentError(
        new Error("LeadPure request failed (429): rate limited"),
      ),
    ).toBe(true);
    expect(
      isTransientEnrichmentError(
        new Error("LeadPure request failed (503): unavailable"),
      ),
    ).toBe(true);
  });

  it("treats client errors as permanent", () => {
    expect(
      isTransientEnrichmentError(
        new Error("LeadPure request failed (400): bad request"),
      ),
    ).toBe(false);
  });
});

describe("withExponentialRetry", () => {
  it("retries transient failures with exponential backoff", async () => {
    const sleepFn = vi.fn().mockResolvedValue(undefined);
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("LeadPure request failed (503): down"))
      .mockRejectedValueOnce(new Error("LeadPure request failed (429): slow"))
      .mockResolvedValue("ok");

    const result = await withExponentialRetry(fn, {
      maxRetries: 5,
      sleepFn,
    });

    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(3);
    expect(sleepFn).toHaveBeenCalledTimes(2);
    expect(sleepFn.mock.calls[0]?.[0]).toBe(1_000);
    expect(sleepFn.mock.calls[1]?.[0]).toBe(2_000);
  });

  it("stops retrying after max retries", async () => {
    const sleepFn = vi.fn().mockResolvedValue(undefined);
    const fn = vi
      .fn()
      .mockRejectedValue(new Error("LeadPure request failed (503): down"));

    await expect(
      withExponentialRetry(fn, { maxRetries: 2, sleepFn }),
    ).rejects.toThrow("503");

    expect(fn).toHaveBeenCalledTimes(3);
    expect(sleepFn).toHaveBeenCalledTimes(2);
  });

  it("does not retry permanent failures", async () => {
    const sleepFn = vi.fn().mockResolvedValue(undefined);
    const fn = vi
      .fn()
      .mockRejectedValue(new Error("LeadPure request failed (400): bad"));

    await expect(withExponentialRetry(fn, { sleepFn })).rejects.toThrow("400");
    expect(fn).toHaveBeenCalledTimes(1);
    expect(sleepFn).not.toHaveBeenCalled();
  });
});
