import { WeeklyAnalysisSection } from "@/components/WeeklyAnalysisSection";
import Link from "next/link";
import { getEntries } from "@/lib/storage";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function WeeklyPage() {
  const entries = await getEntries();
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const weeklyCount = entries.filter(
    (e) => new Date(e.created_at) >= oneWeekAgo
  ).length;

  // Fetch existing weekly summary if any
  const { data: latestSummary } = await supabase
    .from("periodic_summaries")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  let initialData = null;
  if (latestSummary) {
    const created = new Date(latestSummary.created_at);
    // Check if within last 7 days? Or just show the latest one regardless?
    // User requested "show if done". Let's show if it's recent (within 7 days).
    if (created >= oneWeekAgo) {
      initialData = latestSummary;
    }
  }

  return (
    <main className="container animate-enter">
      <h1 style={{ marginBottom: "1rem" }}>週次レビュー</h1>
      <p style={{ color: "var(--color-subtle)", marginBottom: "2rem" }}>
        直近1週間 ({oneWeekAgo.toLocaleDateString()} ~{" "}
        {now.toLocaleDateString()}) のログ数: {weeklyCount}件
      </p>

      {weeklyCount > 0 || initialData ? (
        <WeeklyAnalysisSection initialData={initialData} />
      ) : (
        <div
          style={{
            padding: "2rem",
            textAlign: "center",
            backgroundColor: "var(--color-bg-tertiary)",
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
                color: "var(--color-bg-tertiary)",
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
