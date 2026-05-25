"use client";

import { useTheme } from "next-themes";

import { cn } from "@/lib/utils";
import type { AccountSource } from "@/lib/google/account-colors";
import { getAccountMainColor } from "@/lib/google/account-colors";

export function AccountColorDot({
  accountId,
  accounts,
  isDark,
  className,
  title,
}: {
  accountId: string;
  accounts: AccountSource[];
  isDark?: boolean;
  className?: string;
  title?: string;
}) {
  const { resolvedTheme } = useTheme();
  const dark = isDark ?? resolvedTheme === "dark";
  const color = getAccountMainColor(accountId, accounts, dark);

  return (
    <span
      className={cn("inline-block size-2.5 shrink-0 rounded-full", className)}
      style={{ backgroundColor: color }}
      title={title}
      aria-hidden={title ? undefined : true}
    />
  );
}

export function AccountColorStrip({
  accountId,
  accounts,
  isDark,
  className,
}: {
  accountId: string;
  accounts: AccountSource[];
  isDark?: boolean;
  className?: string;
}) {
  const { resolvedTheme } = useTheme();
  const dark = isDark ?? resolvedTheme === "dark";
  const color = getAccountMainColor(accountId, accounts, dark);

  return (
    <span
      className={cn("w-1 shrink-0 rounded-full", className)}
      style={{ backgroundColor: color }}
      aria-hidden
    />
  );
}

export function AccountSourceDots({
  accountIds,
  accounts,
  className,
}: {
  accountIds: string[];
  accounts: AccountSource[];
  className?: string;
}) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  if (accountIds.length === 0) {
    return null;
  }

  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      {accountIds.map((accountId) => (
        <AccountColorDot
          key={accountId}
          accountId={accountId}
          accounts={accounts}
          isDark={isDark}
        />
      ))}
    </span>
  );
}
