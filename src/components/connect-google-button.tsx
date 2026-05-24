import Link from "next/link";

export function ConnectGoogleButton() {
  return (
    <Link
      href="/api/auth/signin/google"
      className="inline-flex items-center rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
    >
      Connect Google Account
    </Link>
  );
}
