"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { syncNowAction } from "@/app/(app)/settings/actions";

export function SyncNowButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  async function onClick() {
    setPending(true);
    setMessage(null);
    setIsError(false);

    try {
      const result = await syncNowAction();
      const failedAccounts = result.accounts.filter(
        (account) => account.contactsError || account.calendarError,
      );

      if (failedAccounts.length > 0) {
        setIsError(true);
        setMessage(
          `Synced ${result.contacts} contacts and ${result.events} events with ${failedAccounts.length} account error(s). See account details below.`,
        );
      } else {
        setMessage(
          `Synced ${result.contacts} contacts and ${result.events} calendar events.`,
        );
      }
      router.refresh();
    } catch (error) {
      setIsError(true);
      setMessage(error instanceof Error ? error.message : "Sync failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50 disabled:opacity-50"
      >
        {pending ? "Syncing…" : "Sync now"}
      </button>
      {message ? (
        <p className={`text-sm ${isError ? "text-red-600" : "text-zinc-600"}`}>
          {message}
        </p>
      ) : null}
    </div>
  );
}
