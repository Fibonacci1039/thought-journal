"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Entry } from "@/lib/types";
import { History, RefreshCw, ChevronRight, Lock, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Props = {
  entries: Entry[];
  isPro?: boolean;
};

export function MemoryLane({ entries, isPro = false }: Props) {
  const router = useRouter();
  const [pastEntry, setPastEntry] = useState<Entry | null>(null);
  const [daysDiff, setDaysDiff] = useState<number>(0);

  const findPastEntry = () => {
    if (entries.length === 0) return;

    // ... (logic remains same) ...
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

  // Locked State for Free Plan
  if (!isPro) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        style={{
          marginBottom: "2rem",
          padding: "1.5rem",
          background: "var(--color-bg-secondary)",
          borderRadius: "12px",
          border: "1px dashed var(--color-border)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to bottom, transparent 0%, var(--color-bg-secondary) 80%)",
            zIndex: 1,
            pointerEvents: "none",
          }}
        />

        {/* Blurred Content Preview */}
        <div style={{ filter: "blur(4px)", opacity: 0.5, userSelect: "none" }}>
          <div
            style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}
          >
            <History size={16} /> <span>1年前の今日</span>
          </div>
          <p>
            今日は新しいプロジェクトのアイデアを思いついた。チームメンバーと共有して...
            ワクワクするような始まりだった。しかし課題もいくつか見えてきたので...
          </p>
        </div>

        {/* Lock Overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 2,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.75rem",
          }}
        >
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              background: "var(--color-bg-tertiary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <Lock size={20} style={{ color: "var(--color-text-secondary)" }} />
          </div>
          <div style={{ textAlign: "center" }}>
            <p
              style={{
                fontSize: "0.95rem",
                fontWeight: 600,
                color: "var(--color-text-primary)",
                marginBottom: "0.2rem",
              }}
            >
              過去の自分に出会う
            </p>
            <p
              style={{
                fontSize: "0.8rem",
                color: "var(--color-text-tertiary)",
              }}
            >
              Proプランで「Memory Lane」を解放
            </p>
          </div>
          <button
            onClick={() => router.push("/settings")}
            style={{
              marginTop: "0.5rem",
              padding: "0.5rem 1rem",
              background: "linear-gradient(135deg, #8b5cf6, #3b82f6)",
              color: "white",
              border: "none",
              borderRadius: "20px",
              fontSize: "0.85rem",
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              boxShadow: "0 4px 12px rgba(139, 92, 246, 0.3)",
            }}
          >
            <Sparkles size={14} /> プランを確認する
          </button>
        </div>
      </motion.div>
    );
  }

  // Active State for Pro Plan
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
