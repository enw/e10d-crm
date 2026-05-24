"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { assignTagAction, removeTagAction } from "@/app/contacts/actions";

type Tag = {
  id: string;
  name: string;
};

export function ContactTagManager({
  contactId,
  tags,
}: {
  contactId: string;
  tags: Tag[];
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);

  async function onAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      return;
    }

    setPending(true);
    try {
      await assignTagAction(contactId, trimmed);
      setName("");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function onRemove(tagId: string) {
    setPending(true);
    try {
      await removeTagAction(contactId, tagId);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {tags.length === 0 ? (
          <p className="text-sm text-zinc-500">No tags yet.</p>
        ) : (
          tags.map((tag) => (
            <span
              key={tag.id}
              className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-3 py-1 text-sm text-zinc-800"
            >
              {tag.name}
              <button
                type="button"
                disabled={pending}
                onClick={() => onRemove(tag.id)}
                className="text-zinc-500 hover:text-zinc-900 disabled:opacity-50"
                aria-label={`Remove tag ${tag.name}`}
              >
                ×
              </button>
            </span>
          ))
        )}
      </div>
      <form onSubmit={onAdd} className="flex gap-2">
        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Add tag…"
          disabled={pending}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50 disabled:opacity-50"
        >
          Add
        </button>
      </form>
    </section>
  );
}
