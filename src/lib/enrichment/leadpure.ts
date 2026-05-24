import type { EnrichmentResult } from "@/lib/enrichment/types";

type FetchFn = typeof fetch;

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function mapLeadPureResponse(
  payload: Record<string, unknown>,
): EnrichmentResult {
  const data =
    payload.data && typeof payload.data === "object"
      ? (payload.data as Record<string, unknown>)
      : payload;

  return {
    company:
      readString(data.company) ??
      readString(data.companyName) ??
      readString(data.organization),
    title:
      readString(data.title) ??
      readString(data.jobTitle) ??
      readString(data.role),
    location:
      readString(data.location) ??
      readString(data.city) ??
      readString(data.region),
    linkedinUrl:
      readString(data.linkedinUrl) ??
      readString(data.linkedin) ??
      readString(data.linkedInUrl),
    twitterUrl:
      readString(data.twitterUrl) ??
      readString(data.twitter) ??
      readString(data.xUrl),
    raw: payload,
  };
}

export async function enrichWithLeadPure(
  email: string,
  options?: {
    apiKey?: string;
    apiUrl?: string;
    fetchFn?: FetchFn;
  },
): Promise<EnrichmentResult> {
  const apiKey = options?.apiKey ?? process.env.LEADPURE_API_KEY;
  if (!apiKey) {
    throw new Error("LEADPURE_API_KEY is not configured");
  }

  const apiUrl =
    options?.apiUrl ??
    process.env.LEADPURE_API_URL ??
    "https://api.leadpure.io/v1/enrich";
  const fetchFn = options?.fetchFn ?? fetch;

  const response = await fetchFn(apiUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`LeadPure request failed (${response.status}): ${body}`);
  }

  const payload = (await response.json()) as Record<string, unknown>;
  return mapLeadPureResponse(payload);
}
