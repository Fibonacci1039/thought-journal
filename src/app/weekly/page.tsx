import { WeeklyAnalysisSection } from "@/components/WeeklyAnalysisSection";
import Link from "next/link";
import { getEntries } from "@/lib/storage";

export const dynamic = "force-dynamic";

export default async function WeeklyPage() {
  const entries = await getEntries();
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const weeklyCount = entries.filter(
    (e) => new Date(e.created_at) >= oneWeekAgo
  ).length;

  return (
    <main>
      <div style={{ marginBottom: "2rem" }}>
        <Link
          href="/"
          style={{
            fontSize: "0.9rem",
            color: "var(--color-subtle)",
            textDecoration: "none",
          }}
        >
          ← ホームに戻る
        </Link>
      </div>

      <h1 style={{ marginBottom: "1rem" }}>Weekly Review</h1>
      <p style={{ color: "var(--color-subtle)", marginBottom: "2rem" }}>
        直近1週間 ({oneWeekAgo.toLocaleDateString()} ~{" "}
        {now.toLocaleDateString()}) のログ数: {weeklyCount}件
      </p>

      {weeklyCount > 0 ? (
        <WeeklyAnalysisSection />
      ) : (
        <div
          style={{
            padding: "2rem",
            textAlign: "center",
            backgroundColor: "#f5f5f5",
            borderRadius: "12px",
            color: "var(--color-subtle)",
          }}
        >
          直近1週間の記録がありません。
          <br />
          まずは日々のジャーナリングを楽しみましょう。
          <div style={{ marginTop: "1.5rem" }}>
            <Link
              href="/new"
              style={{
                padding: "0.8rem 1.5rem",
                backgroundColor: "var(--color-text)",
                color: "#fff",
                borderRadius: "30px",
                textDecoration: "none",
                fontWeight: 600,
              }}
            >
              今の思考を書き留める
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}
