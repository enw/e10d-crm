"use server";

import { revalidatePath } from "next/cache";

import { disconnectGoogleAccount } from "@/lib/google/accounts";
import { batchEnrichPendingContacts } from "@/lib/enrichment/batch";
import { isLeadPureConfigured } from "@/lib/enrichment/leadpure";
import { syncAllGoogleAccounts } from "@/lib/sync/runner";

export async function disconnectGoogleAccountAction(accountId: string) {
  await disconnectGoogleAccount(accountId);
  revalidatePath("/settings");
  revalidatePath("/contacts");
  revalidatePath("/calendar");
}

export async function syncNowAction() {
  const result = await syncAllGoogleAccounts();
  revalidatePath("/settings");
  revalidatePath("/contacts");
  revalidatePath("/calendar");
  return result;
}

export async function batchEnrichAction() {
  if (!isLeadPureConfigured()) {
    throw new Error("Contact enrichment is not configured");
  }

  const result = await batchEnrichPendingContacts();
  revalidatePath("/settings");
  revalidatePath("/contacts");
  for (const item of result.results) {
    if (item.status === "success") {
      revalidatePath(`/contacts/${item.contactId}`);
    }
  }
  return result;
}
