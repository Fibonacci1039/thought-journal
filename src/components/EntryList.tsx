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
                borderBottom: "1px solid var(--color-border)", // Added divider for clarity
                paddingBottom: "0.5rem",
              }}
            >
              {formatDateHeader(groupEntries[0].created_at)}
            </div>

            {/* Entries in this group */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "1rem", // Tighter gap
              }}
            >
              {groupEntries.map((entry) => {
                // Determine display text: Title > AI summary > Narrative
                const summary = (entry.ai_view as any)?.summary;
                const title = entry.title;
                const displayText = title
                  ? title
                  : summary && summary.length > 0
                  ? summary
                  : entry.human_view || "無題の記録";

                return (
                  <Link
                    key={entry.id}
                    href={`/entry/${entry.id}`}
                    style={{
                      display: "block",
                      textDecoration: "none",
                      color: "inherit",
                      padding: "0.5rem 0", // Clickable area
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "baseline",
                        gap: "0.75rem",
                      }}
                    >
                      {/* Bullet / Mood Indicator */}
                      <div
                        style={{
                          fontSize: "0.85rem",
                          color: "var(--color-subtle)",
                          minWidth: "24px",
                          textAlign: "center",
                        }}
                      >
                        {entry.mood ? `[${entry.mood}]` : "•"}
                      </div>

                      {/* Content */}
                      <div
                        style={{
                          fontSize: "1rem",
                          lineHeight: "1.6",
                          flexGrow: 1,
                          overflow: "hidden",
                          whiteSpace: "nowrap", // Single line summary
                          textOverflow: "ellipsis",
                          fontWeight: title ? 600 : 400, // Bold if title
                        }}
                      >
                        {displayText}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
