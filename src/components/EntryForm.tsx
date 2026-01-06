"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Entry, Topic } from "@/lib/types";
import { createEntryAction, updateEntryAction } from "@/app/actions";

type Props = {
  topics: Topic[];
  initialData?: Entry;
};

// Default AI View structure
const DEFAULT_AI_VIEW = {
  schema_version: "1.0",
};

export function EntryForm({ topics, initialData }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Minimalist Form State
  const [narrative, setNarrative] = useState(initialData?.human_view || "");
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>(
    initialData?.topic_ids || []
  );

  // AI View Input State
  const [aiJsonInput, setAiJsonInput] = useState(
    initialData?.ai_view && Object.keys(initialData.ai_view).length > 1
      ? JSON.stringify(initialData.ai_view, null, 2)
      : ""
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!narrative.trim()) {
      alert("思考ログを入力してください");
      return;
    }

    // Parse AI JSON Key
    let parsedAiView = initialData?.ai_view || DEFAULT_AI_VIEW;
    if (aiJsonInput.trim()) {
      try {
        // Remove markdown code blocks if present
        const cleaned = aiJsonInput
          .replace(/```json/g, "")
          .replace(/```/g, "")
          .trim();
        parsedAiView = JSON.parse(cleaned);
      } catch (err) {
        alert(
          "AIデータのJSON形式が正しくありません。\n確認して修正するか、空欄にしてください。"
        );
        return;
      }
    }

    setLoading(true);

    try {
      const payload = {
        human_view: narrative,
        ai_view: parsedAiView,
        topic_ids: selectedTopicIds,
        // Mood is removed from input
      };

      const res = initialData
        ? await updateEntryAction(initialData.id, payload)
        : await createEntryAction(payload);

      if (!res.success) {
        const errorMsg = (res as { success: false; error: string }).error;
        throw new Error(errorMsg);
      }

      alert("記録しました");
      router.push("/");
      router.refresh();
    } catch (e: any) {
      const msg =
        e instanceof Error ? e.message : "保存中にエラーが発生しました";
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  const toggleTopic = (tid: string) => {
    setSelectedTopicIds((prev) =>
      prev.includes(tid) ? prev.filter((id) => id !== tid) : [...prev, tid]
    );
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}
    >
      {/* 1. Main Input (Focus) */}
      <div style={{ position: "relative" }}>
        <label
          style={{
            display: "block",
            marginBottom: "0.5rem",
            fontWeight: 600,
            fontSize: "0.9rem",
            color: "var(--color-text)",
          }}
        >
          Human View (人間向けの文章)
        </label>
        <textarea
          required
          autoFocus={!initialData}
          value={narrative}
          onChange={(e) => setNarrative(e.target.value)}
          placeholder="今、頭の中にあることをそのまま書いてください..."
          style={{
            width: "100%",
            minHeight: "200px",
            padding: "1.5rem",
            lineHeight: 1.8,
            fontSize: "1.1rem",
            fontFamily: "var(--font-sans)",
            border: "none",
            borderRadius: "12px",
            backgroundColor: "#fff",
            boxShadow:
              "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)",
            resize: "vertical",
            outline: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "1rem",
            right: "1rem",
            fontSize: "0.8rem",
            color: "var(--color-subtle)",
          }}
        >
          {narrative.length}文字
        </div>
      </div>

      {/* 2. AI Data Input (Optional) */}
      <div>
        <label
          style={{
            display: "block",
            marginBottom: "0.5rem",
            fontWeight: 600,
            fontSize: "0.9rem",
            color: "var(--color-text)",
          }}
        >
          AI Knowledge (JSONデータ){" "}
          <span style={{ fontWeight: 400, color: "var(--color-subtle)" }}>
            ※任意
          </span>
        </label>
        <textarea
          value={aiJsonInput}
          onChange={(e) => setAiJsonInput(e.target.value)}
          placeholder={
            '{\n  "ai_view": { ... }\n}\nまたは外部AIの出力JSONをそのまま貼り付け'
          }
          style={{
            width: "100%",
            minHeight: "120px",
            padding: "1rem",
            fontSize: "0.85rem",
            fontFamily: "monospace",
            border: "1px solid var(--color-border)",
            borderRadius: "8px",
            backgroundColor: "#fafafa",
            resize: "vertical",
          }}
        />
        <p
          style={{
            fontSize: "0.8rem",
            color: "var(--color-subtle)",
            marginTop: "0.3rem",
          }}
        >
          「AI向けプロンプト」を使って生成されたJSONをここに貼り付けると、分析精度が向上します。
        </p>
      </div>

      {/* 3. Meta & Actions */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        {/* Topics */}
        <div style={{ maxWidth: "70%" }}>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "0.5rem",
              alignItems: "center",
            }}
          >
            <span
              style={{
                fontSize: "0.9rem",
                color: "var(--color-subtle)",
                marginRight: "0.5rem",
              }}
            >
              トピック:
            </span>
            {topics.map((t) => (
              <button
                type="button"
                key={t.id}
                onClick={() => toggleTopic(t.id)}
                style={{
                  padding: "0.3rem 0.8rem",
                  fontSize: "0.85rem",
                  border: "1px solid",
                  borderColor: selectedTopicIds.includes(t.id)
                    ? "var(--color-accent-primary)"
                    : "transparent",
                  backgroundColor: selectedTopicIds.includes(t.id)
                    ? "var(--color-accent-primary)"
                    : "#f0f0f0",
                  color: selectedTopicIds.includes(t.id)
                    ? "#fff"
                    : "var(--color-text)",
                  borderRadius: "20px",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
              >
                {t.name}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: "1rem" }}>
          <button
            type="button"
            onClick={() => router.back()}
            style={{
              padding: "0.8rem 1.5rem",
              color: "var(--color-subtle)",
              background: "transparent",
              border: "none",
              cursor: "pointer",
            }}
          >
            キャンセル
          </button>
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: "0.8rem 2rem",
              backgroundColor: "var(--color-text)",
              color: "var(--color-base)",
              borderRadius: "30px",
              fontWeight: 600,
              border: "none",
              opacity: loading ? 0.7 : 1,
              cursor: loading ? "wait" : "pointer",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            }}
          >
            {loading ? "保存中..." : "保存する"}
          </button>
        </div>
      </div>
    </form>
  );
}
