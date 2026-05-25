import { ConnectGoogleButton } from "@/components/connect-google-button";
import { BatchEnrichButton } from "@/components/batch-enrich-button";
import { DisconnectGoogleAccountButton } from "@/components/disconnect-google-button";
import { SyncNowButton } from "@/components/sync-now-button";
import {
  googleOAuthErrorMessage,
  isGooglePlaygroundClientId,
} from "@/lib/auth/google-oauth-errors";
import { publicAppUrl } from "@/lib/auth/app-url";
import { listGoogleAccounts } from "@/lib/google/accounts";
import { listContactIdsForBatchEnrichment } from "@/lib/enrichment/batch";

export const dynamic = "force-dynamic";

type SettingsPageProps = {
  searchParams: Promise<{ connected?: string; error?: string }>;
};

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const params = await searchParams;
  const accounts = await listGoogleAccounts();
  const pendingEnrichmentIds = await listContactIdsForBatchEnrichment();
  const oauthError = googleOAuthErrorMessage(params.error);
  const usingPlaygroundClient = isGooglePlaygroundClientId(
    process.env.GOOGLE_CLIENT_ID,
  );
  const callbackUri = `${publicAppUrl()}/api/auth/callback/google`;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-8 md:px-6">
      <header className="border-b border-border pb-4">
        <h1 className="text-2xl leading-tight sm:text-3xl">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Connect Google accounts for contacts and calendar sync.
        </p>
      </header>

      {params.connected === "google" ? (
        <p className="mt-6 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-700 dark:text-green-400">
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
          <h2 className="text-lg font-medium text-zinc-900">Enrichment</h2>
          <BatchEnrichButton pendingCount={pendingEnrichmentIds.length} />
        </div>
        <p className="text-sm text-zinc-500">
          Batch-enrich contacts that have not succeeded yet. Transient LeadPure
          errors retry with exponential backoff (1s → 60s, up to 5 retries).
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
