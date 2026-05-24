import NextAuth from "next-auth";

import { googleAuthOptions } from "@/lib/auth/google-auth-options";

const handler = NextAuth(googleAuthOptions);

export { handler as GET, handler as POST };
