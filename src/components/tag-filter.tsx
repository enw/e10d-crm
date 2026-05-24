import Link from "next/link";

type TagOption = {
  id: string;
  name: string;
};

export function TagFilter({
  tags,
  activeTagId,
  query,
}: {
  tags: TagOption[];
  activeTagId?: string;
  query?: string;
}) {
  function hrefFor(tagId?: string) {
    const params = new URLSearchParams();
    if (query?.trim()) {
      params.set("q", query.trim());
    }
    if (tagId) {
      params.set("tag", tagId);
    }
    const next = params.toString();
    return next ? `/contacts?${next}` : "/contacts";
  }

  if (tags.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="text-zinc-500">Filter:</span>
      <Link
        href={hrefFor()}
        className={`rounded-full px-3 py-1 ${
          !activeTagId
            ? "bg-zinc-900 text-white"
            : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
        }`}
      >
        All
      </Link>
      {tags.map((tag) => (
        <Link
          key={tag.id}
          href={hrefFor(tag.id)}
          className={`rounded-full px-3 py-1 ${
            activeTagId === tag.id
              ? "bg-zinc-900 text-white"
              : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
          }`}
        >
          {tag.name}
        </Link>
      ))}
    </div>
  );
}
