"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { batchEnrichAction } from "@/app/(app)/settings/actions";

export function BatchEnrichButton({ pendingCount }: { pendingCount: number }) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  async function onClick() {
    setRunning(true);
    setMessage(null);
    setIsError(false);

    try {
      const result = await batchEnrichAction();
      if (result.failed > 0) {
        setIsError(true);
        setMessage(
          `Enriched ${result.succeeded} of ${result.total} contacts (${result.failed} failed, ${result.skipped} skipped).`,
        );
      } else {
        setMessage(
          `Enriched ${result.succeeded} contact${result.succeeded === 1 ? "" : "s"}.`,
        );
      }
      router.refresh();
    } catch (error) {
      setIsError(true);
      setMessage(
        error instanceof Error ? error.message : "Batch enrichment failed",
      );
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={onClick}
        disabled={running || pendingCount === 0}
        className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50 disabled:opacity-50"
      >
        {running
          ? "Enriching…"
          : `Enrich ${pendingCount} contact${pendingCount === 1 ? "" : "s"}`}
      </button>
      {message ? (
        <p className={`text-sm ${isError ? "text-red-600" : "text-zinc-600"}`}>
          {message}
        </p>
      ) : null}
    </div>
  );
}
