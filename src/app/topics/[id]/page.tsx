import Link from "next/link";
import { EntryList } from "@/components/EntryList";
import { getEntries, getTopics } from "@/lib/storage";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function TopicDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [entries, topics] = await Promise.all([getEntries(), getTopics()]);

  const topic = topics.find((t) => t.id === id);
  if (!topic) {
    notFound();
  }

  const topicEntries = entries.filter((e) => e.topic_ids.includes(id));

  return (
    <main>
      <div style={{ marginBottom: "2rem" }}>
        <Link
          href="/topics"
          style={{
            color: "var(--color-subtle)",
            fontSize: "0.9rem",
            textDecoration: "none",
          }}
        >
          ← トピック一覧に戻る
        </Link>
      </div>

      <h1 style={{ marginBottom: "0.5rem" }}>{topic.name}</h1>

      <div style={{ marginTop: "2rem" }}>
        <div
          style={{
            marginBottom: "1rem",
            fontSize: "0.9rem",
            color: "var(--color-subtle)",
          }}
        >
          {topicEntries.length} 件の記録
        </div>
        <EntryList entries={topicEntries} />
      </div>
    </main>
  );
}
