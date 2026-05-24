import Link from "next/link";
import { Suspense } from "react";

import { ContactSearchForm } from "@/components/contact-search-form";
import { TagFilter } from "@/components/tag-filter";
import { Badge } from "@/components/ui/badge";
import { getNextMeetingsForContacts } from "@/lib/sync/calendar-attendees";
import { searchContacts } from "@/lib/sync/contacts";
import { listTags } from "@/lib/tags";

export const dynamic = "force-dynamic";

type ContactsPageProps = {
  searchParams: Promise<{ q?: string; tag?: string }>;
};

function formatNextMeeting(startTime: Date) {
  const now = new Date();
  const isToday = startTime.toDateString() === now.toDateString();
  const day = isToday
    ? "Today"
    : startTime.toLocaleDateString(undefined, { weekday: "short" });
  const time = startTime.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${day} ${time}`;
}

export default async function ContactsPage({ searchParams }: ContactsPageProps) {
  const { q = "", tag = "" } = await searchParams;
  const [contacts, tags] = await Promise.all([
    searchContacts({ q, tagId: tag || undefined }),
    listTags(),
  ]);

  const nextMeetings = await getNextMeetingsForContacts(
    contacts.map((contact) => contact.id),
  );

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-8 md:px-6">
      <header className="border-b border-border pb-4">
        <h1 className="text-2xl leading-tight sm:text-3xl">Contacts</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {contacts.length} contact{contacts.length === 1 ? "" : "s"}
          {q.trim() || tag ? " matching filters" : " synced from Google"}
        </p>
      </header>

      <section className="mt-6 space-y-4">
        <Suspense fallback={null}>
          <ContactSearchForm defaultQuery={q} />
        </Suspense>
        <TagFilter tags={tags} activeTagId={tag || undefined} query={q} />
      </section>

      {contacts.length === 0 ? (
        <section className="mt-8 rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
          {q.trim() || tag ? (
            <>No contacts match your search.</>
          ) : (
            <>
              No contacts yet. Connect a Google account in{" "}
              <Link
                href="/settings"
                className="font-medium text-foreground underline"
              >
                Settings
              </Link>
              .
            </>
          )}
        </section>
      ) : (
        <ul className="mt-8 divide-y divide-border rounded-sm border border-border bg-card">
          {contacts.map((contact) => {
            const nextMeeting = nextMeetings.get(contact.id);
            return (
              <li key={contact.id}>
                <Link
                  href={`/contacts/${contact.id}`}
                  className="block px-4 py-3 hover:bg-muted/50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">
                        {contact.displayName || contact.emails[0] || "Unknown"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {contact.emails[0] ?? "No email"}
                        {contact.company ? ` · ${contact.company}` : ""}
                      </p>
                    </div>
                    {nextMeeting ? (
                      <Badge variant="secondary" className="shrink-0">
                        Next: {formatNextMeeting(nextMeeting.startTime)}
                      </Badge>
                    ) : null}
                  </div>
                  {contact.tags.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {contact.tags.map((tagItem) => (
                        <Badge key={tagItem.id} variant="outline">
                          {tagItem.name}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
