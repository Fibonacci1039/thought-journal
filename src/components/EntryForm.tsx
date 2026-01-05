"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Entry, Topic } from "@/lib/types";

type Props = {
  topics: Topic[];
  initialData?: Entry;
  apiToken: string;
};

export function EntryForm({ topics, initialData, apiToken }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    narrative: initialData?.human_view || "", // human_view is now a string
    ai_view_str: initialData?.ai_view
      ? JSON.stringify(initialData.ai_view, null, 2)
      : '{\n  "summary": ""\n}',
    topic_ids: initialData?.topic_ids || ([] as string[]),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let aiViewJson;
      try {
        aiViewJson = JSON.parse(formData.ai_view_str);
      } catch {
        alert("AI用のJSONデータが無効です");
        setLoading(false);
        return;
      }

      const payload = {
        human_view: formData.narrative, // Send string directly
        ai_view: aiViewJson,
        topic_ids: formData.topic_ids,
      };

      const url = initialData
        ? `/api/entries/${initialData.id}` // Use id instead of entry_id
        : "/api/entries";

      const method = initialData ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "x-app-token": apiToken,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to save");

      router.push("/");
      router.refresh();
    } catch {
      alert("記録の保存中にエラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const toggleTopic = (tid: string) => {
    setFormData((prev) => {
      const newIds = prev.topic_ids.includes(tid)
        ? prev.topic_ids.filter((id) => id !== tid)
        : [...prev.topic_ids, tid];
      return { ...prev, topic_ids: newIds };
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{ display: "flex", flexDirection: "column", gap: "2rem" }}
    >
      {/* Human View Input */}
      <div>
        <label
          style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}
        >
          ナラティブ (人間用)
        </label>
        <textarea
          required
          value={formData.narrative}
          onChange={(e) =>
            setFormData({ ...formData, narrative: e.target.value })
          }
          style={{
            width: "100%",
            minHeight: "200px",
            padding: "1rem",
            lineHeight: 1.6,
            fontFamily: "var(--font-sans)",
            border: "1px solid var(--color-border)",
            resize: "vertical",
          }}
          placeholder="ここに思考を記録してください..."
        />
      </div>

      {/* AI View Input */}
      <div>
        <label
          style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}
        >
          構造化データ (AI用 JSON)
        </label>
        <textarea
          required
          value={formData.ai_view_str}
          onChange={(e) =>
            setFormData({ ...formData, ai_view_str: e.target.value })
          }
          style={{
            width: "100%",
            minHeight: "200px",
            padding: "1rem",
            fontFamily: "var(--font-mono)",
            fontSize: "0.9rem",
            border: "1px solid var(--color-border)",
            backgroundColor: "#fafafa",
          }}
        />
      </div>

      {/* Meta */}
      <div
        style={{
          display: "grid",
          gap: "1.5rem",
          gridTemplateColumns: "1fr", // Single column since source_note removed? Or just topics full width.
        }}
      >
        {/* Source Note Removed */}

        <div>
          <label
            style={{
              display: "block",
              marginBottom: "0.5rem",
              fontWeight: 500,
            }}
          >
            トピック
          </label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            {topics.map((t) => (
              <button
                type="button"
                key={t.id} // Use id
                onClick={() => toggleTopic(t.id)}
                style={{
                  padding: "0.25rem 0.6rem",
                  fontSize: "0.85rem",
                  border: "1px solid",
                  borderColor: formData.topic_ids.includes(t.id)
                    ? "var(--color-accent-primary)"
                    : "var(--color-border)",
                  color: formData.topic_ids.includes(t.id)
                    ? "var(--color-accent-primary)"
                    : "inherit",
                  borderRadius: "4px",
                }}
              >
                {t.name} {/* Use name */}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem" }}>
        <button
          type="button"
          onClick={() => router.back()}
          style={{ padding: "0.5rem 1rem", color: "var(--color-subtle)" }}
        >
          キャンセル
        </button>
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "0.6rem 1.2rem",
            backgroundColor: "var(--color-text)",
            color: "var(--color-base)",
            borderRadius: "4px",
            opacity: loading ? 0.7 : 1,
            cursor: loading ? "wait" : "pointer",
          }}
        >
          {loading ? "保存中..." : "保存"}
        </button>
      </div>
    </form>
  );
}
