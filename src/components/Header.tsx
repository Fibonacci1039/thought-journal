import Link from "next/link";

export function Header() {
  return (
    <header style={{ marginBottom: "3rem", paddingTop: "1rem" }}>
      <nav style={{ display: "flex", gap: "1.5rem", alignItems: "baseline" }}>
        <Link
          href="/"
          style={{
            fontSize: "1.2rem",
            fontWeight: 500,
            textDecoration: "none",
          }}
        >
          思考ジャーナル
        </Link>
        <Link
          href="/topics"
          style={{ color: "var(--color-subtle)", fontSize: "0.95rem" }}
        >
          トピック
        </Link>
        <div style={{ flexGrow: 1 }} />
        <Link href="/new" style={{ fontSize: "0.95rem" }}>
          + 新規作成
        </Link>
      </nav>
    </header>
  );
}
