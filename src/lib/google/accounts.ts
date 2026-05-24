import { desc, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { googleAccounts } from "@/db/schema";
import { encryptToken } from "@/lib/crypto/tokens";

export type GoogleAccountSummary = {
  id: string;
  email: string;
  scopes: string[];
  connectedAt: Date;
  tokenExpiresAt: Date | null;
};

export type UpsertGoogleAccountInput = {
  email: string;
  googleSub: string;
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date | null;
  scopes: string[];
};

export async function upsertGoogleAccount(
  input: UpsertGoogleAccountInput,
): Promise<GoogleAccountSummary> {
  const db = getDb();
  const now = new Date();

  const values = {
    email: input.email,
    googleSub: input.googleSub,
    encryptedAccessToken: encryptToken(input.accessToken),
    encryptedRefreshToken: input.refreshToken
      ? encryptToken(input.refreshToken)
      : null,
    tokenExpiresAt: input.expiresAt,
    scopes: input.scopes,
    updatedAt: now,
  };

  const [row] = await db
    .insert(googleAccounts)
    .values(values)
    .onConflictDoUpdate({
      target: googleAccounts.email,
      set: values,
    })
    .returning({
      id: googleAccounts.id,
      email: googleAccounts.email,
      scopes: googleAccounts.scopes,
      createdAt: googleAccounts.createdAt,
      tokenExpiresAt: googleAccounts.tokenExpiresAt,
    });

  return {
    id: row.id,
    email: row.email,
    scopes: row.scopes,
    connectedAt: row.createdAt,
    tokenExpiresAt: row.tokenExpiresAt,
  };
}

export async function listGoogleAccounts(): Promise<GoogleAccountSummary[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: googleAccounts.id,
      email: googleAccounts.email,
      scopes: googleAccounts.scopes,
      createdAt: googleAccounts.createdAt,
      tokenExpiresAt: googleAccounts.tokenExpiresAt,
    })
    .from(googleAccounts)
    .orderBy(desc(googleAccounts.createdAt));

  return rows.map((row) => ({
    id: row.id,
    email: row.email,
    scopes: row.scopes,
    connectedAt: row.createdAt,
    tokenExpiresAt: row.tokenExpiresAt,
  }));
}

export async function getGoogleAccountByEmail(email: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(googleAccounts)
    .where(eq(googleAccounts.email, email))
    .limit(1);

  return row ?? null;
}
