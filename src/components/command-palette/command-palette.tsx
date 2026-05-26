"use client";

import {
  Calendar,
  Download,
  FileText,
  Loader2,
  Pencil,
  RefreshCw,
  Settings,
  Sparkles,
  Tag,
  User,
  Users,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { addNoteAction, enrichContactAction } from "@/app/(app)/contacts/actions";
import { syncNowAction } from "@/app/(app)/settings/actions";
import { useCommandPalette } from "@/components/command-palette/command-palette-provider";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { Textarea } from "@/components/ui/textarea";
import {
  calendarEventHref,
  contactLabel,
  formatEventDate,
  parseCommandScope,
  type CommandScope,
} from "@/lib/command/scope";
import type { CommandSearchResponse } from "@/lib/command/search";
import { readRecentContacts, rememberRecentContact } from "@/lib/command/recents";
import { cn } from "@/lib/utils";

type CalendarEventContext = {
  id: string;
  title: string | null;
  startTime: string | null;
  linkedContactId: string | null;
  linkedContactName: string | null;
};

const EMPTY_RESULTS: CommandSearchResponse = {
  contacts: [],
  events: [],
  tags: [],
};

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [delayMs, value]);

  return debounced;
}

export function CommandPalette() {
  const { open, mode, closePalette } = useCommandPalette();

  return (
    <CommandDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          closePalette();
        }
      }}
      title="Find anywhere"
      description="Search contacts, events, and pages"
      className={cn(
        "gap-0 p-0 sm:max-w-lg",
        "max-sm:top-0 max-sm:left-0 max-sm:h-dvh max-sm:max-h-dvh max-sm:w-full max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-none",
      )}
      showCloseButton
    >
      {open ? <CommandPaletteSurface mode={mode} closePalette={closePalette} /> : null}
    </CommandDialog>
  );
}

