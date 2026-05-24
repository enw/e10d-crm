"use server";

import { revalidatePath } from "next/cache";

import { disconnectGoogleAccount } from "@/lib/google/accounts";
import { syncAllGoogleAccounts } from "@/lib/sync/calendar";

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
