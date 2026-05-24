import { NextResponse } from "next/server";

import { listCalendarEventsForFeed } from "@/lib/sync/calendar-attendees";

export async function GET() {
  const events = await listCalendarEventsForFeed();
  return NextResponse.json({ events });
}
