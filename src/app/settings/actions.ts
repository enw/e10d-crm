"use server";

import { revalidatePath } from "next/cache";

import { disconnectGoogleAccount } from "@/lib/google/accounts";

export async function disconnectGoogleAccountAction(accountId: string) {
  await disconnectGoogleAccount(accountId);
  revalidatePath("/settings");
  revalidatePath("/contacts");
}
