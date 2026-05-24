import Link from "next/link";
import { Suspense } from "react";

import { ContactSearchForm } from "@/components/contact-search-form";
import { LogoutButton } from "@/components/logout-button";
import { TagFilter } from "@/components/tag-filter";
import { searchContacts } from "@/lib/sync/contacts";
import { listTags } from "@/lib/tags";

export const dynamic = "force-dynamic";

type ContactsPageProps = {
  searchParams: Promise<{ q?: string; tag?: string }>;
};

export default async function ContactsPage({ searchParams }: ContactsPageProps) {
  const { q = "", tag = "" } = await searchParams;
  const [contacts, tags] = await Promise.all([
    searchContacts({ q, tagId: tag || undefined }),
    listTags(),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-8">
      <header className="flex items-center justify-between gap-4 border-b border-zinc-200 pb-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            Contacts
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {contacts.length} contact{contacts.length === 1 ? "" : "s"}
            {q.trim() || tag ? " matching filters" : " synced from Google"}
          </p>
        </div>
        <nav className="flex items-center gap-3 text-sm">
          <Link href="/calendar" className="text-zinc-600 hover:text-zinc-900">
            Calendar
          </Link>
          <Link href="/settings" className="text-zinc-600 hover:text-zinc-900">
            Settings
          </Link>
          <LogoutButton />
        </nav>
      </header>

      <section className="mt-6 space-y-4">
        <Suspense fallback={null}>
          <ContactSearchForm defaultQuery={q} />
        </Suspense>
        <TagFilter tags={tags} activeTagId={tag || undefined} query={q} />
      </section>

      {contacts.length === 0 ? (
        <section className="mt-8 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-8 text-center text-sm text-zinc-600">
          {q.trim() || tag ? (
            <>No contacts match your search.</>
          ) : (
            <>
              No contacts yet. Connect a Google account in{" "}
              <Link
                href="/settings"
                className="font-medium text-zinc-900 underline"
              >
                Settings
              </Link>
              .
            </>
          )}
        </section>
      ) : (
        <ul className="mt-8 divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white">
          {contacts.map((contact) => (
            <li key={contact.id}>
              <Link
                href={`/contacts/${contact.id}`}
                className="block px-4 py-3 hover:bg-zinc-50"
              >
                <p className="font-medium text-zinc-900">
                  {contact.displayName || contact.emails[0] || "Unknown"}
                </p>
                <p className="text-sm text-zinc-500">
                  {contact.emails[0] ?? "No email"}
                  {contact.company ? ` · ${contact.company}` : ""}
                </p>
                {contact.tags.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {contact.tags.map((tagItem) => (
                      <span
                        key={tagItem.id}
                        className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700"
                      >
                        {tagItem.name}
                      </span>
                    ))}
                  </div>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
