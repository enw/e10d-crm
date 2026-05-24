import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

import { upsertGoogleAccount } from "@/lib/google/accounts";

export const GOOGLE_OAUTH_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/contacts.readonly",
  "https://www.googleapis.com/auth/calendar.readonly",
] as const;

export const googleAuthOptions: NextAuthOptions = {
  secret: process.env.AUTH_SECRET,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      authorization: {
        params: {
          scope: GOOGLE_OAUTH_SCOPES.join(" "),
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 60 * 5,
  },
  callbacks: {
    async signIn({ account, profile }) {
      if (!account || account.provider !== "google") {
        return false;
      }

      const email = profile?.email;
      const googleSub = account.providerAccountId;
      if (!email || !googleSub || !account.access_token) {
        return false;
      }

      await upsertGoogleAccount({
        email,
        googleSub,
        accessToken: account.access_token,
        refreshToken: account.refresh_token ?? null,
        expiresAt: account.expires_at
          ? new Date(account.expires_at * 1000)
          : null,
        scopes: account.scope?.split(" ").filter(Boolean) ?? [
          ...GOOGLE_OAUTH_SCOPES,
        ],
      });

      return true;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith(baseUrl)) {
        return url;
      }
      return `${baseUrl}/settings?connected=google`;
    },
  },
  pages: {
    signIn: "/settings",
    error: "/settings",
  },
};
