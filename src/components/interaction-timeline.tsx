import type { Interaction } from "@/db/schema";

function formatInteractionLabel(interaction: Interaction): string {
  switch (interaction.type) {
    case "note":
      return interaction.content ?? "";
    case "tag_added":
      return `Added tag: ${interaction.content ?? "unknown"}`;
    case "tag_removed":
      return `Removed tag: ${interaction.content ?? "unknown"}`;
    case "enrichment":
      return `Enriched via ${interaction.content ?? "provider"}`;
    default:
      return interaction.content ?? interaction.type;
  }
}

export function InteractionTimeline({
  interactions,
}: {
  interactions: Interaction[];
}) {
  if (interactions.length === 0) {
    return (
      <p className="text-sm text-zinc-500">No activity yet.</p>
    );
  }

  return (
    <ul className="space-y-4">
      {interactions.map((interaction) => (
        <li key={interaction.id} className="border-l-2 border-zinc-200 pl-4">
          <p className="text-xs uppercase tracking-wide text-zinc-500">
            {interaction.type.replace("_", " ")} ·{" "}
            {interaction.occurredAt.toLocaleString()}
          </p>
          <p className="mt-1 text-sm text-zinc-900">
            {formatInteractionLabel(interaction)}
          </p>
        </li>
      ))}
    </ul>
  );
}
