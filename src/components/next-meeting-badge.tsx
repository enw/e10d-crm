"use client";

import { AccountColorDot } from "@/components/account-color-dot";
import { Badge } from "@/components/ui/badge";
import type { AccountSource } from "@/lib/google/account-colors";

export function NextMeetingBadge({
  label,
  googleAccountId,
  accountSources,
}: {
  label: string;
  googleAccountId: string;
  accountSources: AccountSource[];
}) {
  return (
    <Badge variant="secondary" className="shrink-0 gap-1.5">
      <AccountColorDot
        accountId={googleAccountId}
        accounts={accountSources}
        className="size-2"
      />
      Next: {label}
    </Badge>
  );
}
