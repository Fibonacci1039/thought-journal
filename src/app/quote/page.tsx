import { QuoteForm } from "@/components/QuoteForm";
import { getTopics } from "@/lib/storage";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function QuotePage() {
  const topics = await getTopics();

  return (
    <main className="quote-page animate-enter">
      <div style={{ marginBottom: "1.25rem" }}>
        <Link
          href="/"
          className="text-label"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          ← タイムラインに戻る
        </Link>
      </div>

      <div className="quote-page-header">
        <div>
          <h1>引用を残す</h1>
          <p>心に引っかかった言葉と、自分の反応を分けて保存する。</p>
        </div>
      </div>

      <QuoteForm topics={topics} />
    </main>
  );
}
