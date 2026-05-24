"use client";

import Link from "next/link";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ContactMeetingSummary } from "@/lib/sync/calendar-attendees";
import type { Interaction } from "@/db/schema";

export type TimelineMeetingItem = ContactMeetingSummary & {
  kind: "meeting";
  isUpcoming: boolean;
};

export type TimelineInteractionItem = Interaction & {
  kind: "interaction";
};

export type TimelineItem = TimelineMeetingItem | TimelineInteractionItem;

function formatInteractionLabel(interaction: Interaction): string {
  switch (interaction.type) {
    case "note":
      return interaction.content ?? "";
    case "tag_added":
      return `Added tag: ${interaction.content ?? "unknown"}`;
    case "tag_removed":
      return `Removed tag: ${interaction.content ?? "unknown"}`;
    case "enrichment":
      return `Enriched via ${interaction.content ?? "provider"}`;
    default:
      return interaction.content ?? interaction.type;
  }
}

function formatMeetingTime(start: Date | null, end: Date | null) {
  if (!start) {
    return "Time unknown";
  }
  const startLabel = start.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  if (!end) {
    return startLabel;
  }
  const endLabel = end.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${startLabel} – ${endLabel}`;
}

function MeetingTimelineEntry({ item }: { item: TimelineMeetingItem }) {
  const dateKey = item.startTime?.toISOString().slice(0, 10) ?? "unknown";

  return (
    <li className="border-l-2 border-primary/30 pl-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        meeting · {item.startTime?.toLocaleString()}
      </p>
      <p className="mt-1 text-sm font-medium">
        {item.title || "Untitled event"}
      </p>
      <p className="text-sm text-muted-foreground">
        {formatMeetingTime(item.startTime, item.endTime)}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{item.accountEmail}</p>
      <Button variant="link" size="sm" className="h-auto px-0" asChild>
        <Link href={`/calendar?event=${item.id}&date=${dateKey}`}>
          Open in calendar
        </Link>
      </Button>
    </li>
  );
}

function InteractionTimelineEntry({ item }: { item: TimelineInteractionItem }) {
  return (
    <li className="border-l-2 border-border pl-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {item.type.replace("_", " ")} · {item.occurredAt.toLocaleString()}
      </p>
      <p className="mt-1 text-sm">{formatInteractionLabel(item)}</p>
    </li>
  );
}

export function UnifiedTimeline({
  upcomingMeetings,
  pastMeetings,
  interactions,
}: {
  upcomingMeetings: ContactMeetingSummary[];
  pastMeetings: ContactMeetingSummary[];
  interactions: Interaction[];
}) {
  const [showPast, setShowPast] = useState(false);

  const interactionItems: TimelineInteractionItem[] = interactions.map(
    (interaction) => ({ ...interaction, kind: "interaction" as const }),
  );

  const hasContent =
    upcomingMeetings.length > 0 ||
    pastMeetings.length > 0 ||
    interactions.length > 0;

  if (!hasContent) {
    return <p className="text-sm text-muted-foreground">No activity yet.</p>;
  }

  return (
    <div className="space-y-6">
      {upcomingMeetings.length > 0 ? (
        <section>
          <div className="mb-3 flex items-center gap-2">
            <h3 className="text-sm font-medium">Upcoming meetings</h3>
            <Badge variant="secondary">{upcomingMeetings.length}</Badge>
          </div>
          <ul className="space-y-4">
            {upcomingMeetings.map((meeting) => (
              <MeetingTimelineEntry
                key={meeting.id}
                item={{ ...meeting, kind: "meeting", isUpcoming: true }}
              />
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <h3 className="mb-3 text-sm font-medium">Activity</h3>
        {interactionItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">No notes or tags yet.</p>
        ) : (
          <ul className="space-y-4">
            {interactionItems.map((item) => (
              <InteractionTimelineEntry key={item.id} item={item} />
            ))}
          </ul>
        )}
      </section>

      {pastMeetings.length > 0 ? (
        <section>
          <Button
            variant="ghost"
            size="sm"
            className="mb-3"
            onClick={() => setShowPast((value) => !value)}
          >
            {showPast ? "Hide" : "Show"} past meetings ({pastMeetings.length})
          </Button>
          {showPast ? (
            <ul className="space-y-4">
              {pastMeetings.map((meeting) => (
                <MeetingTimelineEntry
                  key={meeting.id}
                  item={{ ...meeting, kind: "meeting", isUpcoming: false }}
                />
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
