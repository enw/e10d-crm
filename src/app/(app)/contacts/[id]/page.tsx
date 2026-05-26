import Link from "next/link";
import { notFound } from "next/navigation";

import { CommandActionsTrigger } from "@/components/command-palette/command-trigger";
import { EnrichContactButton } from "@/components/enrich-contact-button";
import { ContactNoteForm } from "@/components/contact-note-form";
import { ContactTagManager } from "@/components/contact-tag-manager";
import { UnifiedTimeline } from "@/components/unified-timeline";
import { Button } from "@/components/ui/button";
import { listGoogleAccountSources } from "@/lib/google/accounts";
import { getLatestEnrichmentRun } from "@/lib/enrichment/pipeline";
import { listInteractionsForContact } from "@/lib/interactions";
import { listMeetingsForContact } from "@/lib/sync/calendar-attendees";
import { getContactById } from "@/lib/sync/contacts";
import { listTagsForContact } from "@/lib/tags";

export const dynamic = "force-dynamic";

type ContactPageProps = {
  params: Promise<{ id: string }>;
};

function FieldList({ label, values }: { label: string; values: string[] }) {
  if (values.length === 0) {
    return null;
  }

  return (
    <div>
      <h2 className="text-sm font-medium text-muted-foreground">{label}</h2>
      <ul className="mt-1 space-y-1 text-sm">
        {values.map((value) => (
          <li key={value}>{value}</li>
        ))}
      </ul>
    </div>
  );
}

function readEnrichmentUrl(
  blob: Record<string, unknown> | null,
  key: string,
): string | null {
  if (!blob) {
    return null;
  }

  const leadpure = blob.leadpure;
  if (!leadpure || typeof leadpure !== "object") {
    return null;
  }

  const value = (leadpure as Record<string, unknown>)[key];
  return typeof value === "string" ? value : null;
}

export default async function ContactDossierPage({ params }: ContactPageProps) {
  const { id } = await params;
  const contact = await getContactById(id);

  if (!contact) {
    notFound();
  }

  const [tags, interactions, meetings, latestEnrichment, accountSources] =
    await Promise.all([
      listTagsForContact(id),
      listInteractionsForContact(id, 50),
      listMeetingsForContact(id),
      getLatestEnrichmentRun(id),
      listGoogleAccountSources(),
    ]);

  const enrichmentBlob =
    (contact.enrichmentBlob as Record<string, unknown> | null) ?? null;
  const linkedinUrl =
    readEnrichmentUrl(enrichmentBlob, "linkedinUrl") ??
    readEnrichmentUrl(enrichmentBlob, "linkedin");
  const twitterUrl =
    readEnrichmentUrl(enrichmentBlob, "twitterUrl") ??
    readEnrichmentUrl(enrichmentBlob, "twitter");
  const title = contact.displayName || contact.emails[0] || "Unknown contact";

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col overflow-y-auto px-4 py-8 md:px-6">
      <header className="border-b border-border pb-4">
        <Link
          href="/contacts"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Contacts
        </Link>
        <div className="mt-2 flex items-start justify-between gap-4">
          <div>
            <h1
              className="text-2xl leading-tight sm:text-3xl"
              data-command-contact-name={title}
            >
              {title}
            </h1>
            {contact.company || contact.title ? (
              <p className="mt-1 text-sm text-muted-foreground">
                {[contact.title, contact.company].filter(Boolean).join(" · ")}
              </p>
            ) : null}
            {contact.lastInteractionAt ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Last interaction {contact.lastInteractionAt.toLocaleString()}
              </p>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <CommandActionsTrigger className="md:hidden" />
            <Button variant="outline" size="sm" asChild>
              <Link href={`/contacts/${contact.id}/edit`}>Edit</Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="mt-8 space-y-6">
        <FieldList label="Email" values={contact.emails} />
        <FieldList label="Phone" values={contact.phones} />
        {contact.location ? (
          <div>
            <h2 className="text-sm font-medium text-muted-foreground">
              Location
            </h2>
            <p className="mt-1 text-sm">{contact.location}</p>
          </div>
        ) : null}

        <div>
          <h2 className="text-sm font-medium text-muted-foreground">Tags</h2>
          <div className="mt-2">
            <ContactTagManager contactId={contact.id} tags={tags} />
          </div>
        </div>

        <div>
          <h2 className="text-sm font-medium text-muted-foreground">Notes</h2>
          <div className="mt-2">
            <ContactNoteForm contactId={contact.id} />
          </div>
        </div>

        <div>
          <h2 className="text-sm font-medium text-muted-foreground">Timeline</h2>
          <div className="mt-3">
            <UnifiedTimeline
              upcomingMeetings={meetings.upcoming}
              pastMeetings={meetings.past}
              interactions={interactions}
              accountSources={accountSources}
            />
          </div>
        </div>

        <div className="rounded-xl border border-border bg-muted/30 p-4">
          <h2 className="text-sm font-medium">Enrichment</h2>
          {enrichmentBlob ? (
            <div className="mt-2 space-y-1 text-sm text-muted-foreground">
              {latestEnrichment ? (
                <p>
                  Last run {latestEnrichment.runAt.toLocaleString()} ·{" "}
                  {latestEnrichment.status}
                </p>
              ) : null}
              {linkedinUrl ? (
                <p>
                  LinkedIn:{" "}
                  <a
                    href={linkedinUrl}
                    className="text-foreground underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {linkedinUrl}
                  </a>
                </p>
              ) : null}
              {twitterUrl ? (
                <p>
                  Twitter/X:{" "}
                  <a
                    href={twitterUrl}
                    className="text-foreground underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {twitterUrl}
                  </a>
                </p>
              ) : null}
            </div>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">
              Not enriched yet. Run LeadPure to populate company, title, and
              social profiles.
            </p>
          )}
          <div className="mt-3">
            <EnrichContactButton contactId={contact.id} />
          </div>
        </div>
      </section>
    </main>
  );
}
