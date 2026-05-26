"use server";

import { revalidatePath } from "next/cache";

import { updateContact } from "@/lib/contacts/update";
import { addNote } from "@/lib/interactions";
import type { ContactUpdateInput } from "@/lib/sync/user-overrides";
import { isLeadPureConfigured } from "@/lib/enrichment/leadpure";
import { enrichContact } from "@/lib/enrichment/pipeline";
import {
  assignTagToContact,
  assignTagToContacts,
  removeTagFromContact,
  removeTagFromContacts,
} from "@/lib/tags";

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

export async function bulkAssignTagAction(
  contactIds: string[],
  tagName: string,
) {
  if (contactIds.length === 0) {
    return;
  }

  await assignTagToContacts(contactIds, tagName);
  revalidatePath("/contacts");
  for (const contactId of contactIds) {
    revalidatePath(`/contacts/${contactId}`);
  }
}

export async function bulkRemoveTagAction(
  contactIds: string[],
  tagId: string,
) {
  if (contactIds.length === 0) {
    return;
  }

  await removeTagFromContacts(contactIds, tagId);
  revalidatePath("/contacts");
  for (const contactId of contactIds) {
    revalidatePath(`/contacts/${contactId}`);
  }
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
  if (!isLeadPureConfigured()) {
    throw new Error("Contact enrichment is not configured");
  }

  await enrichContact(contactId);
  revalidatePath("/contacts");
  revalidatePath(`/contacts/${contactId}`);
}
