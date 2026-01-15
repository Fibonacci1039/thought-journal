"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Feather, Check, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createEntryAction } from "@/app/actions";
import { CompletionRitual } from "./CompletionRitual";

export function QuickInput() {
  const [value, setValue] = useState("");
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
        ai_view: { schema_version: "1.0" },
        topic_ids: [],
        source_url: "",
        cite_text: "",
        images: [],
      });

      if (result.success) {
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
        initial={{ opacity: 0, y: -10 }}
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
            alignItems: "center",
            gap: "0.75rem",
            padding: "0.9rem 1.25rem",
            backgroundColor: "var(--color-bg-tertiary)",
            borderRadius: "12px",
            border: `1px solid ${
              isFocused ? "var(--color-accent)" : "var(--color-border)"
            }`,
            cursor: "text",
            transition: "all 0.2s ease",
            boxShadow: isFocused
              ? "0 0 0 3px var(--color-accent-subtle)"
              : "none",
          }}
        >
          <Feather
            size={18}
            style={{
              color: isFocused
                ? "var(--color-accent)"
                : "var(--color-text-tertiary)",
              transition: "color 0.2s ease",
            }}
          />
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onKeyDown={handleKeyDown}
            placeholder="今、何を考えていますか？"
            disabled={isSubmitting}
            style={{
              flex: 1,
              border: "none",
              background: "transparent",
              fontSize: "0.95rem",
              color: "var(--color-text-primary)",
              outline: "none",
              fontFamily: "var(--font-sans)",
              opacity: isSubmitting ? 0.5 : 1,
            }}
          />
          <AnimatePresence>
            {value.trim() && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={handleSubmit}
                disabled={isSubmitting}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  backgroundColor: "var(--color-accent)",
                  border: "none",
                  cursor: isSubmitting ? "wait" : "pointer",
                  color: "#fff",
                }}
              >
                {isSubmitting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Check size={16} />
                )}
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
      <CompletionRitual
        isVisible={showRitual}
        onComplete={handleRitualComplete}
      />
    </>
  );
}
