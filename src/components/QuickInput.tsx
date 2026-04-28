"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Feather, Check, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createEntryAction, enrichEntryAiViewAction } from "@/app/actions";
import { CompletionRitual } from "./CompletionRitual";
import { EntryType } from "@/lib/types";

const QUICK_TYPES: { label: string; value: EntryType }[] = [
  { label: "メモ", value: "quick_memo" },
  { label: "引用", value: "quote" },
  { label: "アイデア", value: "idea" },
];

export function QuickInput() {
  const [value, setValue] = useState("");
  const [entryType, setEntryType] = useState<EntryType>("quick_memo");
  const [isFocused, setIsFocused] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRitual, setShowRitual] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleSubmit = async () => {
    if (!value.trim() || isSubmitting) return;

    setIsSubmitting(true);

    try {
      const result = await createEntryAction({
        title: "",
        human_view: value.trim(),
        entry_type: entryType,
        ai_view: {
          schema_version: "2.1",
          type: "quick_capture",
          quick_capture_type: entryType,
          reflection_assets: {
            raw_thought: value.trim(),
            concerns: [],
            emotions: [],
            values: [],
            next_actions: [],
            questions_for_future: [],
          },
        },
        topic_ids: [],
        source_url: "",
        cite_text: "",
        images: [],
      });

      if (result.success) {
        if ("data" in result && result.data?.id) {
          void enrichEntryAiViewAction(result.data.id);
        }
        setShowRitual(true);
      } else {
        alert("保存に失敗しました");
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error("QuickInput error:", error);
      alert("エラーが発生しました");
      setIsSubmitting(false);
    }
  };

  const handleRitualComplete = () => {
    setValue("");
    setEntryType("quick_memo");
    setIsSubmitting(false);
    setShowRitual(false);
    router.refresh();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.nativeEvent.isComposing) return;

    if (e.key === "Enter" && value.trim() && !isSubmitting) {
      handleSubmit();
    }
  };

  return (
    <>
      <motion.div
        className="quick-input-wrap"
        initial={false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{
          marginBottom: "1.5rem",
        }}
      >
        <div
          onClick={() => inputRef.current?.focus()}
          style={{
            display: "flex",
            alignItems: "stretch",
            flexDirection: "column",
            gap: "0.75rem",
            minHeight: "164px",
            width: "100%",
            minWidth: 0,
            padding: "1.25rem",
            background:
              "linear-gradient(180deg, var(--color-surface-raised), var(--color-surface))",
            borderRadius: "var(--radius-md)",
            border: `1px solid ${
              isFocused ? "var(--color-border-hover)" : "var(--color-border)"
            }`,
            cursor: "text",
            transition: "all 0.2s ease",
            boxShadow: isFocused
              ? "0 0 0 3px var(--color-accent-subtle)"
              : "none",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              color: "var(--color-accent)",
              fontSize: "0.75rem",
              fontWeight: 800,
            }}
          >
            <Feather size={14} />
            ひとこと記録
          </div>
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onKeyDown={handleKeyDown}
            placeholder="忘れたくないことを一行で残す"
            disabled={isSubmitting}
            style={{
              flex: 1,
              width: "100%",
              minWidth: 0,
              border: "none",
              background: "transparent",
              fontSize: "1.1rem",
              fontWeight: 700,
              lineHeight: 1.7,
              color: "var(--color-text-primary)",
              outline: "none",
              fontFamily: "var(--font-sans)",
              opacity: isSubmitting ? 0.5 : 1,
            }}
          />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "0.75rem",
              paddingTop: "0.875rem",
              borderTop: "1px solid var(--color-border)",
            }}
          >
            <div
              aria-label="記録タイプ"
              style={{ display: "flex", gap: "0.5rem", minWidth: 0 }}
            >
              {QUICK_TYPES.map((type) => {
                const isSelected = entryType === type.value;
                return (
                  <button
                    className="quick-type-button"
                    key={type.value}
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setEntryType(type.value);
                    }}
                    aria-pressed={isSelected}
                    style={{
                      border: isSelected
                        ? "1px solid var(--color-accent)"
                        : "1px solid var(--color-border)",
                      background: isSelected
                        ? "var(--color-accent-subtle)"
                        : "transparent",
                      color: isSelected
                        ? "var(--color-accent)"
                        : "var(--color-text-tertiary)",
                      fontWeight: isSelected ? 800 : 600,
                    }}
                  >
                    {type.label}
                  </button>
                );
              })}
            </div>
            <AnimatePresence>
              {value.trim() && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.375rem",
                    minWidth: "58px",
                    height: "36px",
                    borderRadius: "var(--radius-md)",
                    backgroundColor: "var(--color-accent)",
                    border: "none",
                    cursor: isSubmitting ? "wait" : "pointer",
                    color: "#07121c",
                    fontWeight: 800,
                  }}
                >
                  {isSubmitting ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Check size={16} />
                  )}
                  保存
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
      <CompletionRitual
        isVisible={showRitual}
        onComplete={handleRitualComplete}
      />
    </>
  );
}
