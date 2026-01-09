"use client";

import { useState, useRef, useEffect } from "react";
import { Send, User, Loader2, BookOpen, Sparkles } from "lucide-react";
import { chatWithPastAction } from "@/app/actions";
import { checkUsageLimit } from "@/lib/usage";
import { UsageCheckResult } from "@/lib/usage-types";
import { UsageLimitModal } from "./UsageLimitModal";
import { UsageIndicator } from "./UsageIndicator";

export function ChatInterface() {
  const [messages, setMessages] = useState<
    { role: "user" | "bot"; text: string; sources?: any[] }[]
  >([
    {
      role: "bot",
      text: "こんにちは。過去の記録に基づいて、あなたの思考整理をお手伝いします。何か聞いてみてください。",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [usage, setUsage] = useState<UsageCheckResult | null>(null);
  const [showLimitModal, setShowLimitModal] = useState(false);

  // Fetch usage on mount
  useEffect(() => {
    checkUsageLimit("rag_chat").then(setUsage);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg = input;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: userMsg }]);
    setLoading(true);

    try {
      const result = await chatWithPastAction(userMsg);
      if (result.success && result.data) {
        setMessages((prev) => [
          ...prev,
          {
            role: "bot",
            text: result.data.response,
            sources: result.data.sources,
          },
        ]);
        // Update usage from response
        if (result.usage) {
          setUsage(result.usage);
        }
      } else if (result.error === "USAGE_LIMIT_EXCEEDED") {
        // Show limit modal and remove the user message
        if (result.usage) setUsage(result.usage);
        setShowLimitModal(true);
        setMessages((prev) => prev.slice(0, -1)); // Remove last user message
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "bot", text: "すみません、うまく思い出せませんでした。" },
        ]);
      }
    } catch (e) {
      console.error(e);
      setMessages((prev) => [
        ...prev,
        { role: "bot", text: "エラーが発生しました。" },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        maxWidth: "800px",
        margin: "0 auto",
      }}
    >
      {/* Messages Area */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "1rem",
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
        }}
      >
        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
              gap: "0.5rem",
            }}
          >
            {msg.role === "bot" && (
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: "var(--color-bg-tertiary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Sparkles size={18} className="text-purple-400" />
              </div>
            )}

            <div style={{ maxWidth: "80%" }}>
              <div
                style={{
                  padding: "1rem",
                  borderRadius: "16px",
                  background:
                    msg.role === "user"
                      ? "var(--color-accent-primary)"
                      : "var(--color-bg-secondary)",
                  color:
                    msg.role === "user" ? "#fff" : "var(--color-text-primary)",
                  lineHeight: 1.6,
                  borderTopLeftRadius: msg.role === "bot" ? "4px" : "16px",
                  borderTopRightRadius: msg.role === "user" ? "4px" : "16px",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                }}
              >
                {msg.text}
              </div>

              {/* Sources Citation */}
              {msg.sources && msg.sources.length > 0 && (
                <div
                  style={{
                    marginTop: "0.5rem",
                    fontSize: "0.8rem",
                    color: "var(--color-text-tertiary)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      marginBottom: "4px",
                    }}
                  >
                    <BookOpen size={12} />
                    <span>参考にした記録:</span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: "8px",
                      overflowX: "auto",
                      paddingBottom: "4px",
                    }}
                  >
                    {msg.sources.map((s: any, idx) => (
                      <div
                        key={idx}
                        style={{
                          background: "var(--color-bg-tertiary)",
                          padding: "4px 8px",
                          borderRadius: "4px",
                          whiteSpace: "nowrap",
                          maxWidth: "150px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {s.title || "無題の記録"}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {msg.role === "user" && (
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: "#444",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <User size={18} color="#fff" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div style={{ display: "flex", gap: "0.5rem", paddingLeft: "3rem" }}>
            <Loader2
              className="animate-spin"
              size={20}
              color="var(--color-text-tertiary)"
            />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div style={{ padding: "1rem" }}>
        {/* Usage Indicator */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginBottom: "0.5rem",
          }}
        >
          <UsageIndicator featureType="rag_chat" usage={usage} />
        </div>
        <div
          style={{
            display: "flex",
            background: "var(--color-bg-secondary)",
            borderRadius: "30px",
            padding: "8px",
            border: "1px solid var(--color-border)",
            boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
          }}
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) =>
              e.key === "Enter" && !e.nativeEvent.isComposing && handleSend()
            }
            placeholder={
              (usage?.remaining ?? 1) <= 0
                ? "今月の利用上限に達しました"
                : "最近の悩みは？ / あの時どう思ってたっけ？"
            }
            disabled={(usage?.remaining ?? 1) <= 0}
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              padding: "0 1rem",
              fontSize: "1rem",
              outline: "none",
              color: "var(--color-text-primary)",
            }}
          />
          <button
            onClick={handleSend}
            disabled={loading || (usage?.remaining ?? 1) <= 0}
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              background:
                loading || (usage?.remaining ?? 1) <= 0
                  ? "var(--color-bg-tertiary)"
                  : "var(--color-accent-primary)",
              border: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor:
                loading || (usage?.remaining ?? 1) <= 0
                  ? "not-allowed"
                  : "pointer",
              transition: "all 0.2s",
            }}
          >
            <Send size={18} color="#fff" />
          </button>
        </div>
      </div>

      {/* Usage Limit Modal */}
      {usage && (
        <UsageLimitModal
          isOpen={showLimitModal}
          onClose={() => setShowLimitModal(false)}
          featureType="rag_chat"
          usage={usage}
        />
      )}
    </div>
  );
}
