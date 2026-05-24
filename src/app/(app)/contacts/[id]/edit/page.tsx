import Link from "next/link";
import { notFound } from "next/navigation";

import { ContactEditForm } from "@/components/contact-edit-form";
import { LogoutButton } from "@/components/logout-button";
import { getContactById } from "@/lib/sync/contacts";

export const dynamic = "force-dynamic";

type ContactEditPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ContactEditPage({ params }: ContactEditPageProps) {
  const { id } = await params;
  const contact = await getContactById(id);

  if (!contact) {
    notFound();
  }

  const title = contact.displayName || contact.emails[0] || "Unknown contact";

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-8">
      <header className="flex items-start justify-between gap-4 border-b border-zinc-200 pb-4">
        <div>
          <Link
            href={`/contacts/${contact.id}`}
            className="text-sm text-zinc-500 hover:text-zinc-900"
          >
            ← Back to dossier
          </Link>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900">
            Edit {title}
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Edited fields are protected from Google re-sync.
          </p>
        </div>
        <LogoutButton />
      </header>

      <section className="mt-8">
        <ContactEditForm contact={contact} />
      </section>
    </main>
  );
}
