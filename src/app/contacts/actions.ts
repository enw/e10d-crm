"use server";

import { revalidatePath } from "next/cache";

import { assignTagToContact, removeTagFromContact } from "@/lib/tags";

export async function assignTagAction(contactId: string, tagName: string) {
  await assignTagToContact(contactId, tagName);
  revalidatePath("/contacts");
  revalidatePath(`/contacts/${contactId}`);
}

export async function removeTagAction(contactId: string, tagId: string) {
  await removeTagFromContact(contactId, tagId);
  revalidatePath("/contacts");
  revalidatePath(`/contacts/${contactId}`);
}
