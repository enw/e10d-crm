"use client";

import { useTheme } from "next-themes";

import { AccountColorDot } from "@/components/account-color-dot";
import type { AccountSource } from "@/lib/google/account-colors";
import { sortAccountSources } from "@/lib/google/account-colors";

export function AccountLegend({
  accounts,
  className,
}: {
  accounts: AccountSource[];
  className?: string;
}) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const ordered = sortAccountSources(accounts);

  if (ordered.length === 0) {
    return null;
  }

  return (
    <ul
      className={className}
      aria-label="Google account colors"
    >
      {ordered.map((account) => (
        <li
          key={account.id}
          className="flex items-center gap-2 text-xs text-muted-foreground"
        >
          <AccountColorDot
            accountId={account.id}
            accounts={ordered}
            isDark={isDark}
            title={account.email}
          />
          <span className="truncate">{account.email}</span>
        </li>
      ))}
    </ul>
  );
}
