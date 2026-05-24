import Link from "next/link";

import { LogoutButton } from "@/components/logout-button";

export default function SettingsPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-8">
      <header className="flex items-center justify-between gap-4 border-b border-zinc-200 pb-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            Settings
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Google accounts and export land in later tickets.
          </p>
        </div>
        <nav className="flex items-center gap-3 text-sm">
          <Link href="/contacts" className="text-zinc-600 hover:text-zinc-900">
            Contacts
          </Link>
          <LogoutButton />
        </nav>
      </header>
    </main>
  );
}
