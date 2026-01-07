import { EntryList } from "@/components/EntryList";
import { getEntries, getTopics } from "@/lib/storage";
import { Entry, Topic } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function Home() {
  let entries: Entry[] = [];
  let topics: Topic[] = [];
  let error = null;

  try {
    const [e, t] = await Promise.all([getEntries(), getTopics()]);
    entries = e;
    topics = t;
  } catch (err) {
    console.error("Database Error FULL:", JSON.stringify(err, null, 2));
    if (err instanceof Error) console.error("Error Message:", err.message);
    error = err;
  }

  if (error) {
    return (
      <main>
        <h1>エラー</h1>
        <p style={{ marginTop: "1rem", color: "var(--color-subtle)" }}>
          データベースに接続できませんでした。環境変数
          (SUPABASE_SERVICE_ROLE_KEY) を確認してください。
        </p>
      </main>
    );
  }

  return (
    <main>
      <h1>記録一覧</h1>
      <div style={{ marginTop: "2rem" }}>
        <EntryList entries={entries} topics={topics} />
      </div>
    </main>
  );
}
