"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Entry, Topic, EntryType } from "@/lib/types";
import {
  Clock,
  Link as LinkIcon,
  FileText,
  Zap,
  Quote,
  Lightbulb,
  Book,
  Film,
  Palette,
  Globe,
  MoreHorizontal,
} from "lucide-react";

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
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const weekday = d.toLocaleDateString("ja-JP", { weekday: "short" });
  return { month, day, weekday };
};

// Entry type config
const ENTRY_TYPE_CONFIG: Record<
  EntryType,
  { label: string; icon: React.ReactNode; color: string }
> = {
  journal: {
    label: "ジャーナル",
    icon: <FileText size={12} />,
    color: "var(--color-accent)",
  },
  quick_memo: {
    label: "メモ",
    icon: <Zap size={12} />,
    color: "var(--color-text-tertiary)",
  },
  quote: {
    label: "引用",
    icon: <Quote size={12} />,
    color: "#a78bfa",
  },
  idea: {
    label: "アイデア",
    icon: <Lightbulb size={12} />,
    color: "#fbbf24",
  },
};

// Source type icons for quotes
const SOURCE_TYPE_ICONS: Record<string, React.ReactNode> = {
  book: <Book size={12} />,
  movie: <Film size={12} />,
  art: <Palette size={12} />,
  web: <Globe size={12} />,
  other: <MoreHorizontal size={12} />,
};

// Filter options
type FilterType = "all" | EntryType;

const FILTER_OPTIONS: { value: FilterType; label: string }[] = [
  { value: "all", label: "すべて" },
  { value: "journal", label: "ジャーナル" },
  { value: "quick_memo", label: "メモ" },
  { value: "quote", label: "引用" },
  { value: "idea", label: "アイデア" },
];

