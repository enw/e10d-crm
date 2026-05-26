import Link from "next/link";
import { Suspense } from "react";

import { AccountLegend } from "@/components/account-legend";
import { ContactSearchForm } from "@/components/contact-search-form";
import { ContactsListWithSelection } from "@/components/contacts-list-with-selection";
import { TagFilter } from "@/components/tag-filter";
import { listGoogleAccountSources } from "@/lib/google/accounts";
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
  const [contacts, tags, accountSources] = await Promise.all([
    searchContacts({ q, tagId: tag || undefined }),
    listTags(),
    listGoogleAccountSources(),
  ]);

  const nextMeetings = await getNextMeetingsForContacts(
    contacts.map((contact) => contact.id),
  );

  const contactRows = contacts.map((contact) => {
    const nextMeeting = nextMeetings.get(contact.id);
    return {
      ...contact,
      nextMeetingLabel: nextMeeting
        ? formatNextMeeting(nextMeeting.startTime)
        : null,
      nextMeetingGoogleAccountId: nextMeeting?.googleAccountId ?? null,
    };
  });

  return (
    <main className="mx-auto flex w-full max-w-5xl min-h-0 flex-1 flex-col overflow-hidden px-4 py-6 md:px-6">
      <header className="shrink-0 border-b border-border pb-4">
        <h1 className="text-2xl leading-tight sm:text-3xl">Contacts</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {contacts.length} contact{contacts.length === 1 ? "" : "s"}
          {q.trim() || tag ? " matching filters" : " synced from Google"}
        </p>
        {accountSources.length > 0 ? (
          <AccountLegend
            accounts={accountSources}
            className="mt-3 flex flex-wrap gap-x-4 gap-y-1"
          />
        ) : null}
      </header>

      <section className="mt-4 shrink-0 space-y-4">
        <Suspense fallback={null}>
          <ContactSearchForm defaultQuery={q} />
        </Suspense>
        <TagFilter tags={tags} activeTagId={tag || undefined} query={q} />
      </section>

      <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
        {contacts.length === 0 ? (
          <section className="rounded-sm border border-dashed border-border bg-muted/40 p-8 text-center text-sm text-muted-foreground">
            {q.trim() || tag ? (
              <>No contacts match your search.</>
            ) : (
              <>
                No contacts yet. Connect a Google account in{" "}
                <Link
                  href="/settings"
                  className="text-foreground underline decoration-accent/50 underline-offset-4"
                >
                  Settings
                </Link>
                .
              </>
            )}
          </section>
        ) : (
          <ContactsListWithSelection
            contacts={contactRows}
            tags={tags}
            accountSources={accountSources}
          />
        )}
      </div>
    </main>
  );
}
