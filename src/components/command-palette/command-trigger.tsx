"use client";

import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useCommandPalette } from "@/components/command-palette/command-palette-provider";
import { cn } from "@/lib/utils";

export function CommandTriggerButton({
  className,
  showLabel = false,
}: {
  className?: string;
  showLabel?: boolean;
}) {
  const { openPalette } = useCommandPalette();

  return (
    <Button
      type="button"
      variant="ghost"
      size={showLabel ? "sm" : "icon-sm"}
      className={cn("text-muted-foreground hover:text-foreground", className)}
      onClick={() => openPalette("search")}
      aria-label="Find anywhere"
    >
      <Search />
      {showLabel ? (
        <>
          <span>Find…</span>
          <kbd className="ml-auto hidden rounded border border-border px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground lg:inline">
            ⌘K
          </kbd>
        </>
      ) : null}
    </Button>
  );
}

export function CommandActionsTrigger({
  className,
}: {
  className?: string;
}) {
  const { openPalette } = useCommandPalette();

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={className}
      onClick={() => openPalette("actions")}
    >
      Actions
    </Button>
  );
}
