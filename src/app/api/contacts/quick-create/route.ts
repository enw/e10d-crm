import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { createContactFromAttendee } from "@/lib/sync/calendar-attendees";

export async function POST(request: Request) {
  let body: { email?: string; displayName?: string };
  try {
    body = (await request.json()) as { email?: string; displayName?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = body.email?.trim();
  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  try {
    const result = await createContactFromAttendee({
      email,
      displayName: body.displayName,
    });

    revalidatePath("/contacts");
    revalidatePath("/calendar");

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create contact";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
