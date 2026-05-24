import { NextResponse } from "next/server";

import { getCalendarEventById } from "@/lib/sync/calendar-attendees";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const event = await getCalendarEventById(id);

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  return NextResponse.json({
    event: {
      ...event,
      startTime: event.startTime?.toISOString() ?? null,
      endTime: event.endTime?.toISOString() ?? null,
      attendees: event.attendees.map((attendee) => ({
        ...attendee,
        lastInteractionAt: attendee.lastInteractionAt?.toISOString() ?? null,
      })),
    },
  });
}
