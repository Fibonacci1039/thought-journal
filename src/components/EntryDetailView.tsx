"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Entry, Topic } from "@/lib/types";
import { deleteEntryAction } from "@/app/actions";
import { Trash2, Copy, Check, Edit, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { RelatedEntries } from "./RelatedEntries";

type Props = {
  entry: Entry;
  topics: Topic[];
};

export function EntryDetailView({ entry, topics }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<"human" | "ai">("human");
  const [copied, setCopied] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = async () => {
    if (!confirm("この記録を削除しますか？この操作は取り消せません。")) return;

    setDeleting(true);
    try {
      const result = await deleteEntryAction(entry.id);
      if (result?.success) {
        router.push("/");
        router.refresh();
      } else {
        alert("削除に失敗しました");
      }
    } catch {
      alert("エラーが発生しました");
    } finally {
      setDeleting(false);
    }
  };

  const formattedDate = new Date(entry.created_at).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });
  const formattedTime = new Date(entry.created_at).toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div style={{ maxWidth: "700px", margin: "0 auto" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "2rem",
        }}
      >
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            color: "var(--color-text-tertiary)",
            fontSize: "0.9rem",
            textDecoration: "none",
          }}
        >
          <ArrowLeft size={16} /> 戻る
        </Link>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <Link
            href={`/entry/${entry.id}/edit`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.3rem",
              padding: "0.5rem 0.75rem",
              fontSize: "0.85rem",
              color: "var(--color-text-secondary)",
              background: "var(--color-bg-tertiary)",
              border: "1px solid var(--color-border)",
              borderRadius: "6px",
              textDecoration: "none",
            }}
          >
            <Edit size={14} /> 編集
          </Link>
          <button
            onClick={handleDelete}
            disabled={deleting}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.3rem",
              padding: "0.5rem 0.75rem",
              fontSize: "0.85rem",
              color: "#ef4444",
              background: "rgba(239, 68, 68, 0.1)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              borderRadius: "6px",
              cursor: deleting ? "wait" : "pointer",
            }}
          >
            <Trash2 size={14} /> {deleting ? "削除中..." : "削除"}
          </button>
        </div>
      </div>

      {/* Date & Time */}
      <div
        style={{
          marginBottom: "1.5rem",
          color: "var(--color-text-tertiary)",
          fontSize: "0.9rem",
        }}
      >
        {formattedDate} {formattedTime}
      </div>

      {/* Title if exists */}
      {entry.title && (
        <h1
          style={{
            fontSize: "1.5rem",
            fontWeight: 600,
            marginBottom: "1.5rem",
            color: "var(--color-text-primary)",
          }}
        >
          {entry.title}
        </h1>
      )}

      {/* Mode Toggle */}
      <div
        style={{
          marginBottom: "1.5rem",
          display: "flex",
          gap: "0.5rem",
        }}
      >
        <button
          onClick={() => setMode("human")}
          style={{
            padding: "0.5rem 1rem",
            fontSize: "0.85rem",
            borderRadius: "6px",
            border:
              mode === "human"
                ? "1px solid var(--color-accent)"
                : "1px solid var(--color-border)",
            background:
              mode === "human" ? "var(--color-accent-subtle)" : "transparent",
            color:
              mode === "human"
                ? "var(--color-accent)"
                : "var(--color-text-secondary)",
            cursor: "pointer",
          }}
        >
          閲覧ビュー
        </button>
        <button
          onClick={() => setMode("ai")}
          style={{
            padding: "0.5rem 1rem",
            fontSize: "0.85rem",
            borderRadius: "6px",
            border:
              mode === "ai"
                ? "1px solid var(--color-accent)"
                : "1px solid var(--color-border)",
            background:
              mode === "ai" ? "var(--color-accent-subtle)" : "transparent",
            color:
              mode === "ai"
                ? "var(--color-accent)"
                : "var(--color-text-secondary)",
            cursor: "pointer",
          }}
        >
          AIデータ
        </button>
      </div>

      {mode === "human" ? (
        // Human View
        <div>
          {/* Images Gallery */}
          {entry.images && entry.images.length > 0 && (
            <div
              style={{
                marginBottom: "1.5rem",
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                gap: "1rem",
              }}
            >
              {entry.images.map((url, idx) => (
                <div
                  key={idx}
                  style={{
                    position: "relative",
                    borderRadius: "12px",
                    overflow: "hidden",
                    border: "1px solid var(--color-border)",
                    aspectRatio: "16/9",
                  }}
                >
                  <img
                    src={url}
                    alt={`${entry.title || "Entry"} image ${idx + 1}`}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Main content */}
          <div
            style={{
              lineHeight: 1.9,
              fontSize: "1rem",
              color: "var(--color-text-primary)",
              whiteSpace: "pre-wrap",
              padding: "1.5rem",
              background: "var(--color-bg-tertiary)",
              borderRadius: "12px",
              border: "1px solid var(--color-border)",
            }}
          >
            {entry.human_view}
          </div>

          {/* Topics */}
          {topics.length > 0 && (
            <div
              style={{
                marginTop: "1.5rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  color: "var(--color-text-tertiary)",
                  fontSize: "0.85rem",
                }}
              >
                トピック:
              </span>
              {topics.map((t) => (
                <Link
                  key={t.id}
                  href={`/topics/${t.id}`}
                  style={{
                    fontSize: "0.85rem",
                    padding: "0.3rem 0.75rem",
                    background: "var(--color-accent-subtle)",
                    color: "var(--color-accent)",
                    borderRadius: "16px",
                    textDecoration: "none",
                  }}
                >
                  {t.name}
                </Link>
              ))}
            </div>
          )}

          {/* Copy button */}
          <div style={{ marginTop: "1.5rem" }}>
            <button
              onClick={() => copyToClipboard(entry.human_view)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.5rem 1rem",
                fontSize: "0.85rem",
                color: copied
                  ? "var(--color-accent-secondary)"
                  : "var(--color-text-tertiary)",
                background: "transparent",
                border: "1px solid var(--color-border)",
                borderRadius: "6px",
                cursor: "pointer",
              }}
            >
              {copied ? (
                <>
                  <Check size={14} /> コピーしました
                </>
              ) : (
                <>
                  <Copy size={14} /> テキストをコピー
                </>
              )}
            </button>
          </div>

          {/* Related Entries (Serendipity) */}
          <RelatedEntries
            currentEntryId={entry.id}
            content={entry.human_view}
          />
        </div>
      ) : (
        // AI View
        <div>
          <pre
            style={{
              background: "var(--color-bg-primary)",
              padding: "1.5rem",
              borderRadius: "12px",
              overflowX: "auto",
              fontFamily: "var(--font-mono)",
              fontSize: "0.85rem",
              border: "1px solid var(--color-border)",
              color: "var(--color-text-primary)",
              lineHeight: 1.6,
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
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.5rem 1rem",
                fontSize: "0.85rem",
                color: copied
                  ? "var(--color-accent-secondary)"
                  : "var(--color-text-tertiary)",
                background: "transparent",
                border: "1px solid var(--color-border)",
                borderRadius: "6px",
                cursor: "pointer",
              }}
            >
              {copied ? (
                <>
                  <Check size={14} /> コピーしました
                </>
              ) : (
                <>
                  <Copy size={14} /> JSONをコピー
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
