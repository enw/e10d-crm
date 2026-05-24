import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { verifyRequestSession } from "@/lib/auth/session";
import { syncAllGoogleAccounts } from "@/lib/sync/runner";

function isAuthorizedCron(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return false;
  }
  return request.headers.get("X-Cron-Secret") === secret;
}

export async function POST(request: NextRequest) {
  const cronAuthorized = isAuthorizedCron(request);
  const sessionAuthorized = cronAuthorized
    ? false
    : await verifyRequestSession(request);

  if (!cronAuthorized && !sessionAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await syncAllGoogleAccounts();
  const hasErrors = result.accounts.some(
    (account) => account.contactsError || account.calendarError,
  );

  return NextResponse.json(
    {
      ok: !hasErrors,
      contacts: result.contacts,
      events: result.events,
      accounts: result.accounts,
    },
    { status: hasErrors ? 207 : 200 },
  );
}
