import bcrypt from "bcryptjs";

export async function verifyPassword(input: string): Promise<boolean> {
  const stored = process.env.AUTH_PASSWORD;
  if (!stored) {
    throw new Error("AUTH_PASSWORD is not set");
  }

  if (stored.startsWith("$2")) {
    return bcrypt.compare(input, stored);
  }

  return timingSafeEqualString(input, stored);
}

function timingSafeEqualString(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}
