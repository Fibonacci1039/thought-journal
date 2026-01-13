"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Entry } from "@/lib/types";
import { History, RefreshCw, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Props = {
  entries: Entry[];
};

export function MemoryLane({ entries }: Props) {
  const router = useRouter();
  const [pastEntry, setPastEntry] = useState<Entry | null>(null);
  const [daysDiff, setDaysDiff] = useState<number>(0);

  const findPastEntry = () => {
    if (entries.length === 0) return;

    const today = new Date();
    const todayMonth = today.getMonth();
    const todayDate = today.getDate();

    // Find entries from the same day in past years
    const sameDayEntries = entries.filter((entry) => {
      const entryDate = new Date(entry.created_at);
      return (
        entryDate.getMonth() === todayMonth &&
        entryDate.getDate() === todayDate &&
        entryDate.getFullYear() < today.getFullYear()
      );
    });

    if (sameDayEntries.length > 0) {
      const randomEntry =
        sameDayEntries[Math.floor(Math.random() * sameDayEntries.length)];
      const entryDate = new Date(randomEntry.created_at);
      const diffYears = today.getFullYear() - entryDate.getFullYear();
      setPastEntry(randomEntry);
      setDaysDiff(diffYears * 365); // Approximate
      return;
    }

    // Fallback: Find entries from 7+ days ago
    const oldEntries = entries.filter((entry) => {
      const entryDate = new Date(entry.created_at);
      const diff = today.getTime() - entryDate.getTime();
      const daysDiff = diff / (1000 * 60 * 60 * 24);
      return daysDiff >= 7;
    });

    if (oldEntries.length > 0) {
      const randomEntry =
        oldEntries[Math.floor(Math.random() * oldEntries.length)];
      const entryDate = new Date(randomEntry.created_at);
      const diff = today.getTime() - entryDate.getTime();
      setDaysDiff(Math.floor(diff / (1000 * 60 * 60 * 24)));
      setPastEntry(randomEntry);
    }
  };

  useEffect(() => {
    findPastEntry();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries]);

  if (!pastEntry) return null;

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  };

  const getDaysLabel = () => {
    if (daysDiff >= 365) {
      const years = Math.floor(daysDiff / 365);
      return `${years}年前の今日`;
    }
    return `${daysDiff}日前`;
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        style={{
          marginBottom: "2rem",
          padding: "1.25rem",
          background:
            "linear-gradient(135deg, rgba(139, 92, 246, 0.08), rgba(168, 85, 247, 0.04))",
          borderRadius: "12px",
          border: "1px solid rgba(139, 92, 246, 0.2)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "0.75rem",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <History size={16} style={{ color: "#a78bfa" }} />
            <span
              style={{
                fontSize: "0.8rem",
                fontWeight: 600,
                color: "#a78bfa",
              }}
            >
              {getDaysLabel()}
            </span>
          </div>
          <button
            onClick={() => findPastEntry()}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              fontSize: "0.75rem",
              color: "var(--color-text-tertiary)",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: "4px 8px",
              borderRadius: "6px",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.05)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            <RefreshCw size={12} />
            別の記録
          </button>
        </div>

        {/* Content */}
        <div
          onClick={() => router.push(`/entry/${pastEntry.id}`)}
          style={{
            cursor: "pointer",
            transition: "opacity 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = "0.8";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = "1";
          }}
        >
          <p
            style={{
              fontSize: "0.95rem",
              color: "var(--color-text-secondary)",
              lineHeight: 1.6,
              marginBottom: "0.75rem",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {pastEntry.title || pastEntry.human_view?.slice(0, 100) || ""}
          </p>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span
              style={{
                fontSize: "0.75rem",
                color: "var(--color-text-tertiary)",
              }}
            >
              {formatDate(pastEntry.created_at)}
            </span>
            <ChevronRight size={14} style={{ color: "#a78bfa" }} />
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
