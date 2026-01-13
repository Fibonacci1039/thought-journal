"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Feather, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function QuickInput() {
  const [value, setValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleSubmit = () => {
    if (value.trim()) {
      // Navigate to new entry page with prefilled content
      router.push(`/new?quick=${encodeURIComponent(value)}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && value.trim()) {
      handleSubmit();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      style={{
        marginBottom: "2rem",
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
          style={{
            flex: 1,
            border: "none",
            background: "transparent",
            fontSize: "0.95rem",
            color: "var(--color-text-primary)",
            outline: "none",
            fontFamily: "var(--font-sans)",
          }}
        />
        <AnimatePresence>
          {value.trim() && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={handleSubmit}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                backgroundColor: "var(--color-accent)",
                border: "none",
                cursor: "pointer",
                color: "#fff",
              }}
            >
              <ArrowRight size={16} />
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
