"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import {
  BookOpen,
  PenLine,
  Inbox,
  Hash,
  Sparkles,
  Settings,
  Quote,
  LogOut,
} from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { createBrowserClient } from "@/lib/supabase/client";

const NAV_ITEMS = [
  { label: "タイムライン", href: "/", icon: <BookOpen size={18} /> },
  { label: "記録", href: "/new", icon: <PenLine size={18} /> },
  { label: "引用", href: "/quote", icon: <Quote size={18} /> },
  { label: "週次レビュー", href: "/weekly", icon: <Inbox size={18} /> },
  { label: "トピック", href: "/topics", icon: <Hash size={18} /> },
  { label: "Personal AI", href: "/personal-ai", icon: <Sparkles size={18} /> },
  { label: "設定", href: "/settings", icon: <Settings size={18} /> },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createBrowserClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <aside className="sidebar">
      {/* App Title / Brand */}
      <div className="sidebar-header">
        <h1
          className="sidebar-title"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0rem",
            textDecoration: "none",
          }}
        >
          {/* Mind OS Logo - Light mode */}
          <Image
            src="/logo-v3.png"
            alt="Mind OS"
            width={34}
            height={34}
            className="logo-light"
            style={{
              flexShrink: 0,
            }}
          />
          {/* Mind OS Logo - Dark mode */}
          <Image
            src="/logo-dark.png"
            alt="Mind OS"
            width={34}
            height={34}
            className="logo-dark"
            style={{
              flexShrink: 0,
            }}
          />
          {/* Brand Name */}
          <span
            style={{
              fontFamily: "var(--font-inter)",
              fontSize: "1.1rem",
              fontWeight: 600,
              letterSpacing: "0.05em",
              color: "var(--color-text-primary)",
            }}
          >
            Mind OS
          </span>
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

      {/* Footer with Theme Toggle & Logout */}
      <div
        style={{
          marginTop: "auto",
          paddingTop: "1rem",
          borderTop: "1px solid var(--color-border)",
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem",
        }}
      >
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
            テーマ
          </span>
          <ThemeToggle />
        </div>

        <button
          onClick={handleLogout}
          className="nav-item"
          style={{
            width: "100%",
            border: "none",
            background: "transparent",
            cursor: "pointer",
            color: "var(--color-text-secondary)",
            justifyContent: "flex-start",
            paddingLeft: "0.75rem",
          }}
        >
          <span className="nav-icon">
            <LogOut size={18} />
          </span>
          <span className="nav-label">ログアウト</span>
        </button>
      </div>
    </aside>
  );
}