export function EntryList({
  entries,
  topics = [],
}: {
  entries: Entry[];
  topics?: Topic[];
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<FilterType>("all");
  const [tagFilter, setTagFilter] = useState<string | null>(null);

  // Collect all unique tags from entries
  const allTags = Array.from(
    new Set(entries.flatMap((e) => e.tags || []))
  ).sort();

  // Determine entry type
  const getEntryType = (entry: Entry): EntryType => {
    if (entry.entry_type && ENTRY_TYPE_CONFIG[entry.entry_type]) {
      return entry.entry_type;
    }
    const aiView = entry.ai_view as Record<string, unknown>;
    if (aiView?.type === "quick_memo") return "quick_memo";
    if (aiView?.type === "quote") return "quote";
    if (entry.cite_text) return "quote";
    // Fallback based on content length, with null check
    const contentLength = entry.human_view?.length || 0;
    return contentLength > 100 ? "journal" : "quick_memo";
  };

  // Safe config getter with fallback
  const getEntryConfig = (entryType: EntryType) => {
    return ENTRY_TYPE_CONFIG[entryType] || ENTRY_TYPE_CONFIG.journal;
  };

  // Filter entries by type and tag
  let filteredEntries = entries;
  if (filter !== "all") {
    filteredEntries = filteredEntries.filter((e) => getEntryType(e) === filter);
  }
  if (tagFilter) {
    filteredEntries = filteredEntries.filter((e) =>
      e.tags?.includes(tagFilter)
    );
  }

  if (entries.length === 0) {
    return (
      <div
        className="glass-card responsive-p-3rem"
        style={{
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
  filteredEntries.forEach((entry) => {
    const key = getDateKey(entry.created_at);
    if (!groups[key]) groups[key] = [];
    groups[key].push(entry);
  });

  const sortedKeys = Object.keys(groups).sort((a, b) => b.localeCompare(a));

  return (
    <div>
      {/* Filter Buttons */}
      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          marginBottom: "1.5rem",
          flexWrap: "wrap",
        }}
      >
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setFilter(opt.value)}
            style={{
              padding: "0.4rem 0.8rem",
              fontSize: "0.85rem",
              borderRadius: "16px",
              border:
                filter === opt.value
                  ? "1px solid var(--color-accent)"
                  : "1px solid var(--color-border)",
              background:
                filter === opt.value
                  ? "var(--color-accent-subtle)"
                  : "transparent",
              color:
                filter === opt.value
                  ? "var(--color-accent)"
                  : "var(--color-text-secondary)",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Tag Filter */}
      {allTags.length > 0 && (
        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            marginBottom: "1.5rem",
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <span
            style={{
              fontSize: "0.8rem",
              color: "var(--color-text-tertiary)",
              marginRight: "0.25rem",
            }}
          >
            タグ:
          </span>
          <button
            onClick={() => setTagFilter(null)}
            style={{
              padding: "0.3rem 0.6rem",
              fontSize: "0.8rem",
              borderRadius: "12px",
              border: !tagFilter
                ? "1px solid #a78bfa"
                : "1px solid var(--color-border)",
              background: !tagFilter
                ? "rgba(167, 139, 250, 0.15)"
                : "transparent",
              color: !tagFilter ? "#a78bfa" : "var(--color-text-tertiary)",
              cursor: "pointer",
            }}
          >
            すべて
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setTagFilter(tag)}
              style={{
                padding: "0.3rem 0.6rem",
                fontSize: "0.8rem",
                borderRadius: "12px",
                border:
                  tagFilter === tag
                    ? "1px solid #a78bfa"
                    : "1px solid var(--color-border)",
                background:
                  tagFilter === tag
                    ? "rgba(167, 139, 250, 0.15)"
                    : "transparent",
                color:
                  tagFilter === tag ? "#a78bfa" : "var(--color-text-tertiary)",
                cursor: "pointer",
              }}
            >
              #{tag}
            </button>
          ))}
        </div>
      )}

      {/* Empty State for filtered */}
      {filteredEntries.length === 0 && (
        <div
          className="responsive-p-2rem"
          style={{
            textAlign: "center",
            color: "var(--color-text-tertiary)",
          }}
        >
          この条件に合う記録はありません
        </div>
      )}

      {/* Entries grouped by date */}
      <div style={{ position: "relative" }}>
        {sortedKeys.map((dateKey) => {
          const groupEntries = groups[dateKey];
          const dateObj = formatDateHeader(groupEntries[0].created_at);

          return (
            <div key={dateKey} style={{ marginBottom: "1.25rem" }}>
              {/* Date Header */}
              <div
                style={{
                  position: "sticky",
                  top: "0",
                  zIndex: 10,
                  backgroundColor: "var(--content-bg)",
                  paddingBottom: "0.5rem",
                  paddingTop: "0.5rem",
                  marginBottom: "0.25rem",
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
                    margin: 0,
                  }}
                >
                  {dateObj.month}月 {dateObj.day}日
                </h3>
                <span
                  style={{
                    fontSize: "1rem",
                    color: "var(--color-text-tertiary)",
                  }}
                >
                  {dateObj.weekday}
                </span>
              </div>

              {/* Entries */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem",
                }}
              >
                {groupEntries.map((entry) => {
                  const entryType = getEntryType(entry);
                  const isCompact = entryType === "quick_memo";
                  const config = getEntryConfig(entryType);

                  const timeStr = new Date(entry.created_at).toLocaleTimeString(
                    "en-US",
                    { hour: "2-digit", minute: "2-digit", hour12: false }
                  );

                  const mainText =
                    entry.title ||
                    (entry.ai_view as Record<string, unknown>)?.summary ||
                    entry.human_view;

                  // Compact display for quick memos
                  if (isCompact) {
                    return (
                      <div
                        key={entry.id}
                        onClick={() => router.push(`/entry/${entry.id}`)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.6rem",
                          padding: "0.5rem 0.8rem",
                          cursor: "pointer",
                          borderRadius: "8px",
                          transition: "background 0.2s",
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background =
                            "rgba(255,255,255,0.03)")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background = "transparent")
                        }
                      >
                        <span
                          style={{
                            color: config.color,
                            display: "flex",
                            alignItems: "center",
                          }}
                        >
                          {config.icon}
                        </span>
                        <span
                          style={{
                            fontSize: "0.8rem",
                            color: "var(--color-text-tertiary)",
                            fontFamily: "var(--font-mono)",
                            minWidth: "40px",
                          }}
                        >
                          {timeStr}
                        </span>
                        <span
                          style={{
                            fontSize: "0.95rem",
                            color: "var(--color-text-secondary)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            flex: 1,
                          }}
                        >
                          {typeof mainText === "string"
                            ? mainText.slice(0, 80)
                            : ""}
                          {typeof mainText === "string" && mainText.length > 80
                            ? "..."
                            : ""}
                        </span>
                      </div>
                    );
                  }

                  // Full display for journals, quotes, ideas
                  return (
                    <div
                      key={entry.id}
                      onClick={() => router.push(`/entry/${entry.id}`)}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "0.75rem",
                        padding: "0.9rem",
                        backgroundColor: "var(--color-bg-primary)",
                        borderRadius: "12px",
                        border: "1px solid var(--color-border)",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateY(-2px)";
                        e.currentTarget.style.boxShadow = "var(--shadow-card)";
                        e.currentTarget.style.borderColor =
                          "var(--color-border-hover)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = "none";
                        e.currentTarget.style.borderColor =
                          "var(--color-border)";
                      }}
                    >
                      {/* Type Icon */}
                      <div
                        style={{
                          width: "36px",
                          height: "36px",
                          borderRadius: "8px",
                          backgroundColor: "var(--color-accent-subtle)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: config.color,
                          flexShrink: 0,
                        }}
                      >
                        {entryType === "quote"
                          ? SOURCE_TYPE_ICONS[
                              (entry.ai_view as Record<string, unknown>)
                                ?.source_type as string
                            ] || config.icon
                          : config.icon}
                      </div>

                      {/* Content */}
                      <div style={{ flexGrow: 1, minWidth: 0 }}>
                        {/* Header: Type + Tags */}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            marginBottom: "0.5rem",
                            flexWrap: "wrap",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "0.75rem",
                              fontWeight: 600,
                              color: config.color,
                            }}
                          >
                            {config.label}
                          </span>
                          {/* Topic badges inline */}
                          {entry.topic_ids &&
                            entry.topic_ids.length > 0 &&
                            entry.topic_ids.slice(0, 2).map((tid) => {
                              const topic = topics.find((t) => t.id === tid);
                              return (
                                <Link
                                  key={tid}
                                  href={`/topics/${tid}`}
                                  onClick={(e) => e.stopPropagation()}
                                  style={{
                                    fontSize: "0.7rem",
                                    color: "#10b981",
                                    background: "rgba(16, 185, 129, 0.1)",
                                    padding: "2px 8px",
                                    borderRadius: "10px",
                                    textDecoration: "none",
                                    fontWeight: 500,
                                  }}
                                >
                                  {topic ? topic.name : "Unknown"}
                                </Link>
                              );
                            })}
                        </div>

                        {/* Main Text */}
                        <p
                          style={{
                            fontSize: "0.95rem",
                            color: "var(--color-text-primary)",
                            lineHeight: 1.6,
                            margin: 0,
                            display: "-webkit-box",
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}
                        >
                          {typeof mainText === "string"
                            ? mainText
                            : entry.title || ""}
                        </p>

                        {/* Time */}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            marginTop: "0.75rem",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "0.75rem",
                              color: "var(--color-text-tertiary)",
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            <Clock size={10} />
                            {timeStr}
                          </span>
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

                      {/* Right indicator dot */}
                      <div
                        style={{
                          width: "6px",
                          height: "6px",
                          borderRadius: "50%",
                          backgroundColor: config.color,
                          flexShrink: 0,
                          marginTop: "0.5rem",
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
