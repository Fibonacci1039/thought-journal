"use client";

import { Topic, Entry } from "@/lib/types";
import { X, Calendar, Edit2, ExternalLink } from "lucide-react";
import Link from "next/link";

type Props = {
  nodeId: string | null;
  nodeType: "topic" | "entry" | "root" | null;
  data: Topic | Entry | null;
  onClose: () => void;
};

export function DetailPanel({ nodeId, nodeType, data, onClose }: Props) {
  if (!nodeId || !data) return null;

  const isTopic = nodeType === "topic";
  const isEntry = nodeType === "entry";

  return (
    <div
      className="animate-slide-in-right"
      style={{
        position: "absolute",
        top: "1rem",
        right: "1rem",
        bottom: "1rem",
        width: "350px",
        backgroundColor: "var(--color-bg-secondary)", // Slightly lighter than main bg
        border: "1px solid var(--color-border)",
        borderRadius: "16px",
        boxShadow: "-4px 0 24px rgba(0,0,0,0.2)",
        display: "flex",
        flexDirection: "column",
        zIndex: 10,
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "1rem 1.5rem",
          borderBottom: "1px solid var(--color-border)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          backgroundColor: "var(--color-bg-tertiary)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "1.2rem" }}>
            {isTopic ? "🏷️" : isEntry ? "📝" : "🧠"}
          </span>
          <span
            style={{
              fontSize: "0.8rem",
              fontWeight: 600,
              textTransform: "uppercase",
              color: "var(--color-text-tertiary)",
            }}
          >
            {isTopic ? "Topic" : isEntry ? "Entry" : "Root"}
          </span>
        </div>
        <button
          onClick={onClose}
          style={{
            background: "transparent",
            border: "none",
            color: "var(--color-text-secondary)",
            cursor: "pointer",
            padding: "4px",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <X size={18} />
        </button>
      </div>

      {/* Content */}
      <div style={{ padding: "1.5rem", overflowY: "auto", flex: 1 }}>
        {isTopic && (data as Topic) && (
          <>
            <h2
              style={{
                fontSize: "1.5rem",
                fontWeight: 700,
                marginBottom: "1rem",
                lineHeight: 1.3,
              }}
            >
              {(data as Topic).name}
            </h2>
            <div
              style={{ display: "flex", gap: "0.5rem", marginBottom: "2rem" }}
            >
              <Link
                href={`/topics/${(data as Topic).id}`}
                className="btn-secondary"
                style={{
                  padding: "0.5rem 1rem",
                  fontSize: "0.9rem",
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.4rem",
                }}
              >
                <ExternalLink size={14} />
                詳細ページへ
              </Link>
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <h4
                style={{
                  fontSize: "0.9rem",
                  color: "var(--color-text-secondary)",
                  marginBottom: "0.5rem",
                }}
              >
                ID
              </h4>
              <code
                style={{
                  fontSize: "0.8rem",
                  background: "var(--color-bg-primary)",
                  padding: "4px 8px",
                  borderRadius: "4px",
                }}
              >
                {(data as Topic).id}
              </code>
            </div>
          </>
        )}

        {isEntry && (data as Entry) && (
          <>
            <h2
              style={{
                fontSize: "1.3rem",
                fontWeight: 700,
                marginBottom: "0.5rem",
                lineHeight: 1.4,
              }}
            >
              {(data as Entry).title || "無題の記録"}
            </h2>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                color: "var(--color-text-tertiary)",
                fontSize: "0.85rem",
                marginBottom: "1.5rem",
              }}
            >
              <Calendar size={14} />
              {new Date((data as Entry).created_at).toLocaleDateString("ja-JP")}
            </div>

            <div
              style={{
                fontSize: "1rem",
                lineHeight: 1.7,
                color: "var(--color-text-primary)",
                whiteSpace: "pre-wrap",
                marginBottom: "2rem",
              }}
            >
              {(data as Entry).human_view}
            </div>

            {(data as Entry).ai_view && (
              <div
                style={{
                  padding: "1rem",
                  background: "var(--color-bg-primary)",
                  borderRadius: "8px",
                  fontSize: "0.9rem",
                }}
              >
                <h4
                  style={{
                    margin: "0 0 0.5rem",
                    fontSize: "0.9rem",
                    color: "var(--color-accent-primary)",
                  }}
                >
                  🤖 AI Analysis
                </h4>
                <p style={{ margin: 0, color: "var(--color-text-secondary)" }}>
                  {/* Display a snippet of AI view if available, safely */}
                  {(data as Entry).ai_view.current_status || "データなし"}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
