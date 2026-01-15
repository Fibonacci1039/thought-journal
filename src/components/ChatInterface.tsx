"use client";

import { useState, useRef, useEffect } from "react";
import {
  Send,
  User,
  Loader2,
  BookOpen,
  Sparkles,
  Brain,
  Heart,
  Lightbulb,
  Clock,
} from "lucide-react";

type Source = { title?: string };
import { chatWithPastAction } from "@/app/actions";
import { checkUsageLimit } from "@/lib/usage";
import { UsageCheckResult } from "@/lib/usage-types";
import { UsageLimitModal } from "./UsageLimitModal";
import { UsageIndicator } from "./UsageIndicator";

// サンプル質問（短めのテキストでモバイル表示を最適化）
const SAMPLE_QUESTIONS = [
  {
    icon: <Brain size={16} />,
    text: "最近の悩みは？",
    color: "#8b5cf6",
  },
  {
    icon: <Heart size={16} />,
    text: "嬉しかった出来事",
    color: "#ec4899",
  },
  {
    icon: <Lightbulb size={16} />,
    text: "良いアイデア",
    color: "#f59e0b",
  },
  {
    icon: <Clock size={16} />,
    text: "1ヶ月前の自分",
    color: "#10b981",
  },
];

export function ChatInterface() {
  const [messages, setMessages] = useState<
    { role: "user" | "bot"; text: string; sources?: Source[] }[]
  >([]);
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

  const handleSend = async (messageText?: string) => {
    const textToSend = messageText || input;
    if (!textToSend.trim() || loading) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: textToSend }]);
    setLoading(true);

    try {
      const result = await chatWithPastAction(textToSend);
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
          {
            role: "bot",
            text:
              result.error ||
              "すみません、うまく思い出せませんでした。（エラー詳細はコンソールを確認してください）",
          },
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

  const isNewConversation = messages.length === 0;

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
          padding: "1.5rem",
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
        }}
      >
        {/* Welcome State - Show when no messages */}
        {isNewConversation && (
          <div
            className="responsive-p-2rem"
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              textAlign: "center",
            }}
          >
            {/* AI Avatar */}
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #8b5cf6, #ec4899)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "1.5rem",
                boxShadow: "0 8px 32px rgba(139, 92, 246, 0.3)",
              }}
            >
              <Sparkles size={36} color="#fff" />
            </div>

            <h2
              style={{
                fontSize: "1.5rem",
                fontWeight: 600,
                marginBottom: "0.5rem",
                background: "linear-gradient(135deg, #8b5cf6, #ec4899)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              パーソナルAI
            </h2>

            <p
              style={{
                color: "var(--color-text-tertiary)",
                fontSize: "0.9rem",
                marginBottom: "2rem",
                maxWidth: "280px",
                lineHeight: 1.7,
                wordBreak: "keep-all",
                overflowWrap: "break-word",
              }}
            >
              過去の記録をもとに思考整理をお手伝いします
            </p>

            {/* Sample Questions */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "0.75rem",
                justifyContent: "center",
                maxWidth: "500px",
              }}
            >
              {SAMPLE_QUESTIONS.map((q, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(q.text)}
                  disabled={loading || (usage?.remaining ?? 1) <= 0}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    padding: "0.75rem 1rem",
                    background: `${q.color}15`,
                    border: `1px solid ${q.color}30`,
                    borderRadius: "24px",
                    color: q.color,
                    fontSize: "0.9rem",
                    cursor:
                      loading || (usage?.remaining ?? 1) <= 0
                        ? "not-allowed"
                        : "pointer",
                    transition: "all 0.2s",
                    opacity: loading || (usage?.remaining ?? 1) <= 0 ? 0.5 : 1,
                  }}
                  onMouseEnter={(e) => {
                    if (!loading && (usage?.remaining ?? 1) > 0) {
                      e.currentTarget.style.background = `${q.color}25`;
                      e.currentTarget.style.transform = "translateY(-2px)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = `${q.color}15`;
                    e.currentTarget.style.transform = "none";
                  }}
                >
                  {q.icon}
                  {q.text}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Chat Messages */}
        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
              gap: "0.75rem",
            }}
          >
            {msg.role === "bot" && (
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #8b5cf6, #ec4899)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Sparkles size={18} color="#fff" />
              </div>
            )}

            <div style={{ maxWidth: "75%" }}>
              <div
                style={{
                  padding: "1rem 1.25rem",
                  borderRadius: "20px",
                  background:
                    msg.role === "user"
                      ? "linear-gradient(135deg, var(--color-accent), #f59e0b)"
                      : "var(--color-bg-secondary)",
                  color:
                    msg.role === "user" ? "#fff" : "var(--color-text-primary)",
                  lineHeight: 1.7,
                  borderTopLeftRadius: msg.role === "bot" ? "6px" : "20px",
                  borderTopRightRadius: msg.role === "user" ? "6px" : "20px",
                  boxShadow:
                    msg.role === "user"
                      ? "0 4px 15px rgba(251, 146, 60, 0.2)"
                      : "0 2px 8px rgba(0,0,0,0.05)",
                }}
              >
                {msg.text}
              </div>

              {/* Sources Citation */}
              {msg.sources && msg.sources.length > 0 && (
                <div
                  style={{
                    marginTop: "0.75rem",
                    padding: "0.75rem",
                    background: "var(--color-bg-tertiary)",
                    borderRadius: "12px",
                    fontSize: "0.8rem",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      marginBottom: "0.5rem",
                      color: "var(--color-text-tertiary)",
                    }}
                  >
                    <BookOpen size={14} />
                    <span>参照した記録</span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: "8px",
                      flexWrap: "wrap",
                    }}
                  >
                    {msg.sources.map((s: Source, idx) => (
                      <div
                        key={idx}
                        style={{
                          background: "var(--color-bg-primary)",
                          padding: "6px 10px",
                          borderRadius: "6px",
                          color: "var(--color-text-secondary)",
                          maxWidth: "180px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          border: "1px solid var(--color-border)",
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
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: "var(--color-bg-tertiary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  border: "1px solid var(--color-border)",
                }}
              >
                <User size={18} color="var(--color-text-secondary)" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div
            style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #8b5cf6, #ec4899)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Sparkles size={18} color="#fff" />
            </div>
            <div
              style={{
                padding: "1rem 1.25rem",
                background: "var(--color-bg-secondary)",
                borderRadius: "20px",
                borderTopLeftRadius: "6px",
              }}
            >
              <Loader2
                className="animate-spin"
                size={18}
                color="var(--color-text-tertiary)"
              />
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div style={{ padding: "1rem 1.5rem 1.5rem" }}>
        {/* Usage Indicator */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginBottom: "0.75rem",
          }}
        >
          <UsageIndicator featureType="rag_chat" usage={usage} />
        </div>

        <div
          style={{
            display: "flex",
            background: "var(--color-bg-secondary)",
            borderRadius: "28px",
            padding: "6px",
            border: "1px solid var(--color-border)",
            boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
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
                : "過去の自分に聞いてみよう..."
            }
            disabled={(usage?.remaining ?? 1) <= 0}
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              padding: "0.75rem 1rem",
              fontSize: "1rem",
              outline: "none",
              color: "var(--color-text-primary)",
            }}
          />
          <button
            onClick={() => handleSend()}
            disabled={loading || (usage?.remaining ?? 1) <= 0 || !input.trim()}
            style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              background:
                loading || (usage?.remaining ?? 1) <= 0 || !input.trim()
                  ? "var(--color-bg-tertiary)"
                  : "linear-gradient(135deg, var(--color-accent), #f59e0b)",
              border: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor:
                loading || (usage?.remaining ?? 1) <= 0 || !input.trim()
                  ? "not-allowed"
                  : "pointer",
              transition: "all 0.2s",
              boxShadow:
                loading || (usage?.remaining ?? 1) <= 0 || !input.trim()
                  ? "none"
                  : "0 4px 15px rgba(251, 146, 60, 0.3)",
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
