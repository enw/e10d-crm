import Link from "next/link";

import { LogoutButton } from "@/components/logout-button";

export default function ContactsPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-8">
      <header className="flex items-center justify-between gap-4 border-b border-zinc-200 pb-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            Contacts
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Google sync arrives in T04. You are authenticated.
          </p>
        </div>
        <nav className="flex items-center gap-3 text-sm">
          <Link href="/settings" className="text-zinc-600 hover:text-zinc-900">
            Settings
          </Link>
          <LogoutButton />
        </nav>
      </header>

      <section className="mt-8 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-8 text-center text-sm text-zinc-600">
        No contacts yet. Connect a Google account in Settings once T02 ships.
      </section>
    </main>
  );
}
