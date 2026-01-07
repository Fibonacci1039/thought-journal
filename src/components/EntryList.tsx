"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Entry, Topic } from "@/lib/types";
import { Clock, Link as LinkIcon, Hash } from "lucide-react";

// Helper: Format YYYY-MM-DD for grouping key
const getDateKey = (isoString: string) => {
  const d = new Date(isoString);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

// Helper: Format display header with style (Japanese)
const formatDateHeader = (isoString: string) => {
  const d = new Date(isoString);
  const month = d.getMonth() + 1; // 1-12
  const day = d.getDate();
  const weekday = d.toLocaleDateString("ja-JP", { weekday: "short" }); // 月, 火...
  return { month, day, weekday, fullVideo: `${d.getFullYear()}` };
};

export function EntryList({
  entries,
  topics = [],
}: {
  entries: Entry[];
  topics?: Topic[];
}) {
  const router = useRouter();

  if (entries.length === 0) {
    return (
      <div
        className="glass-card"
        style={{
          padding: "3rem",
          textAlign: "center",
          color: "var(--color-text-tertiary)",
        }}
      >
        <p>まだ記録がありません。</p>
        <Link
          href="/new"
          style={{
            marginTop: "1rem",
            display: "inline-block",
            color: "var(--color-accent-primary)",
          }}
        >
          + 最初の記録を作成する
        </Link>
      </div>
    );
  }

  // Group entries by date
  const groups: Record<string, Entry[]> = {};
  entries.forEach((entry) => {
    const key = getDateKey(entry.created_at);
    if (!groups[key]) groups[key] = [];
    groups[key].push(entry);
  });

  // Sort keys descending (Newest first)
  const sortedKeys = Object.keys(groups).sort((a, b) => b.localeCompare(a));

  return (
    <div style={{ position: "relative" }}>
      {sortedKeys.map((dateKey) => {
        const groupEntries = groups[dateKey];
        const dateObj = formatDateHeader(groupEntries[0].created_at);

        return (
          <div key={dateKey} style={{ marginBottom: "2rem" }}>
            {/* Sticky Date Header (Things 3 Style) */}
            <div
              style={{
                position: "sticky",
                top: "0",
                zIndex: 10,
                backgroundColor: "var(--content-bg)", // Match body bg for masking
                paddingBottom: "0.5rem",
                paddingTop: "0.5rem",
                marginBottom: "0.5rem",
                borderBottom: "1px solid var(--color-border)",
                display: "flex",
                alignItems: "baseline",
                gap: "0.5rem",
              }}
            >
              <h3
                style={{
                  fontSize: "1.1rem",
                  fontWeight: 700,
                  color: "var(--color-text-primary)",
                  letterSpacing: "-0.02em",
                  margin: 0,
                }}
              >
                {dateObj.month}月 {dateObj.day}日
              </h3>
              <span
                style={{
                  fontSize: "1rem",
                  color: "var(--color-text-tertiary)",
                  fontWeight: 500,
                }}
              >
                {dateObj.weekday}
              </span>
            </div>

            {/* List of Entries */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.8rem",
              }}
            >
              {groupEntries.map((entry) => {
                const summary = (entry.ai_view as any)?.summary;
                const title = entry.title;
                const bodyText = entry.human_view;
                const mainText = title || summary || bodyText;

                const timeStr = new Date(entry.created_at).toLocaleTimeString(
                  "en-US",
                  {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false,
                  }
                );

                return (
                  <div
                    key={entry.id}
                    className="entry-row"
                    onClick={() => router.push(`/entry/${entry.id}`)}
                  >
                    <div
                      style={{
                        display: "flex",
                        gap: "1rem",
                        alignItems: "baseline",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "0.85rem",
                          color: "var(--color-text-tertiary)",
                          fontFamily: "var(--font-mono)",
                          minWidth: "45px",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <Clock size={10} /> {timeStr}
                      </span>

                      <div style={{ flexGrow: 1 }}>
                        <h4
                          style={{
                            fontSize: "1rem",
                            fontWeight: 500,
                            color: "var(--color-text-primary)",
                            marginBottom: "0.2rem",
                            lineHeight: 1.5,
                          }}
                        >
                          {mainText}
                        </h4>

                        {/* Optional badges line */}
                        <div
                          style={{
                            display: "flex",
                            gap: "0.5rem",
                            alignItems: "center",
                            marginTop: "0.4rem",
                          }}
                        >
                          {entry.topic_ids.length > 0 &&
                            entry.topic_ids.map((tid) => {
                              const topic = topics.find((t) => t.id === tid);
                              return (
                                <Link
                                  key={tid}
                                  href={`/topics/${tid}`}
                                  onClick={(e) => e.stopPropagation()}
                                  style={{
                                    fontSize: "0.75rem",
                                    color: "var(--color-accent-secondary)", // Yellow-Green
                                    background: "rgba(159, 209, 57, 0.15)", // Subtle version of yellow-green
                                    padding: "2px 8px",
                                    borderRadius: "12px",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "4px",
                                    textDecoration: "none",
                                    transition: "background 0.2s",
                                  }}
                                  onMouseEnter={(e) =>
                                    (e.currentTarget.style.background =
                                      "var(--color-border)")
                                  }
                                  onMouseLeave={(e) =>
                                    (e.currentTarget.style.background =
                                      "var(--color-bg-tertiary)")
                                  }
                                >
                                  <Hash size={10} />{" "}
                                  {topic ? topic.name : "Unknown"}
                                </Link>
                              );
                            })}
                          {entry.source_url && (
                            <span
                              style={{
                                fontSize: "0.75rem",
                                color: "var(--color-text-tertiary)",
                                display: "flex",
                                alignItems: "center",
                                gap: "3px",
                              }}
                            >
                              <LinkIcon size={10} /> Link
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
