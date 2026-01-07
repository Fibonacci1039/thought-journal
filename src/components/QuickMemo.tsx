"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createEntryAction } from "@/app/actions";
import { Send } from "lucide-react";

export function QuickMemo() {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();

  const handleSubmit = async () => {
    if (!content.trim() || loading) return;

    setLoading(true);
    try {
      const result = await createEntryAction({
        title: "",
        human_view: content.trim(),
        ai_view: { schema_version: "2.0", type: "quick_memo" },
        topic_ids: [],
        source_url: "",
        cite_text: "",
      });

      if (result.success) {
        setContent("");
        router.refresh();
      } else {
        alert("error" in result ? result.error : "保存に失敗しました");
      }
    } catch {
      alert("エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Cmd/Ctrl + Enter で送信
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div
      style={{
        marginBottom: "2rem",
        padding: "1rem",
        background: "var(--color-bg-tertiary)",
        borderRadius: "12px",
        border: "1px solid var(--color-border)",
      }}
    >
      <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-end" }}>
        <textarea
          ref={inputRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="何か記録する... (⌘+Enter で保存)"
          rows={1}
          style={{
            flex: 1,
            padding: "0.75rem 1rem",
            fontSize: "1rem",
            background: "var(--color-bg-primary)",
            color: "var(--color-text-primary)",
            border: "1px solid var(--color-border)",
            borderRadius: "8px",
            resize: "none",
            outline: "none",
            minHeight: "44px",
            maxHeight: "120px",
            overflow: "auto",
          }}
          onInput={(e) => {
            // Auto-resize textarea
            const target = e.target as HTMLTextAreaElement;
            target.style.height = "auto";
            target.style.height = Math.min(target.scrollHeight, 120) + "px";
          }}
        />
        <button
          onClick={handleSubmit}
          disabled={!content.trim() || loading}
          style={{
            padding: "0.75rem",
            background:
              content.trim() && !loading
                ? "var(--color-accent)"
                : "var(--color-bg-primary)",
            color:
              content.trim() && !loading
                ? "#fff"
                : "var(--color-text-tertiary)",
            border: "1px solid var(--color-border)",
            borderRadius: "8px",
            cursor: content.trim() && !loading ? "pointer" : "default",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.2s ease",
          }}
        >
          <Send size={18} />
        </button>
      </div>
      <p
        style={{
          margin: "0.5rem 0 0 0",
          fontSize: "0.75rem",
          color: "var(--color-text-tertiary)",
        }}
      >
        後からトピックやタグを追加できます
      </p>
    </div>
  );
}
