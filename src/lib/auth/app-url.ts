/** Origin users and OAuth providers see (set NEXTAUTH_URL to your Tailscale hostname). */
export function publicAppUrl(): string {
  return (process.env.NEXTAUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

/**
 * Origin for server-side self-fetch (e.g. CSRF token).
 * Docker containers cannot resolve Tailscale hostnames like "westwind".
 */
export function internalAppUrl(): string {
  const configured = process.env.INTERNAL_APP_URL?.replace(/\/$/, "");
  if (configured) {
    return configured;
  }
  const port = process.env.PORT ?? "3000";
  return `http://127.0.0.1:${port}`;
}
