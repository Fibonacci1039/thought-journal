"use client";

import { useEffect, useState } from "react";
import { findRelatedEntriesAction } from "@/app/actions";
import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";

type RelatedEntry = {
  id: string;
  title: string | null;
  human_view: string;
  similarity: number;
};

type Props = {
  currentEntryId: string;
  content: string; // human_view
};

export function RelatedEntries({ currentEntryId, content }: Props) {
  const [entries, setEntries] = useState<RelatedEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchRelated = async () => {
      if (!content) return;
      setLoading(true);
      const res = await findRelatedEntriesAction(content);
      if (res.success && res.data) {
        // Filter out current entry and limit to 3
        const filtered = (res.data as RelatedEntry[])
          .filter((e) => e.id !== currentEntryId)
          .slice(0, 3);
        setEntries(filtered);
      }
      setLoading(false);
    };

    fetchRelated();
  }, [content, currentEntryId]);

  if (loading) {
    return (
      <div
        style={{
          padding: "1.5rem",
          background: "var(--color-bg-secondary)",
          borderRadius: "12px",
          marginTop: "2rem",
          animation: "pulse 2s infinite",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            marginBottom: "1rem",
            color: "var(--color-text-tertiary)",
          }}
        >
          <Sparkles size={16} />
          <span style={{ fontSize: "0.9rem" }}>関連を検索中...</span>
        </div>
      </div>
    );
  }

  if (entries.length === 0) return null;

  return (
    <div
      style={{
        marginTop: "3rem",
        borderTop: "1px solid var(--color-border)",
        paddingTop: "2rem",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          marginBottom: "1rem",
        }}
      >
        <Sparkles size={18} className="text-purple-400" />
        <h3 style={{ margin: 0, fontSize: "1.1rem" }}>
          以前も、似たことを考えていました
        </h3>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
          gap: "1rem",
        }}
      >
        {entries.map((entry) => (
          <Link
            key={entry.id}
            href={`/entry/${entry.id}`}
            style={{
              textDecoration: "none",
              color: "inherit",
              display: "block",
            }}
          >
            <div
              style={{
                padding: "1rem",
                background: "var(--color-bg-tertiary)",
                borderRadius: "12px",
                border: "1px solid var(--color-border)",
                height: "100%",
                transition: "transform 0.2s, border-color 0.2s",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--color-accent)";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--color-border)";
                e.currentTarget.style.transform = "none";
              }}
            >
              <div
                style={{
                  fontSize: "0.85rem",
                  color: "var(--color-text-tertiary)",
                  marginBottom: "0.5rem",
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <span>類似度 {(entry.similarity * 100).toFixed(0)}%</span>
                <ArrowRight size={14} />
              </div>
              <p
                style={{
                  fontSize: "0.9rem",
                  color: "var(--color-text-secondary)",
                  margin: 0,
                  lineHeight: 1.5,
                  display: "-webkit-box",
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {entry.title || entry.human_view}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
