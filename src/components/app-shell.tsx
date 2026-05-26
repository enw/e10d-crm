"use client";

import { Calendar, Settings, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { LogoutButton } from "@/components/logout-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/contacts", label: "Contacts", icon: Users },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

function NavLink({
  href,
  label,
  icon: Icon,
}: {
  href: string;
  label: string;
  icon: typeof Calendar;
}) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      className={cn(
        "inline-flex min-h-9 items-center gap-2 rounded-sm px-3 py-2 text-sm no-underline transition-colors",
        active
          ? "text-foreground underline decoration-accent/50 underline-offset-4"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      <Icon className="size-4 shrink-0 opacity-70" />
      <span>{label}</span>
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex h-dvh overflow-hidden md:flex-row">
      <aside className="hidden h-full w-52 shrink-0 border-r border-border bg-sidebar md:flex md:flex-col">
        <div className="border-b border-border px-4 py-5">
          <Link
            href="/calendar"
            className="text-lg font-normal tracking-tight text-foreground no-underline"
          >
            e10d
          </Link>
          <p className="mt-1 text-xs text-muted-foreground">Meeting prep</p>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 p-3">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.href} {...item} />
          ))}
        </nav>
        <div className="flex items-center gap-1 border-t border-border p-3">
          <ThemeToggle />
          <LogoutButton className="flex-1 justify-start text-muted-foreground hover:text-foreground" />
        </div>
        <p className="border-t border-border px-4 py-3 text-xs text-muted-foreground">
          Designing for inevitable decay
        </p>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden pb-16 md:pb-0">
        <header className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3 md:hidden">
          <Link
            href="/calendar"
            className="text-lg font-normal text-foreground no-underline"
          >
            e10d
          </Link>
          <ThemeToggle />
        </header>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {children}
        </div>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-background/95 backdrop-blur md:hidden">
        {NAV_ITEMS.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-2 text-xs",
                active
                  ? "font-medium text-foreground underline decoration-accent/50 underline-offset-4"
                  : "text-muted-foreground",
              )}
            >
              <Icon className="size-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
