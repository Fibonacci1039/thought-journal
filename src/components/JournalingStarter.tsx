"use client";

import { useState, useEffect } from "react";
import {
  generateJournalingDraftAction,
  getUserProfileAction,
  guidedJournalingTurnAction,
} from "@/app/actions";
import { JOURNALING_PRESETS, JournalingPreset } from "@/lib/prompts";
import { EntryForm } from "./EntryForm";
import { Topic } from "@/lib/types";
import {
  Waves,
  Search,
  Scale,
  Target,
  History,
  Compass,
  ArrowRight,
  Edit3,
} from "lucide-react";

type Props = {
  topics: Topic[];
};

// iconIdとLucideアイコンのマッピング
const PRESET_ICONS: Record<string, React.ReactNode> = {
  waves: <Waves size={24} />,
  search: <Search size={24} />,
  scale: <Scale size={24} />,
  target: <Target size={24} />,
  history: <History size={24} />,
  compass: <Compass size={24} />,
};

// カードのグラデーションカラー
const PRESET_COLORS: Record<string, { bg: string; accent: string }> = {
  waves: {
    bg: "linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.05))",
    accent: "#818cf8",
  },
  search: {
    bg: "linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(52, 211, 153, 0.05))",
    accent: "#34d399",
  },
  scale: {
    bg: "linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(251, 191, 36, 0.05))",
    accent: "#fbbf24",
  },
  target: {
    bg: "linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(248, 113, 113, 0.05))",
    accent: "#f87171",
  },
  history: {
    bg: "linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(96, 165, 250, 0.05))",
    accent: "#60a5fa",
  },
  compass: {
    bg: "linear-gradient(135deg, rgba(168, 85, 247, 0.1), rgba(192, 132, 252, 0.05))",
    accent: "#c084fc",
  },
};

type ChatMessage = { role: "user" | "assistant"; content: string };
type DraftEntry = {
  title?: string;
  human_view?: string;
  ai_view?: Record<string, unknown>;
};

type Mode = "SELECT" | "CHAT" | "WRITE";

