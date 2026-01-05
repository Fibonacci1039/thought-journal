"use client";

import { useState } from "react";
import { Entry, Topic } from "@/lib/types";

type Props = {
  entry: Entry;
  topics: Topic[];
};

export function EntryDetailView({ entry, topics }: Props) {
  const [mode, setMode] = useState<"human" | "ai">("human");

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("クリップボードにコピーしました");
  };

  return (
    <div>
      {/* Mode Toggle */}
      <div
        style={{
          marginBottom: "2rem",
          borderBottom: "1px solid var(--color-border)",
          display: "flex",
          gap: "2rem",
        }}
      >
        <button
          onClick={() => setMode("human")}
          style={{
            paddingBottom: "0.5rem",
            borderBottom: "2px solid",
            borderColor: mode === "human" ? "var(--color-text)" : "transparent",
            color:
              mode === "human" ? "var(--color-text)" : "var(--color-subtle)",
            fontWeight: 500,
          }}
        >
          閲覧ビュー
        </button>
        <button
          onClick={() => setMode("ai")}
          style={{
            paddingBottom: "0.5rem",
            borderBottom: "2px solid",
            borderColor: mode === "ai" ? "var(--color-text)" : "transparent",
            color: mode === "ai" ? "var(--color-text)" : "var(--color-subtle)",
            fontWeight: 500,
          }}
        >
          AIデータ
        </button>
      </div>

      {mode === "human" ? (
        // Human View
        <div style={{ maxWidth: "65ch", margin: "0 auto", lineHeight: 1.8 }}>
          <div
            style={{
              color: "var(--color-subtle)",
              fontSize: "0.9rem",
              marginBottom: "1rem",
            }}
          >
            {new Date(entry.created_at).toLocaleString("ja-JP")}
          </div>

          {/* Source Note Removed */}

          <div style={{ whiteSpace: "pre-wrap" }}>
            {entry.human_view} {/* string now */}
          </div>

          {topics.length > 0 && (
            <div
              style={{
                marginTop: "3rem",
                paddingTop: "1rem",
                borderTop: "1px solid var(--color-border)",
              }}
            >
              <span
                style={{
                  color: "var(--color-subtle)",
                  fontSize: "0.9rem",
                  marginRight: "0.5rem",
                }}
              >
                トピック:
              </span>
              {topics.map((t) => (
                <span
                  key={t.id}
                  style={{
                    marginRight: "0.5rem",
                    fontSize: "0.9rem",
                    padding: "0.2rem 0.5rem",
                    background: "var(--color-border)",
                    borderRadius: "4px",
                  }}
                >
                  {t.name} {/* Use name */}
                </span>
              ))}
            </div>
          )}

          <div style={{ marginTop: "3rem" }}>
            <button
              onClick={() => copyToClipboard(entry.human_view)}
              style={{
                fontSize: "0.9rem",
                textDecoration: "underline",
                color: "var(--color-subtle)",
              }}
            >
              テキストをコピー
            </button>
          </div>
        </div>
      ) : (
        // AI View
        <div>
          <pre
            style={{
              background: "#fafafa",
              padding: "1.5rem",
              borderRadius: "44px",
              overflowX: "auto",
              fontFamily: "var(--font-mono)",
              fontSize: "0.85rem",
              border: "1px solid var(--color-border)",
            }}
          >
            {JSON.stringify(entry.ai_view, null, 2)}
          </pre>
          <div style={{ marginTop: "1rem" }}>
            <button
              onClick={() =>
                copyToClipboard(JSON.stringify(entry.ai_view, null, 2))
              }
              style={{
                padding: "0.5rem 1rem",
                border: "1px solid var(--color-border)",
                borderRadius: "4px",
                fontSize: "0.9rem",
              }}
            >
              JSONをコピー
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
