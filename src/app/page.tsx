import { EntryList } from "@/components/EntryList";
import { QuickInput } from "@/components/QuickInput";
import { MemoryLane } from "@/components/MemoryLane";
import { getEntries, getTopics } from "@/lib/storage";
import { getSubscriptionStatus } from "@/lib/subscription";
import { Entry, Topic } from "@/lib/types";

export const dynamic = "force-dynamic";

// Calculate streak (consecutive days with entries)
function calculateStreak(entries: Entry[]): number {
  if (entries.length === 0) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const entryDates = entries.map((e) => {
    const d = new Date(e.created_at);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  });

  const uniqueDates = [...new Set(entryDates)].sort((a, b) => b - a);

  let streak = 0;
  let currentDate = today.getTime();

  for (const date of uniqueDates) {
    if (date === currentDate || date === currentDate - 86400000) {
      streak++;
      currentDate = date;
    } else if (date < currentDate - 86400000) {
      break;
    }
  }

  return streak;
}

export default async function Home() {
  let entries: Entry[] = [];
  let topics: Topic[] = [];
  let isPro = false;
  let error = null;

  try {
    const [e, t, sub] = await Promise.all([
      getEntries(),
      getTopics(),
      getSubscriptionStatus(),
    ]);
    entries = e;
    topics = t;
    isPro = sub.isPro;
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

  const streak = calculateStreak(entries);

  return (
    <main className="animate-enter">
      {/* Header */}
      <h1
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "2rem",
          fontWeight: 700,
          letterSpacing: "-0.02em",
          marginBottom: "0.5rem",
        }}
      >
        タイムライン
      </h1>
      <p
        style={{
          color: "var(--color-text-tertiary)",
          fontSize: "0.9rem",
          marginBottom: "1.5rem",
        }}
      >
        あなたの思考を振り返る
      </p>

      {/* Quick Input */}
      <QuickInput />

      {/* Stats */}
      <div
        style={{
          display: "flex",
          gap: "2rem",
          marginBottom: "2rem",
          paddingBottom: "1.5rem",
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        <div>
          <div
            style={{
              fontSize: "1.5rem",
              fontWeight: 700,
              color: "var(--color-text-primary)",
            }}
          >
            {entries.length}
          </div>
          <div
            style={{
              fontSize: "0.75rem",
              color: "var(--color-text-tertiary)",
              fontWeight: 500,
            }}
          >
            記録数
          </div>
        </div>
        <div>
          <div
            style={{
              fontSize: "1.5rem",
              fontWeight: 700,
              color: "var(--color-text-primary)",
            }}
          >
            {topics.length}
          </div>
          <div
            style={{
              fontSize: "0.75rem",
              color: "var(--color-text-tertiary)",
              fontWeight: 500,
            }}
          >
            トピック
          </div>
        </div>
        <div>
          <div
            style={{
              fontSize: "1.5rem",
              fontWeight: 700,
              color: "var(--color-accent)",
            }}
          >
            {streak}
          </div>
          <div
            style={{
              fontSize: "0.75rem",
              color: "var(--color-text-tertiary)",
              fontWeight: 500,
            }}
          >
            日連続
          </div>
        </div>
      </div>

      {/* Memory Lane - Past Entries */}
      {entries.length > 7 && <MemoryLane entries={entries} isPro={isPro} />}

      {/* Entry List */}
      <EntryList entries={entries} topics={topics} />
    </main>
  );
}
