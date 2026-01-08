import Link from "next/link";
import { EntryList } from "@/components/EntryList";
import { TopicAnalysisSection } from "@/components/TopicAnalysisSection";
import { getEntries, getTopics, getLatestTopicSummary } from "@/lib/storage";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function TopicDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [entries, topics, latestSummary] = await Promise.all([
    getEntries(),
    getTopics(),
    getLatestTopicSummary(id),
  ]);

  const topic = topics.find((t) => t.id === id);
  if (!topic) {
    notFound();
  }

  const topicEntries = entries.filter((e) => e.topic_ids?.includes(id));

  return (
    <main className="container animate-enter">
      {/* Navigation */}
      <div style={{ marginBottom: "1.5rem" }}>
        <Link
          href="/topics"
          style={{
            color: "var(--color-subtle)",
            fontSize: "0.9rem",
            textDecoration: "none",
          }}
        >
          ← トピック一覧
        </Link>
      </div>

      {/* Header */}
      <div
        style={{
          marginBottom: "2rem",
          borderBottom: "1px solid var(--color-border)",
          paddingBottom: "1rem",
        }}
      >
        <h1 style={{ marginBottom: "0.5rem", fontSize: "1.8rem" }}>
          {topic.name}
        </h1>
        <p style={{ color: "var(--color-subtle)", fontSize: "0.95rem" }}>
          最終更新:{" "}
          {topicEntries.length > 0
            ? new Date(topicEntries[0].created_at).toLocaleDateString()
            : "-"}
        </p>
      </div>

      {/* 1. HERO: Change Analysis (The "Protagonist") */}
      <TopicAnalysisSection
        topicId={id}
        topicName={topic.name}
        latestSummary={latestSummary}
      />

      {/* 2. EVIDENCE: Raw Logs */}
      <section>
        <h2
          style={{
            fontSize: "1.1rem",
            fontWeight: 600,
            color: "var(--color-text-secondary)",
            paddingBottom: "0.75rem",
            borderBottom: "1px solid var(--color-border)",
            marginBottom: "1.5rem",
          }}
        >
          根幹データ / ログ履歴 ({topicEntries.length}件)
        </h2>
        <EntryList entries={topicEntries} topics={topics} />
      </section>
    </main>
  );
}