export function JournalingStarter({ topics }: Props) {
  const [selectedPreset, setSelectedPreset] = useState<JournalingPreset | null>(
    null
  );
  const [mode, setMode] = useState<Mode>("SELECT");
  const [customEntryPrompt, setCustomEntryPrompt] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [readyToCapture, setReadyToCapture] = useState(false);
  const [captureReason, setCaptureReason] = useState("");
  const [draftEntry, setDraftEntry] = useState<DraftEntry | null>(null);

  // Load user preferences for custom entry prompt
  useEffect(() => {
    getUserProfileAction().then((res) => {
      if (res.success && res.data?.preferences) {
        const prefs = res.data.preferences as Record<string, string>;
        if (prefs.entrySummaryPrompt) {
          setCustomEntryPrompt(prefs.entrySummaryPrompt);
        }
      }
    });
  }, []);

  const getFullSystemPrompt = (preset: JournalingPreset) => {
    if (!customEntryPrompt) return preset.systemPrompt;
    return `${preset.systemPrompt}\n\n【追加の出力指示】\n${customEntryPrompt}`;
  };

  const handleReset = () => {
    setSelectedPreset(null);
    setMode("SELECT");
    setChatMessages([]);
    setChatInput("");
    setReadyToCapture(false);
    setCaptureReason("");
    setDraftEntry(null);
  };

  const startGuidedChat = async (preset: JournalingPreset) => {
    setSelectedPreset(preset);
    setChatMessages([
      { role: "assistant", content: preset.starterQuestion },
    ]);
    setReadyToCapture(false);
    setCaptureReason("");
    setMode("CHAT");
  };

  const handleSendChat = async () => {
    if (!selectedPreset || !chatInput.trim() || chatLoading) return;

    const nextMessages: ChatMessage[] = [
      ...chatMessages,
      { role: "user", content: chatInput.trim() },
    ];
    setChatMessages(nextMessages);
    setChatInput("");
    setChatLoading(true);

    const result = await guidedJournalingTurnAction({
      systemPrompt: getFullSystemPrompt(selectedPreset),
      starterQuestion: selectedPreset.starterQuestion,
      messages: nextMessages,
    });

    if (result.success && result.data) {
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: result.data.response },
      ]);
      setReadyToCapture(Boolean(result.data.readyToCapture));
      setCaptureReason(result.data.captureReason || "");
    } else {
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: result.error || "うまく返答できませんでした。",
        },
      ]);
    }

    setChatLoading(false);
  };

  const handleCreateDraft = async () => {
    if (!selectedPreset || chatLoading) return;
    setChatLoading(true);

    const result = await generateJournalingDraftAction({
      systemPrompt: getFullSystemPrompt(selectedPreset),
      messages: chatMessages,
    });

    if (result.success && result.data) {
      setDraftEntry(result.data);
      setMode("WRITE");
    } else {
      alert(result.error || "記録化に失敗しました");
    }

    setChatLoading(false);
  };

  // Mode: SELECT - プリセット選択画面
  if (mode === "SELECT") {
    return (
      <div className="journaling-select-shell" style={{ maxWidth: "900px", margin: "0 auto" }}>
        {/* Hero Section */}
        <div
          className="journaling-select-hero"
          style={{
            textAlign: "center",
            marginBottom: "3rem",
            padding: "2rem 0",
          }}
        >
          <h1
            style={{
              fontSize: "1.75rem",
              marginBottom: "0.75rem",
              background:
                "linear-gradient(135deg, var(--color-accent), var(--color-accent-secondary))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              wordBreak: "keep-all",
              overflowWrap: "break-word",
            }}
          >
            今日の気持ちを
            <br />
            記録しよう
          </h1>
          <p
            style={{
              color: "var(--color-text-tertiary)",
              fontSize: "0.95rem",
              marginBottom: "2rem",
              wordBreak: "keep-all",
              overflowWrap: "break-word",
              maxWidth: "320px",
              margin: "0 auto 2rem",
            }}
          >
            どんな内容でも大丈夫。自由に書いてみましょう。
          </p>

          {/* Quick Start Button - Most Prominent */}
          <button
            onClick={() => {
              setSelectedPreset(null);
              setMode("WRITE");
            }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.75rem",
              padding: "1rem 2.5rem",
              background: "var(--color-accent)",
              color: "#fff",
              border: "none",
              borderRadius: "50px",
              cursor: "pointer",
              fontSize: "1.1rem",
              fontWeight: 600,
              boxShadow: "0 4px 16px rgba(0, 0, 0, 0.15)",
              transition: "all 0.3s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 6px 20px rgba(0, 0, 0, 0.2)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "none";
              e.currentTarget.style.boxShadow =
                "0 4px 16px rgba(0, 0, 0, 0.15)";
            }}
          >
            <Edit3 size={20} />
            今すぐ書き始める
            <ArrowRight size={18} />
          </button>
        </div>

        {/* Divider */}
        <div
          className="journaling-divider"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "1rem",
            marginBottom: "2rem",
            color: "var(--color-text-tertiary)",
          }}
        >
          <div
            style={{
              flex: 1,
              height: "1px",
              background: "var(--color-border)",
            }}
          />
          <span style={{ fontSize: "0.85rem" }}>
            または、テーマを選んで深堀りする
          </span>
          <div
            style={{
              flex: 1,
              height: "1px",
              background: "var(--color-border)",
            }}
          />
        </div>

        {/* Preset Cards */}
        <div
          className="journaling-preset-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: "1rem",
          }}
        >
          {JOURNALING_PRESETS.map((preset) => {
            const colors = PRESET_COLORS[preset.iconId] || PRESET_COLORS.waves;
            return (
              <button
                key={preset.id}
                className="journaling-preset-card"
                onClick={() => startGuidedChat(preset)}
                style={{
                  padding: "1.25rem",
                  background: colors.bg,
                  border: `1px solid transparent`,
                  borderRadius: "16px",
                  textAlign: "left",
                  cursor: "pointer",
                  transition: "all 0.25s ease",
                  position: "relative",
                  overflow: "hidden",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = colors.accent;
                  e.currentTarget.style.transform = "translateY(-3px)";
                  e.currentTarget.style.boxShadow = `0 8px 25px rgba(0,0,0,0.15)`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "transparent";
                  e.currentTarget.style.transform = "none";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                {/* Icon */}
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "12px",
                    background: `${colors.accent}20`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "1rem",
                    color: colors.accent,
                  }}
                >
                  {PRESET_ICONS[preset.iconId] || <Waves size={24} />}
                </div>

                {/* Title */}
                <h3
                  style={{
                    fontSize: "1.05rem",
                    fontWeight: 600,
                    color: "var(--color-text-primary)",
                    marginBottom: "0.5rem",
                  }}
                >
                  {preset.name}
                </h3>

                {/* Short description */}
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.85rem",
                    color: "var(--color-text-tertiary)",
                    lineHeight: 1.5,
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {preset.description}
                </p>

                {/* Arrow indicator */}
                <div
                  style={{
                    position: "absolute",
                    bottom: "1rem",
                    right: "1rem",
                    opacity: 0.5,
                    transition: "opacity 0.2s",
                  }}
                >
                  <ArrowRight size={16} color={colors.accent} />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Mode: CHAT - アプリ内AI対話
  if (mode === "CHAT" && selectedPreset) {
    const colors = PRESET_COLORS[selectedPreset.iconId] || PRESET_COLORS.waves;

    return (
      <div className="guided-chat-shell">
        {/* Header */}
        <div
          className="guided-chat-header"
          style={{
            marginBottom: "2rem",
            display: "flex",
            alignItems: "center",
            gap: "1rem",
          }}
        >
          <button
            onClick={handleReset}
            style={{
              background: "var(--color-bg-tertiary)",
              border: "1px solid var(--color-border)",
              borderRadius: "8px",
              padding: "0.5rem 1rem",
              color: "var(--color-text-secondary)",
              cursor: "pointer",
              fontSize: "0.9rem",
            }}
          >
            ← 戻る
          </button>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <span style={{ color: colors.accent }}>
              {PRESET_ICONS[selectedPreset.iconId] || <Waves size={20} />}
            </span>
            <span
              style={{
                fontSize: "1rem",
                fontWeight: 600,
                color: "var(--color-text-primary)",
              }}
            >
              {selectedPreset.name}
            </span>
          </div>
        </div>

        <div
          className="guided-chat-panel"
          style={{
            padding: "1.5rem",
            marginBottom: "1.5rem",
            background: "var(--color-surface)",
            borderRadius: "16px",
            border: "1px solid var(--color-border)",
            minHeight: "420px",
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
          }}
        >
          <div className="guided-chat-messages">
            {chatMessages.map((message, index) => (
              <div
                key={index}
                className={`guided-chat-bubble ${
                  message.role === "user" ? "is-user" : "is-assistant"
                }`}
                style={{
                  justifySelf:
                    message.role === "user" ? "flex-end" : "flex-start",
                  maxWidth: "82%",
                  padding: "0.85rem 1rem",
                  borderRadius: "14px",
                  border: "1px solid var(--color-border)",
                  background:
                    message.role === "user"
                      ? colors.accent
                      : "var(--color-bg-secondary)",
                  color:
                    message.role === "user"
                      ? "#07121c"
                      : "var(--color-text-primary)",
                  fontSize: "0.9rem",
                  lineHeight: 1.7,
                }}
              >
                {message.content}
              </div>
            ))}
            {chatLoading && (
              <div
                style={{
                  justifySelf: "flex-start",
                  color: "var(--color-text-tertiary)",
                  fontSize: "0.85rem",
                }}
              >
                AIが考えています...
              </div>
            )}
          </div>

          {readyToCapture && (
            <div
              className="guided-capture-card"
              style={{
                border: "1px solid var(--color-border-hover)",
                borderRadius: "var(--radius-md)",
                background: "var(--color-accent-subtle)",
                color: "var(--color-text-primary)",
                padding: "0.875rem 1rem",
                fontSize: "0.875rem",
                lineHeight: 1.6,
              }}
            >
              <strong style={{ color: colors.accent }}>
                ここまでで記録にできそうです。
              </strong>
              {captureReason && (
                <span style={{ color: "var(--color-text-tertiary)" }}>
                  {" "}
                  {captureReason}
                </span>
              )}
            </div>
          )}

          <div style={{ display: "flex", gap: "0.75rem" }}>
            <input
              className="guided-chat-input"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                  handleSendChat();
                }
              }}
              placeholder="感じていることをそのまま書く..."
              disabled={chatLoading}
              style={{
                flex: 1,
                minWidth: 0,
                background: "var(--color-bg-primary)",
                color: "var(--color-text-primary)",
                border: "1px solid var(--color-border)",
                borderRadius: "999px",
                padding: "0.8rem 1rem",
                outline: "none",
              }}
            />
            <button
              className="guided-chat-send"
              onClick={handleSendChat}
              disabled={chatLoading || !chatInput.trim()}
              style={{
                border: "none",
                borderRadius: "999px",
                background: colors.accent,
                color: "#07121c",
                padding: "0 1.25rem",
                fontWeight: 700,
                cursor: chatLoading || !chatInput.trim() ? "default" : "pointer",
                opacity: chatLoading || !chatInput.trim() ? 0.5 : 1,
              }}
            >
              送信
            </button>
          </div>
        </div>

        <button
          className="guided-capture-button"
          onClick={handleCreateDraft}
          disabled={chatLoading || chatMessages.length < 2}
          style={{
            width: "100%",
            padding: "1.25rem",
            background: readyToCapture
              ? colors.accent
              : "var(--color-bg-tertiary)",
            color: "#07121c",
            border: readyToCapture
              ? "none"
              : "1px solid var(--color-border)",
            borderRadius: "12px",
            cursor:
              chatLoading || chatMessages.length < 2 ? "default" : "pointer",
            fontSize: "1rem",
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
            transition: "all 0.2s",
            opacity: chatLoading || chatMessages.length < 2 ? 0.55 : 1,
          }}
        >
          <Edit3 size={18} />
          対話を記録に変換する
          <ArrowRight size={18} />
        </button>
      </div>
    );
  }

  // Mode: WRITE - 記録入力画面
  return (
    <div style={{ maxWidth: "800px", margin: "0 auto" }}>
      {/* Header with back button */}
      <div
        style={{
          marginBottom: "1.5rem",
          display: "flex",
          alignItems: "center",
          gap: "1rem",
        }}
      >
        <button
          onClick={handleReset}
          style={{
            background: "var(--color-bg-tertiary)",
            border: "1px solid var(--color-border)",
            borderRadius: "8px",
            padding: "0.5rem 1rem",
            color: "var(--color-text-secondary)",
            cursor: "pointer",
            fontSize: "0.9rem",
          }}
        >
          ← 戻る
        </button>
        {selectedPreset && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.4rem 0.8rem",
              background: "var(--color-bg-tertiary)",
              borderRadius: "6px",
            }}
          >
            <span
              style={{
                color:
                  PRESET_COLORS[selectedPreset.iconId]?.accent ||
                  "var(--color-accent)",
              }}
            >
              {PRESET_ICONS[selectedPreset.iconId] || <Waves size={16} />}
            </span>
            <span style={{ fontSize: "0.85rem", fontWeight: 500 }}>
              {selectedPreset.name}
            </span>
          </div>
        )}
      </div>

      {/* Entry Form */}
      {/* Entry Form */}
      <EntryForm
        topics={topics}
        presetPrompt={
          selectedPreset ? getFullSystemPrompt(selectedPreset) : undefined
        }
        initialTitle={draftEntry?.title}
        initialNarrative={draftEntry?.human_view}
        initialAiView={draftEntry?.ai_view}
      />
    </div>
  );
}
