import Link from "next/link";
import { getEntry, getTopics } from "@/lib/storage";
import { notFound } from "next/navigation";
import { EntryDetailView } from "@/components/EntryDetailView";

export const dynamic = "force-dynamic";

export default async function EntryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const entry = await getEntry(id);

  if (!entry) {
    notFound();
  }

  // Fetch topics to resolve names if needed, or just IDs?
  // Spec says "assigned topics (if any)" in list. In detail? "Entry Detail View... Human View".
  // Let's resolve topic names for better UX in detail view.
  const topics = await getTopics();
  const entryTopics = topics.filter((t) => entry.topic_ids.includes(t.id));

  return (
    <main>
      <div
        style={{
          marginBottom: "2rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
        }}
      >
        <Link
          href="/"
          style={{
            color: "var(--color-subtle)",
            fontSize: "0.9rem",
            textDecoration: "none",
          }}
        >
          ← 一覧に戻る
        </Link>
        <Link
          href={`/entry/${id}/edit`}
          style={{
            fontSize: "0.9rem",
            color: "var(--color-accent-primary)",
            textDecoration: "none",
          }}
        >
          編集
        </Link>
      </div>

      <EntryDetailView entry={entry} topics={entryTopics} />
    </main>
  );
}
