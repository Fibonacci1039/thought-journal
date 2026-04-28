"use client";

import { useEffect, useRef, useState } from "react";
import {
  BookOpen,
  Brain,
  Check,
  Clock,
  Heart,
  Lightbulb,
  Loader2,
  Save,
  Send,
  Sparkles,
  User,
} from "lucide-react";
import { chatWithPastAction, createEntryFromChatAction } from "@/app/actions";
import { checkUsageLimit } from "@/lib/usage";
import { UsageCheckResult } from "@/lib/usage-types";
import { UsageIndicator } from "./UsageIndicator";
import { UsageLimitModal } from "./UsageLimitModal";

type Source = { id?: string; title?: string; created_at?: string };
type Message = { role: "user" | "bot"; text: string; sources?: Source[] };

const SAMPLE_QUESTIONS = [
  { icon: <Brain size={16} />, text: "最近の悩みを整理したい" },
  { icon: <Heart size={16} />, text: "今の気持ちを言葉にしたい" },
  { icon: <Lightbulb size={16} />, text: "繰り返している悩みは？" },
  { icon: <Clock size={16} />, text: "次に書く問いを出して" },
];

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [savingIndex, setSavingIndex] = useState<number | null>(null);
  const [savedIndexes, setSavedIndexes] = useState<Set<number>>(new Set());
  const [usage, setUsage] = useState<UsageCheckResult | null>(null);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkUsageLimit("rag_chat").then(setUsage);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

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
        if (result.usage) setUsage(result.usage);
      } else if (result.error === "USAGE_LIMIT_EXCEEDED") {
        if (result.usage) setUsage(result.usage);
        setShowLimitModal(true);
        setMessages((prev) => prev.slice(0, -1));
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "bot",
            text:
              result.error ||
              "すみません、うまく思い出せませんでした。もう一度聞いてください。",
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

  const findQuestionForBotMessage = (botIndex: number) => {
    for (let i = botIndex - 1; i >= 0; i--) {
      if (messages[i]?.role === "user") return messages[i].text;
    }
    return "";
  };

  const handleSaveDialogue = async (botIndex: number) => {
    const botMessage = messages[botIndex];
    if (!botMessage || botMessage.role !== "bot" || savingIndex !== null) {
      return;
    }

    const question = findQuestionForBotMessage(botIndex);
    if (!question) return;

    setSavingIndex(botIndex);
    try {
      const result = await createEntryFromChatAction({
        question,
        response: botMessage.text,
        sources: botMessage.sources,
      });

      if (result.success) {
        setSavedIndexes((prev) => new Set(prev).add(botIndex));
      } else {
        alert(result.error || "保存に失敗しました");
      }
    } catch {
      alert("保存に失敗しました");
    } finally {
      setSavingIndex(null);
    }
  };

  const disabled = loading || (usage?.remaining ?? 1) <= 0;
  const isNewConversation = messages.length === 0;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        maxWidth: "820px",
        margin: "0 auto",
      }}
    >
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
        {isNewConversation && (
          <div
            className="responsive-p-2rem"
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "100%",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: "50%",
                background: "var(--color-accent)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "1.5rem",
              }}
            >
              <Sparkles size={36} color="#07121c" />
            </div>

            <h2
              style={{
                fontSize: "1.5rem",
                fontWeight: 700,
                marginBottom: "0.5rem",
                color: "var(--color-text-primary)",
              }}
            >
              Personal AI
            </h2>

            <p
              style={{
                color: "var(--color-text-tertiary)",
                fontSize: "0.9rem",
                marginBottom: "2rem",
                maxWidth: "340px",
                lineHeight: 1.7,
              }}
            >
              対話で悩みをほどき、必要な気づきを記録として蓄積します。
            </p>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "0.75rem",
                justifyContent: "center",
                maxWidth: "560px",
              }}
            >
              {SAMPLE_QUESTIONS.map((question, index) => (
                <button
                  key={index}
                  onClick={() => handleSend(question.text)}
                  disabled={disabled}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    padding: "0.75rem 1rem",
                    background: "var(--color-accent-subtle)",
                    border: "1px solid var(--color-border-hover)",
                    borderRadius: "999px",
                    color: "var(--color-accent)",
                    fontSize: "0.9rem",
                    cursor: disabled ? "not-allowed" : "pointer",
                    opacity: disabled ? 0.5 : 1,
                  }}
                >
                  {question.icon}
                  {question.text}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={index}
            style={{
              display: "flex",
              justifyContent:
                message.role === "user" ? "flex-end" : "flex-start",
              gap: "0.75rem",
            }}
          >
            {message.role === "bot" && (
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: "var(--color-accent)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Sparkles size={18} color="#07121c" />
              </div>
            )}

            <div style={{ maxWidth: "75%" }}>
              <div
                style={{
                  padding: "1rem 1.25rem",
                  borderRadius: "20px",
                  background:
                    message.role === "user"
                      ? "var(--color-accent)"
                      : "var(--color-bg-secondary)",
                  color:
                    message.role === "user"
                      ? "#07121c"
                      : "var(--color-text-primary)",
                  lineHeight: 1.7,
                  borderTopLeftRadius:
                    message.role === "bot" ? "6px" : "20px",
                  borderTopRightRadius:
                    message.role === "user" ? "6px" : "20px",
                  border: "1px solid var(--color-border)",
                }}
              >
                {message.text}
              </div>

              {message.sources && message.sources.length > 0 && (
                <div
                  style={{
                    marginTop: "0.75rem",
                    padding: "0.75rem",
                    background: "var(--color-bg-tertiary)",
                    borderRadius: "var(--radius-md)",
                    fontSize: "0.8rem",
                    border: "1px solid var(--color-border)",
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
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    {message.sources.map((source, sourceIndex) => (
                      <div
                        key={sourceIndex}
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
                        {source.title || "無題の記録"}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {message.role === "bot" && (
                <button
                  onClick={() => handleSaveDialogue(index)}
                  disabled={savingIndex !== null || savedIndexes.has(index)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.375rem",
                    marginTop: "0.75rem",
                    border: "1px solid var(--color-border)",
                    background: savedIndexes.has(index)
                      ? "var(--color-accent-subtle)"
                      : "transparent",
                    color: savedIndexes.has(index)
                      ? "var(--color-accent)"
                      : "var(--color-text-tertiary)",
                    borderRadius: "var(--radius-md)",
                    padding: "0.45rem 0.7rem",
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    cursor:
                      savingIndex !== null || savedIndexes.has(index)
                        ? "default"
                        : "pointer",
                  }}
                >
                  {savedIndexes.has(index) ? (
                    <Check size={14} />
                  ) : savingIndex === index ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Save size={14} />
                  )}
                  {savedIndexes.has(index) ? "記録済み" : "この対話を記録"}
                </button>
              )}
            </div>

            {message.role === "user" && (
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
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: "var(--color-accent)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Sparkles size={18} color="#07121c" />
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

      <div style={{ padding: "1rem 1.5rem 1.5rem" }}>
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
                : "今の悩みや考えを話す..."
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
            disabled={disabled || !input.trim()}
            style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              background:
                disabled || !input.trim()
                  ? "var(--color-bg-tertiary)"
                  : "var(--color-accent)",
              border: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: disabled || !input.trim() ? "not-allowed" : "pointer",
            }}
          >
            <Send size={18} color="#07121c" />
          </button>
        </div>
      </div>

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
