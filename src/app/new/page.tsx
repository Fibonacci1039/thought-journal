import { EntryForm } from "@/components/EntryForm";
import { getTopics } from "@/lib/storage";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function NewEntryPage() {
  const topics = await getTopics();
  return (
    <main className="container animate-enter">
      {/* Simple Header for navigation back */}
      <div style={{ marginBottom: "2rem" }}>
        <Link
          href="/"
          className="text-label"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            cursor: "pointer",
          }}
        >
          ← Back to Timeline
        </Link>
      </div>
      <EntryForm topics={topics} />
    </main>
  );
}
