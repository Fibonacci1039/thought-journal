import Link from "next/link";
import { Entry } from "@/lib/types";

// Helper: Format YYYY-MM-DD for grouping key
const getDateKey = (isoString: string) => {
  const d = new Date(isoString);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

// Helper: Format display header "YYYY-MM-DD (Weekday)"
const formatDateHeader = (isoString: string) => {
  const d = new Date(isoString);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  const w = weekdays[d.getDay()];
  return `${yyyy}-${mm}-${dd} (${w})`;
};

export function EntryList({ entries }: { entries: Entry[] }) {
  if (entries.length === 0) {
    return (
      <div style={{ color: "var(--color-subtle)", padding: "2rem 0" }}>
        まだ記録がありません。
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
    <div style={{ display: "flex", flexDirection: "column", gap: "3rem" }}>
      {sortedKeys.map((dateKey) => {
        const groupEntries = groups[dateKey];
        return (
          <div key={dateKey}>
            {/* Date Header */}
            <div
              style={{
                fontSize: "0.9rem",
                color: "var(--color-subtle)",
                marginBottom: "1rem",
                fontFamily: "var(--font-mono)",
                letterSpacing: "0.05em",
              }}
            >
              {formatDateHeader(groupEntries[0].created_at)}
            </div>

            {/* Entries in this group */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "1.5rem",
              }}
            >
              {groupEntries.map((entry) => (
                <Link
                  key={entry.id}
                  href={`/entry/${entry.id}`}
                  style={{
                    display: "block",
                    textDecoration: "none",
                    color: "inherit",
                    // No border, just whitespace validation
                  }}
                >
                  <div
                    style={{
                      fontSize: "1rem",
                      lineHeight: "1.6",
                      marginBottom: "0.25rem",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {/* Truncated human view logic is handled by CSS line-clamp above, 
                        but we provide just the text here. */}
                    {entry.human_view || "無題の記録"}
                  </div>

                  {/* Subtle Topic Count */}
                  {entry.topic_ids.length > 0 && (
                    <div
                      style={{
                        fontSize: "0.8rem",
                        color: "var(--color-subtle)",
                      }}
                    >
                      {entry.topic_ids.length} topics
                    </div>
                  )}
                </Link>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
