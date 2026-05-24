import { headers } from "next/headers";

async function getCsrfToken(): Promise<string> {
  const headerStore = await headers();
  const cookie = headerStore.get("cookie") ?? "";
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const response = await fetch(`${baseUrl}/api/auth/csrf`, {
    headers: { cookie },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Failed to load OAuth CSRF token");
  }

  const data = (await response.json()) as { csrfToken: string };
  return data.csrfToken;
}

export async function ConnectGoogleButton() {
  const csrfToken = await getCsrfToken();

  return (
    <form action="/api/auth/signin/google" method="POST">
      <input type="hidden" name="csrfToken" value={csrfToken} />
      <input type="hidden" name="callbackUrl" value="/settings?connected=google" />
      <button
        type="submit"
        className="inline-flex items-center rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
      >
        Connect Google Account
      </button>
    </form>
  );
}
