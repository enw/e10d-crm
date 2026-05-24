import { desc, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { contacts, enrichmentRuns } from "@/db/schema";
import { enrichWithLeadPure } from "@/lib/enrichment/leadpure";
import type { EnrichmentResult } from "@/lib/enrichment/types";
import { logInteraction } from "@/lib/interactions";
import { pickPrimaryEmail } from "@/lib/sync/contact-merge";
import type { UserOverrides } from "@/lib/sync/user-overrides";

export function mergeEnrichmentIntoContact(
  contact: {
    company: string | null;
    title: string | null;
    location: string | null;
    enrichmentBlob: Record<string, unknown> | null;
    userOverrides: UserOverrides;
  },
  source: string,
  result: EnrichmentResult,
) {
  const overrides = contact.userOverrides ?? {};
  const enrichmentBlob = {
    ...(contact.enrichmentBlob ?? {}),
    [source]: result.raw,
  };

  return {
    enrichmentBlob,
    company:
      contact.company || overrides.company
        ? contact.company
        : (result.company ?? contact.company),
    title:
      contact.title || overrides.title
        ? contact.title
        : (result.title ?? contact.title),
    location:
      contact.location || overrides.location
        ? contact.location
        : (result.location ?? contact.location),
  };
}

export async function enrichContact(contactId: string, source = "leadpure") {
  const db = getDb();
  const [contact] = await db
    .select()
    .from(contacts)
    .where(eq(contacts.id, contactId))
    .limit(1);

  if (!contact) {
    throw new Error("Contact not found");
  }

  const email = pickPrimaryEmail(contact.emails);
  if (!email) {
    throw new Error("Contact has no email to enrich");
  }

  const [run] = await db
    .insert(enrichmentRuns)
    .values({
      contactId,
      source,
      status: "pending",
    })
    .returning();

  try {
    const result = await enrichWithLeadPure(email);

    const merged = mergeEnrichmentIntoContact(
      {
        company: contact.company,
        title: contact.title,
        location: contact.location,
        enrichmentBlob:
          (contact.enrichmentBlob as Record<string, unknown> | null) ?? null,
        userOverrides: contact.userOverrides ?? {},
      },
      source,
      result,
    );
    const now = new Date();

    await db
      .update(contacts)
      .set({ ...merged, updatedAt: now })
      .where(eq(contacts.id, contactId));

    await db
      .update(enrichmentRuns)
      .set({
        status: "success",
        result: result.raw,
        runAt: now,
      })
      .where(eq(enrichmentRuns.id, run.id));

    await logInteraction({
      contactId,
      type: "enrichment",
      content: source,
      metadata: {
        enricherId: source,
        company: result.company,
        title: result.title,
      },
    });

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Enrichment failed";
    await db
      .update(enrichmentRuns)
      .set({
        status: "failed",
        errorMessage: message,
        runAt: new Date(),
      })
      .where(eq(enrichmentRuns.id, run.id));
    throw error;
  }
}

export async function getLatestEnrichmentRun(contactId: string, source = "leadpure") {
  const db = getDb();
  const [run] = await db
    .select()
    .from(enrichmentRuns)
    .where(eq(enrichmentRuns.contactId, contactId))
    .orderBy(desc(enrichmentRuns.runAt))
    .limit(1);

  if (!run || run.source !== source) {
    return null;
  }

  return run;
}
