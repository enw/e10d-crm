const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  setInterval(() => {
    void import("@/lib/sync/runner").then(({ runScheduledSync }) =>
      runScheduledSync(),
    );
  }, SIX_HOURS_MS);
}
