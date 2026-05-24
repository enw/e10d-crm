import Link from "next/link";

import { LogoutButton } from "@/components/logout-button";
import { listContacts } from "@/lib/sync/contacts";

export const dynamic = "force-dynamic";

export default async function ContactsPage() {
  const contacts = await listContacts();

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-8">
      <header className="flex items-center justify-between gap-4 border-b border-zinc-200 pb-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            Contacts
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {contacts.length} contact{contacts.length === 1 ? "" : "s"} synced
            from Google
          </p>
        </div>
        <nav className="flex items-center gap-3 text-sm">
          <Link href="/settings" className="text-zinc-600 hover:text-zinc-900">
            Settings
          </Link>
          <LogoutButton />
        </nav>
      </header>

      {contacts.length === 0 ? (
        <section className="mt-8 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-8 text-center text-sm text-zinc-600">
          No contacts yet. Connect a Google account in{" "}
          <Link href="/settings" className="font-medium text-zinc-900 underline">
            Settings
          </Link>
          .
        </section>
      ) : (
        <ul className="mt-8 divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white">
          {contacts.map((contact) => (
            <li key={contact.id} className="px-4 py-3">
              <p className="font-medium text-zinc-900">
                {contact.displayName || contact.emails[0] || "Unknown"}
              </p>
              <p className="text-sm text-zinc-500">
                {contact.emails[0] ?? "No email"}
                {contact.company ? ` · ${contact.company}` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
