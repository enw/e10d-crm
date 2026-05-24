export const RETRY_INITIAL_DELAY_MS = 1_000;
export const RETRY_MAX_DELAY_MS = 60_000;
export const RETRY_MAX_RETRIES = 5;
export const RETRY_BACKOFF_MULTIPLIER = 2;

export function computeRetryDelayMs(retryIndex: number): number {
  const delay =
    RETRY_INITIAL_DELAY_MS * RETRY_BACKOFF_MULTIPLIER ** retryIndex;
  return Math.min(delay, RETRY_MAX_DELAY_MS);
}

export function isTransientEnrichmentError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const statusMatch = error.message.match(/LeadPure request failed \((\d+)\)/);
  if (statusMatch) {
    const status = Number(statusMatch[1]);
    return status === 408 || status === 429 || status >= 500;
  }

  const message = error.message.toLowerCase();
  return (
    message.includes("fetch failed") ||
    message.includes("network") ||
    message.includes("timeout") ||
    message.includes("econnreset")
  );
}

export async function sleepMs(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withExponentialRetry<T>(
  fn: () => Promise<T>,
  options?: {
    maxRetries?: number;
    sleepFn?: (ms: number) => Promise<void>;
    isRetryable?: (error: unknown) => boolean;
  },
): Promise<T> {
  const maxRetries = options?.maxRetries ?? RETRY_MAX_RETRIES;
  const sleepFn = options?.sleepFn ?? sleepMs;
  const isRetryable = options?.isRetryable ?? isTransientEnrichmentError;

  let retriesUsed = 0;

  while (true) {
    try {
      return await fn();
    } catch (error) {
      if (!isRetryable(error) || retriesUsed >= maxRetries) {
        throw error;
      }

      await sleepFn(computeRetryDelayMs(retriesUsed));
      retriesUsed += 1;
    }
  }
}
