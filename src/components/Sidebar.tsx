"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, PenLine, Inbox, Hash, Network } from "lucide-react";

const NAV_ITEMS = [
  { label: "タイムライン", href: "/", icon: <BookOpen size={18} /> },
  { label: "記録", href: "/new", icon: <PenLine size={18} /> },
  { label: "週次レビュー", href: "/weekly", icon: <Inbox size={18} /> },
  { label: "トピック", href: "/topics", icon: <Hash size={18} /> },
  { label: "マインドマップ", href: "/graph", icon: <Network size={18} /> },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      {/* App Title / Brand */}
      <div className="sidebar-header">
        <h1 className="sidebar-title">Journal</h1>
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

      {/* Bottom Actions (Settings, etc. - Placeholder) */}
      <div className="sidebar-footer">
        {/* Potentially user profile or settings here */}
      </div>
    </aside>
  );
}
