"use client";

import { useState, useEffect } from "react";
import { Sun, Moon } from "lucide-react";
import { motion } from "framer-motion";

type Theme = "dark" | "light";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Get saved theme or default to dark
    const savedTheme = localStorage.getItem("theme") as Theme | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute("data-theme", savedTheme);
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
  };

  if (!mounted) {
    // Prevent hydration mismatch
    return (
      <button
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "36px",
          height: "36px",
          borderRadius: "50%",
          border: "1px solid var(--color-border)",
          background: "transparent",
          cursor: "pointer",
        }}
      >
        <Sun size={16} style={{ color: "var(--color-text-tertiary)" }} />
      </button>
    );
  }

  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={toggleTheme}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "36px",
        height: "36px",
        borderRadius: "50%",
        border: "1px solid var(--color-border)",
        background: "transparent",
        cursor: "pointer",
        transition: "all 0.2s ease",
      }}
      title={theme === "dark" ? "ライトモードに切替" : "ダークモードに切替"}
    >
      {theme === "dark" ? (
        <Sun size={16} style={{ color: "var(--color-text-tertiary)" }} />
      ) : (
        <Moon size={16} style={{ color: "var(--color-text-tertiary)" }} />
      )}
    </motion.button>
  );
}