function CommandPaletteSurface({
  mode,
  closePalette,
}: {
  mode: "search" | "actions";
  closePalette: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const scope = useMemo(
    () => parseCommandScope(pathname, searchParams),
    [pathname, searchParams],
  );

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CommandSearchResponse>(EMPTY_RESULTS);
  const [loading, setLoading] = useState(false);
  const [recents] = useState(readRecentContacts);
  const [panel, setPanel] = useState<"commands" | "add-note">("commands");
  const [noteContent, setNoteContent] = useState("");
  const [notePending, setNotePending] = useState(false);
  const [actionPending, setActionPending] = useState<string | null>(null);
  const [eventContext, setEventContext] = useState<CalendarEventContext | null>(
    null,
  );

  const debouncedQuery = useDebouncedValue(query, 200);
  const includeUpcoming =
    scope.type === "calendar" && debouncedQuery.trim().length === 0;

  useEffect(() => {
    if (panel !== "commands") {
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    async function loadResults() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (debouncedQuery.trim()) {
          params.set("q", debouncedQuery.trim());
        } else if (includeUpcoming) {
          params.set("upcoming", "1");
        }

        const response = await fetch(`/api/command/search?${params.toString()}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Search failed");
        }

        const data = (await response.json()) as CommandSearchResponse;
        if (!cancelled) {
          setResults(data);
        }
      } catch (error) {
        if (!cancelled && !(error instanceof DOMException && error.name === "AbortError")) {
          setResults(EMPTY_RESULTS);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadResults();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [debouncedQuery, includeUpcoming, panel]);

  useEffect(() => {
    const eventId = scope.type === "calendar" ? scope.eventId : undefined;
    if (!eventId) {
      return;
    }

    let cancelled = false;

    async function loadEventContext() {
      try {
        const response = await fetch(`/api/calendar/events/${eventId}`);
        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as {
          event: {
            id: string;
            title: string | null;
            startTime: string | null;
            attendees: Array<{
              contactId: string | null;
              contactName: string | null;
            }>;
          };
        };

        const linked = data.event.attendees.find((attendee) => attendee.contactId);
        if (!cancelled) {
          setEventContext({
            id: data.event.id,
            title: data.event.title,
            startTime: data.event.startTime,
            linkedContactId: linked?.contactId ?? null,
            linkedContactName: linked?.contactName ?? null,
          });
        }
      } catch {
        if (!cancelled) {
          setEventContext(null);
        }
      }
    }

    void loadEventContext();

    return () => {
      cancelled = true;
    };
  }, [scope]);

  useEffect(() => {
    if (scope.type !== "dossier") {
      return;
    }

    const name = document
      .querySelector("[data-command-contact-name]")
      ?.getAttribute("data-command-contact-name")
      ?.trim();

    if (name) {
      rememberRecentContact({ id: scope.contactId, name });
    }
  }, [scope]);

  const navigate = useCallback(
    (href: string) => {
      closePalette();
      router.push(href);
    },
    [closePalette, router],
  );

  const runAction = useCallback(
    async (key: string, action: () => Promise<void>) => {
      setActionPending(key);
      try {
        await action();
        closePalette();
        router.refresh();
      } finally {
        setActionPending(null);
      }
    },
    [closePalette, router],
  );

  const { leadPureEnabled } = useCommandPalette();

  const scopedActions = useMemo(
    () => buildScopedActions(scope, eventContext, leadPureEnabled),
    [eventContext, leadPureEnabled, scope],
  );

  const showActionsFirst = mode === "actions" && scopedActions.length > 0;
  const dossierContactId = scope.type === "dossier" ? scope.contactId : null;

  async function submitNote() {
    if (!dossierContactId || !noteContent.trim()) {
      return;
    }

    setNotePending(true);
    try {
      await addNoteAction(dossierContactId, noteContent.trim());
      setNoteContent("");
      setPanel("commands");
      closePalette();
      router.refresh();
    } finally {
      setNotePending(false);
    }
  }

  return (
    <>
      {panel === "add-note" && dossierContactId ? (
        <div className="flex flex-col gap-3 p-4">
          <div>
            <p className="text-sm font-medium">Add note</p>
            <p className="text-xs text-muted-foreground">
              Saved to this contact&apos;s timeline.
            </p>
          </div>
          <Textarea
            autoFocus
            rows={4}
            value={noteContent}
            onChange={(event) => setNoteContent(event.target.value)}
            placeholder="What did you discuss?"
            disabled={notePending}
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
              onClick={() => setPanel("commands")}
              disabled={notePending}
            >
              Back
            </button>
            <button
              type="button"
              className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
              onClick={() => void submitNote()}
              disabled={notePending || !noteContent.trim()}
            >
              {notePending ? "Saving…" : "Save note"}
            </button>
          </div>
        </div>
      ) : (
        <Command
          shouldFilter={false}
          className="rounded-none bg-transparent"
        >
          <CommandInput
            placeholder="Find contacts, events, tags…"
            value={query}
            onValueChange={setQuery}
            autoFocus={!showActionsFirst}
          />
          <CommandList className="max-h-[min(60vh,420px)] max-sm:max-h-[calc(100dvh-4rem)]">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Searching…
              </div>
            ) : null}

            {scopedActions.length > 0 ? (
              <CommandGroup heading="Actions">
                {scopedActions.map((action) => (
                  <CommandItem
                    key={action.id}
                    value={action.id}
                    onSelect={() => {
                      if (action.id === "add-note" && dossierContactId) {
                        setPanel("add-note");
                        return;
                      }

                      if (action.href) {
                        navigate(action.href);
                        return;
                      }

                      if (action.run) {
                        void runAction(action.id, action.run);
                      }
                    }}
                    disabled={actionPending === action.id}
                  >
                    <action.icon />
                    <span>{action.label}</span>
                    {actionPending === action.id ? (
                      <Loader2 className="ml-auto size-4 animate-spin" />
                    ) : null}
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}

            {scopedActions.length > 0 ? <CommandSeparator /> : null}

            <CommandGroup heading="Go to">
              {buildNavigationItems(scope).map((item) => (
                <CommandItem
                  key={item.href}
                  value={item.id}
                  onSelect={() => navigate(item.href)}
                >
                  <item.icon />
                  <span>{item.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>

            {recents.length > 0 && !debouncedQuery.trim() ? (
              <>
                <CommandSeparator />
                <CommandGroup heading="Recent">
                  {recents.map((recent) => (
                    <CommandItem
                      key={recent.id}
                      value={`recent-${recent.id}`}
                      onSelect={() => navigate(`/contacts/${recent.id}`)}
                    >
                      <User />
                      <span>{recent.name}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            ) : null}

            {results.contacts.length > 0 ? (
              <>
                <CommandSeparator />
                <CommandGroup heading="Contacts">
                  {results.contacts.map((contact) => (
                    <CommandItem
                      key={contact.id}
                      value={`contact-${contact.id}-${contactLabel(contact.displayName, contact.emails)}`}
                      onSelect={() => {
                        rememberRecentContact({
                          id: contact.id,
                          name: contactLabel(contact.displayName, contact.emails),
                        });
                        navigate(`/contacts/${contact.id}`);
                      }}
                    >
                      <User />
                      <span>{contactLabel(contact.displayName, contact.emails)}</span>
                      {contact.company ? (
                        <span className="ml-auto truncate text-xs text-muted-foreground">
                          {contact.company}
                        </span>
                      ) : null}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            ) : null}

            {results.events.length > 0 ? (
              <>
                <CommandSeparator />
                <CommandGroup
                  heading={debouncedQuery.trim() ? "Events" : "Upcoming events"}
                >
                  {results.events.map((event) => (
                    <CommandItem
                      key={event.id}
                      value={`event-${event.id}-${event.title ?? "event"}`}
                      onSelect={() =>
                        navigate(calendarEventHref(event.id, event.startTime))
                      }
                    >
                      <Calendar />
                      <span>{event.title || "Untitled event"}</span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {formatEventDate(event.startTime)}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            ) : null}

            {results.tags.length > 0 ? (
              <>
                <CommandSeparator />
                <CommandGroup heading="Tags">
                  {results.tags.map((tag) => (
                    <CommandItem
                      key={tag.id}
                      value={`tag-${tag.id}`}
                      onSelect={() =>
                        navigate(`/contacts?tag=${encodeURIComponent(tag.id)}`)
                      }
                    >
                      <Tag />
                      <span>{tag.name}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            ) : null}

            {!loading &&
            debouncedQuery.trim() &&
            results.contacts.length === 0 &&
            results.events.length === 0 &&
            results.tags.length === 0 ? (
              <CommandEmpty>No matches.</CommandEmpty>
            ) : null}
          </CommandList>
          <div className="hidden border-t border-border px-3 py-2 text-xs text-muted-foreground sm:block">
            <span className="inline-flex items-center gap-2">
              Navigate
              <CommandShortcut>↑↓</CommandShortcut>
              Select
              <CommandShortcut>↵</CommandShortcut>
              Close
              <CommandShortcut>Esc</CommandShortcut>
            </span>
          </div>
        </Command>
      )}
    </>
  );
}

type ScopedAction = {
  id: string;
  label: string;
  icon: typeof User;
  href?: string;
  run?: () => Promise<void>;
};

function buildScopedActions(
  scope: CommandScope,
  eventContext: CalendarEventContext | null,
  leadPureEnabled: boolean,
): ScopedAction[] {
  switch (scope.type) {
    case "dossier": {
      const actions: ScopedAction[] = [
        {
          id: "add-note",
          label: "Add note",
          icon: FileText,
        },
        {
          id: "edit-contact",
          label: "Edit contact",
          icon: Pencil,
          href: `/contacts/${scope.contactId}/edit`,
        },
      ];
      if (leadPureEnabled) {
        actions.push({
          id: "enrich-contact",
          label: "Enrich contact",
          icon: Sparkles,
          run: () => enrichContactAction(scope.contactId),
        });
      }
      return actions;
    }
    case "edit":
      return [
        {
          id: "back-to-dossier",
          label: "Back to dossier",
          icon: User,
          href: `/contacts/${scope.contactId}`,
        },
        {
          id: "go-contacts-list",
          label: "Go to Contacts",
          icon: Users,
          href: "/contacts",
        },
      ];
    case "calendar":
      return eventContext?.linkedContactId
        ? [
            {
              id: "open-linked-contact",
              label: `Open ${eventContext.linkedContactName ?? "linked contact"}`,
              icon: User,
              href: `/contacts/${eventContext.linkedContactId}`,
            },
          ]
        : [];
    case "settings":
      return [
        {
          id: "sync-now",
          label: "Sync now",
          icon: RefreshCw,
          run: () => syncNowAction().then(() => undefined),
        },
        {
          id: "export-json",
          label: "Export contacts JSON",
          icon: Download,
          run: async () => {
            window.location.assign("/api/export/contacts");
          },
        },
        {
          id: "connect-google",
          label: "Connect Google account",
          icon: Users,
          href: "/settings#google-accounts",
        },
      ];
    default:
      return [];
  }
}

function buildNavigationItems(scope: CommandScope) {
  const all = [
    { id: "go-calendar", label: "Calendar", href: "/calendar", icon: Calendar },
    { id: "go-contacts", label: "Contacts", href: "/contacts", icon: Users },
    {
      id: "go-settings",
      label: "Settings",
      href: "/settings",
      icon: Settings,
    },
  ] as const;

  return all.filter((item) => {
    if (scope.type === "calendar" && item.href === "/calendar") {
      return false;
    }
    if (scope.type === "contacts" && item.href === "/contacts") {
      return false;
    }
    if (scope.type === "settings" && item.href === "/settings") {
      return false;
    }
    return true;
  });
}
