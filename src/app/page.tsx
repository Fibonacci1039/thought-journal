import { EntryList } from "@/components/EntryList";
import { getEntries } from "@/lib/storage";

export const dynamic = "force-dynamic";

export default async function Home() {
  try {
    const entries = await getEntries();
    return (
      <main>
        <h1>記録一覧</h1>
        <div style={{ marginTop: "2rem" }}>
          <EntryList entries={entries} />
        </div>
      </main>
    );
  } catch (err) {
    console.error("Database Error FULL:", JSON.stringify(err, null, 2));
    if (err instanceof Error) console.error("Error Message:", err.message);
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
}
