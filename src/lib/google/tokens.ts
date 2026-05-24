import { eq } from "drizzle-orm";
import { google } from "googleapis";

import { getDb } from "@/db";
import { googleAccounts } from "@/db/schema";
import { decryptToken, encryptToken } from "@/lib/crypto/tokens";

const REFRESH_BUFFER_MS = 60_000;

export async function getGoogleAccountById(id: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(googleAccounts)
    .where(eq(googleAccounts.id, id))
    .limit(1);

  return row ?? null;
}

export async function getValidAccessToken(
  accountId: string,
): Promise<string> {
  const account = await getGoogleAccountById(accountId);
  if (!account) {
    throw new Error(`Google account not found: ${accountId}`);
  }

  const accessToken = decryptToken(account.encryptedAccessToken);
  const expiresAt = account.tokenExpiresAt?.getTime() ?? 0;
  const stillValid = expiresAt - Date.now() > REFRESH_BUFFER_MS;

  if (stillValid) {
    return accessToken;
  }

  if (!account.encryptedRefreshToken) {
    return accessToken;
  }

  const refreshToken = decryptToken(account.encryptedRefreshToken);
  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
  );
  oauth2.setCredentials({ refresh_token: refreshToken });
  const { credentials } = await oauth2.refreshAccessToken();

  if (!credentials.access_token) {
    throw new Error("Failed to refresh Google access token");
  }

  const db = getDb();
  await db
    .update(googleAccounts)
    .set({
      encryptedAccessToken: encryptToken(credentials.access_token),
      tokenExpiresAt: credentials.expiry_date
        ? new Date(credentials.expiry_date)
        : null,
      updatedAt: new Date(),
    })
    .where(eq(googleAccounts.id, accountId));

  return credentials.access_token;
}

export async function revokeGoogleToken(token: string): Promise<void> {
  const response = await fetch("https://oauth2.googleapis.com/revoke", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ token }),
  });

  if (!response.ok) {
    console.warn("Google token revoke failed:", response.status);
  }
}
