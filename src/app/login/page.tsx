import { login, signup } from "./actions";

export default async function LoginPage(props: {
  searchParams: Promise<{ message?: string; error?: string }>;
}) {
  const searchParams = await props.searchParams;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        background: "var(--color-bg-primary)",
        color: "var(--color-text-primary)",
        padding: "1rem",
      }}
    >
      <form
        style={{
          width: "100%",
          maxWidth: "400px",
          background: "var(--color-bg-secondary)",
          padding: "2rem",
          borderRadius: "16px",
          border: "1px solid var(--color-border)",
          boxShadow: "var(--shadow-card)",
          display: "flex",
          flexDirection: "column",
          gap: "1.5rem",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "1rem" }}>
          <h1
            style={{
              fontSize: "1.5rem",
              fontWeight: 700,
              letterSpacing: "0.05em",
              marginBottom: "0.5rem",
            }}
          >
            Mind OS
          </h1>
          <p
            style={{
              fontSize: "0.9rem",
              color: "var(--color-text-secondary)",
            }}
          >
            Sign in to your operating system
          </p>
        </div>

        <div>
          <label
            htmlFor="email"
            style={{
              display: "block",
              fontSize: "0.85rem",
              fontWeight: 600,
              color: "var(--color-text-secondary)",
              marginBottom: "0.5rem",
            }}
          >
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder="you@example.com"
            style={{
              width: "100%",
              padding: "0.75rem",
              borderRadius: "8px",
              border: "1px solid var(--color-border)",
              background: "var(--color-bg-tertiary)",
              color: "var(--color-text-primary)",
              fontSize: "1rem",
            }}
          />
        </div>

        <div>
          <label
            htmlFor="password"
            style={{
              display: "block",
              fontSize: "0.85rem",
              fontWeight: 600,
              color: "var(--color-text-secondary)",
              marginBottom: "0.5rem",
            }}
          >
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            placeholder="••••••••"
            style={{
              width: "100%",
              padding: "0.75rem",
              borderRadius: "8px",
              border: "1px solid var(--color-border)",
              background: "var(--color-bg-tertiary)",
              color: "var(--color-text-primary)",
              fontSize: "1rem",
            }}
          />
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
            marginTop: "0.5rem",
          }}
        >
          <button
            formAction={login}
            style={{
              padding: "0.75rem",
              background: "var(--color-accent)",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontSize: "0.95rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Log in
          </button>
          <button
            formAction={signup}
            style={{
              padding: "0.75rem",
              background: "transparent",
              color: "var(--color-text-secondary)",
              border: "1px solid var(--color-border)",
              borderRadius: "8px",
              fontSize: "0.95rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Sign up
          </button>
        </div>

        {searchParams?.error && (
          <div
            style={{
              padding: "0.75rem",
              background: "rgba(239, 68, 68, 0.1)",
              border: "1px solid rgba(239, 68, 68, 0.2)",
              borderRadius: "8px",
              color: "#ef4444",
              fontSize: "0.85rem",
              textAlign: "center",
            }}
          >
            {searchParams.error}
          </div>
        )}

        {searchParams?.message && (
          <div
            style={{
              padding: "0.75rem",
              background: "rgba(16, 185, 129, 0.1)",
              border: "1px solid rgba(16, 185, 129, 0.2)",
              borderRadius: "8px",
              color: "#10b981",
              fontSize: "0.85rem",
              textAlign: "center",
            }}
          >
            {searchParams.message}
          </div>
        )}
      </form>
    </div>
  );
}
