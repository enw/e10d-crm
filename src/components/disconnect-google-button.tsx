"use client";

import { useTransition } from "react";

type DisconnectGoogleAccountButtonProps = {
  accountId: string;
  email: string;
};

export function DisconnectGoogleAccountButton({
  accountId,
  email,
}: DisconnectGoogleAccountButtonProps) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (
          !window.confirm(`Disconnect ${email}? Synced contacts from this account will be removed.`)
        ) {
          return;
        }

        startTransition(async () => {
          const { disconnectGoogleAccountAction } = await import(
            "@/app/(app)/settings/actions"
          );
          await disconnectGoogleAccountAction(accountId);
        });
      }}
      className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 disabled:opacity-60"
    >
      {pending ? "Disconnecting…" : "Disconnect"}
    </button>
  );
}
