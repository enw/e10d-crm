import { and, eq, notInArray, sql } from "drizzle-orm";

import { getDb } from "@/db";
import { contacts, enrichmentRuns } from "@/db/schema";
import { enrichContact } from "@/lib/enrichment/pipeline";

export const BATCH_CHUNK_SIZE = 5;

export type BatchEnrichmentItemResult = {
  contactId: string;
  status: "success" | "failed" | "skipped";
  error?: string;
};

export type BatchEnrichmentResult = {
  total: number;
  succeeded: number;
  failed: number;
  skipped: number;
  results: BatchEnrichmentItemResult[];
};

export async function listContactIdsForBatchEnrichment(): Promise<string[]> {
  const db = getDb();

  const successfulRuns = await db
    .select({ contactId: enrichmentRuns.contactId })
    .from(enrichmentRuns)
    .where(
      and(
        eq(enrichmentRuns.source, "leadpure"),
        eq(enrichmentRuns.status, "success"),
      ),
    );

  const enrichedContactIds = [
    ...new Set(successfulRuns.map((row) => row.contactId)),
  ];

  const rows = await db
    .select({ id: contacts.id, emails: contacts.emails })
    .from(contacts)
    .where(
      enrichedContactIds.length > 0
        ? and(
            notInArray(contacts.id, enrichedContactIds),
            sql`jsonb_array_length(${contacts.emails}) > 0`,
          )
        : sql`jsonb_array_length(${contacts.emails}) > 0`,
    )
    .orderBy(contacts.displayName);

  return rows.map((row) => row.id);
}

export async function batchEnrichContacts(
  contactIds: string[],
): Promise<BatchEnrichmentResult> {
  const results: BatchEnrichmentItemResult[] = [];
  let succeeded = 0;
  let failed = 0;
  let skipped = 0;

  for (let index = 0; index < contactIds.length; index += BATCH_CHUNK_SIZE) {
    const chunk = contactIds.slice(index, index + BATCH_CHUNK_SIZE);

    for (const contactId of chunk) {
      try {
        await enrichContact(contactId);
        results.push({ contactId, status: "success" });
        succeeded += 1;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Enrichment failed";
        if (message === "Contact has no email to enrich") {
          results.push({ contactId, status: "skipped", error: message });
          skipped += 1;
        } else {
          results.push({ contactId, status: "failed", error: message });
          failed += 1;
        }
      }
    }
  }

  return {
    total: contactIds.length,
    succeeded,
    failed,
    skipped,
    results,
  };
}

export async function batchEnrichPendingContacts(): Promise<BatchEnrichmentResult> {
  const contactIds = await listContactIdsForBatchEnrichment();
  return batchEnrichContacts(contactIds);
}
