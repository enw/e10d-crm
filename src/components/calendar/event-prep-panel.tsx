"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { AccountColorDot } from "@/components/account-color-dot";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { AccountSource } from "@/lib/google/account-colors";
import type { ResolvedAttendee } from "@/lib/sync/calendar-attendees";

type EventDetail = {
  id: string;
  title: string | null;
  description: string | null;
  startTime: string | null;
  endTime: string | null;
  googleAccountId: string;
  accountEmail: string;
  attendees: Array<
    Omit<ResolvedAttendee, "lastInteractionAt"> & {
      lastInteractionAt: string | null;
    }
  >;
};

function formatEventTime(startIso: string | null, endIso: string | null) {
  if (!startIso) {
    return "Time unknown";
  }

  const start = new Date(startIso);
  const end = endIso ? new Date(endIso) : null;
  const date = start.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const startTime = start.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  const endTime = end
    ? end.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
    : null;

  return endTime ? `${date} · ${startTime} – ${endTime}` : `${date} · ${startTime}`;
}

function rsvpLabel(status: string | null) {
  switch (status) {
    case "accepted":
      return "Accepted";
    case "declined":
      return "Declined";
    case "tentative":
      return "Tentative";
    case "needsAction":
      return "Pending";
    default:
      return status ?? "Unknown";
  }
}

function AttendeeQuickAdd({
  email,
  onCreated,
}: {
  email: string;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/contacts/quick-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, displayName: name || undefined }),
      });
      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error ?? "Failed to create contact");
      }
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create contact");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-3 space-y-2 rounded-lg border border-dashed border-border p-3">
      <p className="text-sm font-medium">Add to contacts</p>
      <div className="space-y-2">
        <div>
          <Label htmlFor={`email-${email}`}>Email</Label>
          <Input id={`email-${email}`} value={email} readOnly className="mt-1" />
        </div>
        <div>
          <Label htmlFor={`name-${email}`}>Display name</Label>
          <Input
            id={`name-${email}`}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Optional"
            className="mt-1"
          />
        </div>
      </div>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <Button size="sm" onClick={save} disabled={loading}>
        {loading ? "Saving…" : "Save contact"}
      </Button>
    </div>
  );
}

function AttendeeCard({
  attendee,
  onContactCreated,
}: {
  attendee: EventDetail["attendees"][number];
  onContactCreated: () => void;
}) {
  const label = attendee.contactName || attendee.name || attendee.email;

  return (
    <Card size="sm">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">{label}</CardTitle>
          <Badge variant="outline">{rsvpLabel(attendee.responseStatus)}</Badge>
        </div>
        <p className="text-xs text-muted-foreground">{attendee.email}</p>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {attendee.company ? (
          <p className="text-muted-foreground">{attendee.company}</p>
        ) : null}
        {attendee.tags.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {attendee.tags.map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>
        ) : null}
        {attendee.lastInteractionAt ? (
          <p className="text-xs text-muted-foreground">
            Last interaction{" "}
            {new Date(attendee.lastInteractionAt).toLocaleString()}
          </p>
        ) : null}
        {attendee.latestNote ? (
          <p className="line-clamp-3 text-muted-foreground">
            &ldquo;{attendee.latestNote}&rdquo;
          </p>
        ) : null}
        {attendee.contactId ? (
          <Button variant="outline" size="sm" asChild>
            <Link href={`/contacts/${attendee.contactId}`}>View dossier</Link>
          </Button>
        ) : (
          <AttendeeQuickAdd email={attendee.email} onCreated={onContactCreated} />
        )}
      </CardContent>
    </Card>
  );
}

function EventPrepContent({
  eventId,
  accountSources,
  onContactCreated,
}: {
  eventId: string;
  accountSources: AccountSource[];
  onContactCreated: () => void;
}) {
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void fetch(`/api/calendar/events/${eventId}`)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Failed to load event");
        }
        return (await response.json()) as { event: EventDetail };
      })
      .then((data) => {
        if (!cancelled) {
          setEvent(data.event);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load event");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [eventId]);

  if (error) {
    return (
      <p className="text-sm text-destructive" role="alert">
        {error}
      </p>
    );
  }

  if (!event) {
    return (
      <>
        <SheetHeader>
          <SheetTitle>Meeting prep</SheetTitle>
          <SheetDescription>Loading event details…</SheetDescription>
        </SheetHeader>
        <p className="text-sm text-muted-foreground">Loading…</p>
      </>
    );
  }

  return (
    <>
      <SheetHeader>
        <SheetTitle>{event.title || "Meeting prep"}</SheetTitle>
        <SheetDescription>
          {formatEventTime(event.startTime, event.endTime)}
        </SheetDescription>
      </SheetHeader>

      <div className="space-y-4 pb-6">
        {event.description ? (
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {event.description}
          </p>
        ) : null}
        <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
          <AccountColorDot
            accountId={event.googleAccountId}
            accounts={accountSources}
          />
          {event.accountEmail}
        </p>
        <div className="space-y-3">
          <h3 className="text-sm font-medium">
            Attendees ({event.attendees.length})
          </h3>
          {event.attendees.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No external attendees on this event.
            </p>
          ) : (
            event.attendees.map((attendee) => (
              <AttendeeCard
                key={attendee.email}
                attendee={attendee}
                onContactCreated={onContactCreated}
              />
            ))
          )}
        </div>
      </div>
    </>
  );
}

export function EventPrepPanel({
  eventId,
  accountSources,
  open,
  onOpenChange,
  onContactCreated,
}: {
  eventId: string | null;
  accountSources: AccountSource[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onContactCreated: () => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col sm:max-w-md">
        <ScrollArea className="flex-1 pr-3">
          {open && eventId ? (
            <EventPrepContent
              key={eventId}
              eventId={eventId}
              accountSources={accountSources}
              onContactCreated={onContactCreated}
            />
          ) : (
            <SheetHeader>
              <SheetTitle>Meeting prep</SheetTitle>
              <SheetDescription>Select an event to prep</SheetDescription>
            </SheetHeader>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
