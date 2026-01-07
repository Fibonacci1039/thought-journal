import { getTopics, getEntries } from "@/lib/storage";
import { TopicGraph } from "@/components/TopicGraph";

export default async function GraphPage() {
  const topics = await getTopics();
  const entries = await getEntries();

  return (
    <main className="container animate-enter" style={{ maxWidth: "100%" }}>
      <header
        style={{
          marginBottom: "1rem",
        }}
      >
        <h1 style={{ fontSize: "1.2rem", margin: 0 }}>
          マインドマップ (Experimental Tree View)
        </h1>
      </header>

      <div style={{ marginBottom: "2rem", height: "calc(100vh - 150px)" }}>
        <TopicGraph topics={topics} entries={entries} />
      </div>
    </main>
  );
}
