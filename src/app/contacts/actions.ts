"use server";

import { revalidatePath } from "next/cache";

import { updateContact } from "@/lib/contacts/update";
import { addNote } from "@/lib/interactions";
import type { ContactUpdateInput } from "@/lib/sync/user-overrides";
import { enrichContact } from "@/lib/enrichment/pipeline";
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

export async function addNoteAction(contactId: string, content: string) {
  await addNote(contactId, content);
  revalidatePath("/contacts");
  revalidatePath(`/contacts/${contactId}`);
}

export async function updateContactAction(
  contactId: string,
  input: ContactUpdateInput,
) {
  await updateContact(contactId, input);
  revalidatePath("/contacts");
  revalidatePath(`/contacts/${contactId}`);
  revalidatePath(`/contacts/${contactId}/edit`);
}

export async function enrichContactAction(contactId: string) {
  await enrichContact(contactId);
  revalidatePath("/contacts");
  revalidatePath(`/contacts/${contactId}`);
}
