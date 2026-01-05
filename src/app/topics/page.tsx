import { TopicManager } from "@/components/TopicManager";
import { getTopics } from "@/lib/storage";

export const dynamic = "force-dynamic";

export default async function TopicsPage() {
  let topics;
  try {
    topics = await getTopics();
  } catch (err) {
    console.error("Database Error:", err);
    return (
      <main>
        <h1>エラー</h1>
        <p style={{ marginTop: "1rem", color: "var(--color-subtle)" }}>
          データベースに接続できませんでした。トピックを読み込めません。
        </p>
      </main>
    );
  }

  return (
    <main>
      <h1>トピック管理</h1>
      <div style={{ marginTop: "2rem" }}>
        <TopicManager
          initialTopics={topics}
          apiToken={process.env.APP_SECRET_TOKEN || ""}
        />
      </div>
    </main>
  );
}
