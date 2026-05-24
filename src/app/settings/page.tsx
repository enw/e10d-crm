import Link from "next/link";

import { ConnectGoogleButton } from "@/components/connect-google-button";
import { DisconnectGoogleAccountButton } from "@/components/disconnect-google-button";
import { LogoutButton } from "@/components/logout-button";
import { SyncNowButton } from "@/components/sync-now-button";
import {
  googleOAuthErrorMessage,
  isGooglePlaygroundClientId,
} from "@/lib/auth/google-oauth-errors";
import { listGoogleAccounts } from "@/lib/google/accounts";

export const dynamic = "force-dynamic";

type SettingsPageProps = {
  searchParams: Promise<{ connected?: string; error?: string }>;
};

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const params = await searchParams;
  const accounts = await listGoogleAccounts();
  const oauthError = googleOAuthErrorMessage(params.error);
  const usingPlaygroundClient = isGooglePlaygroundClientId(
    process.env.GOOGLE_CLIENT_ID,
  );
  const callbackUri = `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/api/auth/callback/google`;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-8">
      <header className="flex items-center justify-between gap-4 border-b border-zinc-200 pb-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            Settings
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Connect Google accounts for contacts and calendar sync.
          </p>
        </div>
        <nav className="flex items-center gap-3 text-sm">
          <Link href="/contacts" className="text-zinc-600 hover:text-zinc-900">
            Contacts
          </Link>
          <Link href="/calendar" className="text-zinc-600 hover:text-zinc-900">
            Calendar
          </Link>
          <LogoutButton />
        </nav>
      </header>

      {params.connected === "google" ? (
        <p className="mt-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          Google account connected. Initial contact and calendar sync has started.
        </p>
      ) : null}

      {oauthError ? (
        <p className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {oauthError}
        </p>
      ) : null}

      {usingPlaygroundClient ? (
        <p className="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          GOOGLE_CLIENT_ID is the public OAuth Playground client — it will not
          work for this app. Create your own OAuth client in Google Cloud Console
          and set redirect URI to{" "}
          <code className="rounded bg-amber-100 px-1">{callbackUri}</code>
        </p>
      ) : null}

      <section className="mt-8 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-medium text-zinc-900">Sync</h2>
          <SyncNowButton />
        </div>
        <p className="text-sm text-zinc-500">
          Re-sync contacts and calendar events for all connected Google accounts.
        </p>
      </section>

      <section className="mt-8 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-medium text-zinc-900">Data export</h2>
          <a
            href="/api/export/contacts"
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
          >
            Download JSON
          </a>
        </div>
        <p className="text-sm text-zinc-500">
          Export contacts, tags, notes, interactions, enrichment, and overrides.
        </p>
      </section>

      <section className="mt-8 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-medium text-zinc-900">Google accounts</h2>
          <ConnectGoogleButton />
        </div>

        {accounts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-6 text-sm text-zinc-600">
            No Google accounts connected yet.
          </div>
        ) : (
          <ul className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white">
            {accounts.map((account) => (
              <li
                key={account.id}
                className="flex items-start justify-between gap-4 px-4 py-3"
              >
                <div className="space-y-1">
                  <p className="font-medium text-zinc-900">{account.email}</p>
                  <p className="text-xs text-zinc-500">
                    Connected {account.connectedAt.toLocaleString()}
                  </p>
                  <p className="text-xs text-zinc-500">
                    Contacts sync:{" "}
                    {account.lastContactsSyncAt
                      ? account.lastContactsSyncAt.toLocaleString()
                      : "never"}
                  </p>
                  <p className="text-xs text-zinc-500">
                    Calendar sync:{" "}
                    {account.lastCalendarSyncAt
                      ? account.lastCalendarSyncAt.toLocaleString()
                      : "never"}
                  </p>
                  {account.lastContactsSyncError ? (
                    <p className="text-xs text-red-600">
                      Contacts error: {account.lastContactsSyncError}
                    </p>
                  ) : null}
                  {account.lastCalendarSyncError ? (
                    <p className="text-xs text-red-600">
                      Calendar error: {account.lastCalendarSyncError}
                    </p>
                  ) : null}
                </div>
                <DisconnectGoogleAccountButton
                  accountId={account.id}
                  email={account.email}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="mt-8 text-xs text-zinc-500">
        App password login and Google OAuth are separate. Connecting Google
        stores encrypted tokens for API sync only.
      </p>
    </main>
  );
}
