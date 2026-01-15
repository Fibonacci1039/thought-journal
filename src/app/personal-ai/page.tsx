import { ChatInterface } from "@/components/ChatInterface";
import { Sparkles } from "lucide-react";

export default function RecallPage() {
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <header
        style={{
          padding: "1rem 2rem",
          borderBottom: "1px solid var(--color-border)",
          background: "var(--color-bg-primary)",
        }}
      >
        <h1
          style={{
            fontSize: "1.2rem",
            fontWeight: 700,
            margin: 0,
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <Sparkles size={20} className="text-purple-400" /> Personal AI
        </h1>
      </header>
      <main
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          minHeight: 0,
        }}
      >
        <ChatInterface />
      </main>
    </div>
  );
}
