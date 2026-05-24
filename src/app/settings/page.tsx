import Link from "next/link";

import { ConnectGoogleButton } from "@/components/connect-google-button";
import { LogoutButton } from "@/components/logout-button";
import { listGoogleAccounts } from "@/lib/google/accounts";

export const dynamic = "force-dynamic";

type SettingsPageProps = {
  searchParams: Promise<{ connected?: string; error?: string }>;
};

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const params = await searchParams;
  const accounts = await listGoogleAccounts();

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
          <LogoutButton />
        </nav>
      </header>

      {params.connected === "google" ? (
        <p className="mt-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          Google account connected. Contact sync arrives in T04.
        </p>
      ) : null}

      {params.error ? (
        <p className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          Google sign-in failed. Check OAuth credentials and redirect URI in
          Google Cloud Console.
        </p>
      ) : null}

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
                className="flex items-center justify-between gap-4 px-4 py-3"
              >
                <div>
                  <p className="font-medium text-zinc-900">{account.email}</p>
                  <p className="text-xs text-zinc-500">
                    Connected {account.connectedAt.toLocaleString()}
                  </p>
                </div>
                <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-800">
                  Connected
                </span>
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
