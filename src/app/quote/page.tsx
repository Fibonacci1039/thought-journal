import { QuoteForm } from "@/components/QuoteForm";
import { getTopics } from "@/lib/storage";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function QuotePage() {
  const topics = await getTopics();

  return (
    <main className="container animate-enter">
      <div style={{ marginBottom: "2rem" }}>
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

      <h1 style={{ marginBottom: "0.5rem" }}>引用をキャプチャ</h1>
      <p
        style={{
          color: "var(--color-text-tertiary)",
          marginBottom: "2rem",
          fontSize: "0.95rem",
        }}
      >
        本、映画、美術館などからの気づきを保存
      </p>

      <div style={{ maxWidth: "600px" }}>
        <QuoteForm topics={topics} />
      </div>
    </main>
  );
}
