"use client";

import { useState, useEffect, useCallback } from "react";
import { Sun, Moon, Monitor } from "lucide-react";
import { motion } from "framer-motion";

type ThemeMode = "system" | "dark" | "light";

function getSystemTheme(): "dark" | "light" {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function ThemeToggle() {
  const [mode, setMode] = useState<ThemeMode>("system");
  const [mounted, setMounted] = useState(false);

  const applyTheme = useCallback((newMode: ThemeMode) => {
    const theme = newMode === "system" ? getSystemTheme() : newMode;
    document.documentElement.setAttribute("data-theme", theme);
  }, []);

  useEffect(() => {
    setMounted(true);
    const savedMode = localStorage.getItem("themeMode") as ThemeMode | null;
    if (savedMode) {
      setMode(savedMode);
      applyTheme(savedMode);
    } else {
      applyTheme("system");
    }

    // Listen for system theme changes
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      const currentMode = localStorage.getItem("themeMode") as ThemeMode | null;
      if (!currentMode || currentMode === "system") {
        document.documentElement.setAttribute("data-theme", getSystemTheme());
      }
    };
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [applyTheme]);

  const cycleTheme = () => {
    const next: ThemeMode =
      mode === "system" ? "light" : mode === "light" ? "dark" : "system";
    setMode(next);
    localStorage.setItem("themeMode", next);
    applyTheme(next);
  };

  if (!mounted) {
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
        <Monitor size={16} style={{ color: "var(--color-text-tertiary)" }} />
      </button>
    );
  }

  const icon =
    mode === "system" ? (
      <Monitor size={16} />
    ) : mode === "light" ? (
      <Sun size={16} />
    ) : (
      <Moon size={16} />
    );

  const label =
    mode === "system"
      ? "システム設定"
      : mode === "light"
      ? "ライトモード"
      : "ダークモード";

  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={cycleTheme}
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
        color: "var(--color-text-tertiary)",
      }}
      title={label}
    >
      {icon}
    </motion.button>
  );
}
