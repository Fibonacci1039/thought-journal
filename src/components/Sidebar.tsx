"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  PenLine,
  Inbox,
  Hash,
  Sparkles,
  Settings,
  Quote,
} from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

const NAV_ITEMS = [
  { label: "タイムライン", href: "/", icon: <BookOpen size={18} /> },
  { label: "記録", href: "/new", icon: <PenLine size={18} /> },
  { label: "引用", href: "/quote", icon: <Quote size={18} /> },
  { label: "週次レビュー", href: "/weekly", icon: <Inbox size={18} /> },
  { label: "トピック", href: "/topics", icon: <Hash size={18} /> },
  { label: "Recall", href: "/recall", icon: <Sparkles size={18} /> },
  { label: "設定", href: "/settings", icon: <Settings size={18} /> },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      {/* App Title / Brand */}
      <div className="sidebar-header">
        <h1
          className="sidebar-title"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "1.25rem",
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <span style={{ fontSize: "1.5rem" }}>📓</span>
          Thought Journal
        </h1>
        <p
          style={{
            fontSize: "0.75rem",
            color: "var(--color-text-tertiary)",
            marginTop: "0.25rem",
          }}
        >
          思考を整理する
        </p>
      </div>

      {/* Navigation List */}
      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item ${isActive ? "active" : ""}`}
            >
              <span className={`nav-icon ${isActive ? "text-accent" : ""}`}>
                {item.icon}
              </span>
              <span className="nav-label">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer with Theme Toggle */}
      <div
        style={{
          marginTop: "auto",
          paddingTop: "1rem",
          borderTop: "1px solid var(--color-border)",
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
          テーマ
        </span>
        <ThemeToggle />
      </div>
    </aside>
  );
}
