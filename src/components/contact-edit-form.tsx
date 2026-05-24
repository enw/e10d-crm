"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { updateContactAction } from "@/app/(app)/contacts/actions";
import type { Contact } from "@/db/schema";

function joinList(values: string[]) {
  return values.join(", ");
}

function splitList(value: string) {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function ContactEditForm({ contact }: { contact: Contact }) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(contact.displayName);
  const [company, setCompany] = useState(contact.company ?? "");
  const [title, setTitle] = useState(contact.title ?? "");
  const [location, setLocation] = useState(contact.location ?? "");
  const [emails, setEmails] = useState(joinList(contact.emails));
  const [phones, setPhones] = useState(joinList(contact.phones));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    try {
      await updateContactAction(contact.id, {
        displayName: displayName.trim(),
        company: company.trim() || null,
        title: title.trim() || null,
        location: location.trim() || null,
        emails: splitList(emails),
        phones: splitList(phones),
      });
      router.push(`/contacts/${contact.id}`);
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not save contact",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block space-y-1 text-sm">
        <span className="font-medium text-zinc-700">Display name</span>
        <input
          type="text"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900"
        />
      </label>
      <label className="block space-y-1 text-sm">
        <span className="font-medium text-zinc-700">Company</span>
        <input
          type="text"
          value={company}
          onChange={(event) => setCompany(event.target.value)}
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900"
        />
      </label>
      <label className="block space-y-1 text-sm">
        <span className="font-medium text-zinc-700">Title</span>
        <input
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900"
        />
      </label>
      <label className="block space-y-1 text-sm">
        <span className="font-medium text-zinc-700">Location</span>
        <input
          type="text"
          value={location}
          onChange={(event) => setLocation(event.target.value)}
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900"
        />
      </label>
      <label className="block space-y-1 text-sm">
        <span className="font-medium text-zinc-700">Emails</span>
        <input
          type="text"
          value={emails}
          onChange={(event) => setEmails(event.target.value)}
          placeholder="comma-separated"
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900"
        />
      </label>
      <label className="block space-y-1 text-sm">
        <span className="font-medium text-zinc-700">Phones</span>
        <input
          type="text"
          value={phones}
          onChange={(event) => setPhones(event.target.value)}
          placeholder="comma-separated"
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900"
        />
      </label>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          Save
        </button>
      </div>
    </form>
  );
}
