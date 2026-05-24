import Link from "next/link";

export default function ContactNotFound() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold text-zinc-900">Contact not found</h1>
      <p className="mt-2 text-sm text-zinc-600">
        This contact does not exist or was removed.
      </p>
      <Link
        href="/contacts"
        className="mt-6 inline-block text-sm font-medium text-zinc-900 underline"
      >
        Back to contacts
      </Link>
    </main>
  );
}
