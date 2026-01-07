import { EntryForm } from "@/components/EntryForm";
import { getTopics, getEntry } from "@/lib/storage";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function EditEntryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [entry, topics] = await Promise.all([getEntry(id), getTopics()]);

  if (!entry) {
    notFound();
  }

  return (
    <main className="container animate-enter">
      <h1 style={{ marginBottom: "2rem" }}>記録の編集</h1>
      <EntryForm topics={topics} initialData={entry} />
    </main>
  );
}
