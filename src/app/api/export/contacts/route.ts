import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { verifyRequestSession } from "@/lib/auth/session";
import { buildContactsExport } from "@/lib/export/contacts";

export async function GET(request: NextRequest) {
  const authenticated = await verifyRequestSession(request);
  if (!authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await buildContactsExport();
  const filename = `e10d-crm-export-${payload.exportedAt.slice(0, 10)}.json`;

  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
