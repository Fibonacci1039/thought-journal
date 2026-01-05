import { EntryForm } from "@/components/EntryForm";
import { getTopics } from "@/lib/storage";

export const dynamic = "force-dynamic";

export default async function NewEntryPage() {
  const topics = await getTopics();
  return (
    <main>
      <h1 style={{ marginBottom: "2rem" }}>新規作成</h1>
      <EntryForm
        topics={topics}
        apiToken={process.env.APP_SECRET_TOKEN || ""}
      />
    </main>
  );
}
