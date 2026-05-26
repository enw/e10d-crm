import { NextResponse } from "next/server";

import { commandSearch } from "@/lib/command/search";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? "";
  const upcoming = url.searchParams.get("upcoming") === "1";

  const result = await commandSearch(q, { includeUpcomingEvents: upcoming && !q.trim() });

  return NextResponse.json(result);
}
