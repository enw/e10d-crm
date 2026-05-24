const GOOGLE_PLAYGROUND_CLIENT_ID =
  "764086051850-6qr4p6gpi6hn506pt8ejuq83di341hur.apps.googleusercontent.com";

const ERROR_MESSAGES: Record<string, string> = {
  AccessDenied:
    "Google sign-in was denied. The account may not have granted required permissions, or saving the connection failed (check database and TOKEN_ENCRYPTION_KEY).",
  OAuthSignin:
    "Could not start Google OAuth. Verify GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and NEXTAUTH_URL.",
  OAuthCallback:
    "Google returned an error. Check that the redirect URI in Google Cloud Console matches NEXTAUTH_URL + /api/auth/callback/google.",
  Callback:
    "OAuth callback failed. Check server logs for database or token encryption errors.",
  Configuration:
    "NextAuth is misconfigured. Ensure AUTH_SECRET and NEXTAUTH_URL are set.",
  google:
    "OAuth was not started correctly (stale link). Use the Connect button again.",
};

export function googleOAuthErrorMessage(error: string | undefined): string | null {
  if (!error) {
    return null;
  }
  return ERROR_MESSAGES[error] ?? `Google sign-in failed (${error}). Check server logs.`;
}

export function isGooglePlaygroundClientId(clientId: string | undefined): boolean {
  return clientId === GOOGLE_PLAYGROUND_CLIENT_ID;
}
