"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";

import {
  bulkAssignTagAction,
  bulkRemoveTagAction,
} from "@/app/(app)/contacts/actions";
import { AccountSourceDots } from "@/components/account-color-dot";
import { NextMeetingBadge } from "@/components/next-meeting-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AccountSource } from "@/lib/google/account-colors";
import type { ContactListItem } from "@/lib/sync/contacts";

type Tag = {
  id: string;
  name: string;
};

type ContactRow = ContactListItem & {
  nextMeetingLabel: string | null;
  nextMeetingGoogleAccountId: string | null;
};

function ContactCheckbox({
  checked,
  indeterminate,
  onChange,
  label,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex shrink-0 cursor-pointer items-center">
      <input
        type="checkbox"
        checked={checked}
        ref={(element) => {
          if (element) {
            element.indeterminate = indeterminate ?? false;
          }
        }}
        onChange={(event) => onChange(event.target.checked)}
        onClick={(event) => event.stopPropagation()}
        aria-label={label}
        className="size-4 rounded border border-input accent-primary"
      />
    </label>
  );
}

export function ContactsListWithSelection({
  contacts,
  tags,
  accountSources,
}: {
  contacts: ContactRow[];
  tags: Tag[];
  accountSources: AccountSource[];
}) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [tagName, setTagName] = useState("");
  const [removeTagId, setRemoveTagId] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  const contactIds = useMemo(
    () => contacts.map((contact) => contact.id),
    [contacts],
  );

  const selectedCount = selectedIds.size;
  const allSelected =
    contacts.length > 0 && selectedCount === contacts.length;
  const someSelected = selectedCount > 0 && !allSelected;

  function toggleOne(contactId: string, checked: boolean) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(contactId);
      } else {
        next.delete(contactId);
      }
      return next;
    });
  }

  function toggleAll(checked: boolean) {
    setSelectedIds(checked ? new Set(contactIds) : new Set());
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  async function onApplyTag(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = tagName.trim();
    if (!trimmed || selectedCount === 0) {
      return;
    }

    setPending(true);
    setMessage(null);
    setIsError(false);

    try {
      await bulkAssignTagAction([...selectedIds], trimmed);
      setTagName("");
      setMessage(
        `Added “${trimmed}” to ${selectedCount} contact${selectedCount === 1 ? "" : "s"}.`,
      );
      router.refresh();
    } catch (error) {
      setIsError(true);
      setMessage(
        error instanceof Error ? error.message : "Failed to apply tag",
      );
    } finally {
      setPending(false);
    }
  }

  async function onRemoveTag() {
    if (!removeTagId || selectedCount === 0) {
      return;
    }

    const tag = tags.find((item) => item.id === removeTagId);
    if (!tag) {
      return;
    }

    setPending(true);
    setMessage(null);
    setIsError(false);

    try {
      await bulkRemoveTagAction([...selectedIds], removeTagId);
      setRemoveTagId("");
      setMessage(
        `Removed “${tag.name}” from ${selectedCount} contact${selectedCount === 1 ? "" : "s"}.`,
      );
      router.refresh();
    } catch (error) {
      setIsError(true);
      setMessage(
        error instanceof Error ? error.message : "Failed to remove tag",
      );
    } finally {
      setPending(false);
    }
  }

  if (contacts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {selectedCount > 0 ? (
        <div className="sticky top-0 z-10 space-y-2 rounded-sm border border-border bg-card/95 px-4 py-3 shadow-sm backdrop-blur">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className="text-sm font-medium">
              {selectedCount} selected
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearSelection}
              disabled={pending}
            >
              Clear
            </Button>
            <form
              onSubmit={onApplyTag}
              className="flex min-w-0 flex-1 flex-wrap items-center gap-2"
            >
              <Input
                value={tagName}
                onChange={(event) => setTagName(event.target.value)}
                placeholder="Tag name…"
                disabled={pending}
                className="max-w-48"
              />
              <Button type="submit" size="sm" disabled={pending || !tagName.trim()}>
                Apply tag
              </Button>
            </form>
            <div className="flex items-center gap-2">
              <select
                value={removeTagId}
                onChange={(event) => setRemoveTagId(event.target.value)}
                disabled={pending || tags.length === 0}
                aria-label="Tag to remove"
                className="h-7 max-w-40 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
              >
                <option value="">Remove tag…</option>
                {tags.map((tag) => (
                  <option key={tag.id} value={tag.id}>
                    {tag.name}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onRemoveTag}
                disabled={pending || !removeTagId}
              >
                Remove
              </Button>
            </div>
          </div>
          {message ? (
            <p
              className={`text-sm ${isError ? "text-destructive" : "text-muted-foreground"}`}
            >
              {message}
            </p>
          ) : null}
        </div>
      ) : null}

      <ul className="divide-y divide-border rounded-sm border border-border bg-card">
        <li className="flex items-center gap-3 border-b border-border bg-muted/30 px-4 py-2">
          <ContactCheckbox
            checked={allSelected}
            indeterminate={someSelected}
            onChange={toggleAll}
            label={`Select all ${contacts.length} contacts`}
          />
          <span className="text-sm text-muted-foreground">
            Select all ({contacts.length})
          </span>
        </li>
        {contacts.map((contact) => {
          const isSelected = selectedIds.has(contact.id);
          return (
            <li key={contact.id} className="flex items-start gap-3 px-4 py-3">
              <ContactCheckbox
                checked={isSelected}
                onChange={(checked) => toggleOne(contact.id, checked)}
                label={`Select ${contact.displayName || contact.emails[0] || "contact"}`}
              />
              <Link
                href={`/contacts/${contact.id}`}
                className="min-w-0 flex-1 hover:opacity-80"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-1 items-start gap-2">
                    <AccountSourceDots
                      accountIds={contact.googleAccountIds}
                      accounts={accountSources}
                      className="mt-1.5"
                    />
                    <div className="min-w-0">
                      <p className="font-medium">
                        {contact.displayName ||
                          contact.emails[0] ||
                          "Unknown"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {contact.emails[0] ?? "No email"}
                        {contact.company ? ` · ${contact.company}` : ""}
                      </p>
                    </div>
                  </div>
                  {contact.nextMeetingLabel &&
                  contact.nextMeetingGoogleAccountId ? (
                    <NextMeetingBadge
                      label={contact.nextMeetingLabel}
                      googleAccountId={contact.nextMeetingGoogleAccountId}
                      accountSources={accountSources}
                    />
                  ) : null}
                </div>
                {contact.tags.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1 pl-5">
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
    </div>
  );
}
