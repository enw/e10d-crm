import Link from "next/link";
import { notFound } from "next/navigation";

import { ContactTagManager } from "@/components/contact-tag-manager";
import { LogoutButton } from "@/components/logout-button";
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
      <h2 className="text-sm font-medium text-zinc-500">{label}</h2>
      <ul className="mt-1 space-y-1 text-sm text-zinc-900">
        {values.map((value) => (
          <li key={value}>{value}</li>
        ))}
      </ul>
    </div>
  );
}

export default async function ContactDossierPage({ params }: ContactPageProps) {
  const { id } = await params;
  const contact = await getContactById(id);

  if (!contact) {
    notFound();
  }

  const tags = await listTagsForContact(id);
  const title = contact.displayName || contact.emails[0] || "Unknown contact";

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-8">
      <header className="flex items-start justify-between gap-4 border-b border-zinc-200 pb-4">
        <div>
          <Link
            href="/contacts"
            className="text-sm text-zinc-500 hover:text-zinc-900"
          >
            ← Contacts
          </Link>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900">
            {title}
          </h1>
          {contact.company || contact.title ? (
            <p className="mt-1 text-sm text-zinc-600">
              {[contact.title, contact.company].filter(Boolean).join(" · ")}
            </p>
          ) : null}
        </div>
        <nav className="flex items-center gap-3 text-sm">
          <Link href="/settings" className="text-zinc-600 hover:text-zinc-900">
            Settings
          </Link>
          <LogoutButton />
        </nav>
      </header>

      <section className="mt-8 space-y-6">
        <FieldList label="Email" values={contact.emails} />
        <FieldList label="Phone" values={contact.phones} />
        {contact.location ? (
          <div>
            <h2 className="text-sm font-medium text-zinc-500">Location</h2>
            <p className="mt-1 text-sm text-zinc-900">{contact.location}</p>
          </div>
        ) : null}

        <div>
          <h2 className="text-sm font-medium text-zinc-500">Tags</h2>
          <div className="mt-2">
            <ContactTagManager contactId={contact.id} tags={tags} />
          </div>
        </div>

        <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-4">
          <h2 className="text-sm font-medium text-zinc-700">Enrichment</h2>
          <p className="mt-1 text-sm text-zinc-500">
            {contact.enrichmentBlob
              ? "Enrichment data is stored; pipeline UI arrives in a later ticket."
              : "Not enriched yet. LeadPure integration lands in T13."}
          </p>
        </div>
      </section>
    </main>
  );
}
