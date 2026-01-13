"use client";

import { useState, useEffect } from "react";
import { getUserProfileAction } from "@/app/actions";
import { JOURNALING_PRESETS, JournalingPreset } from "@/lib/prompts";
import { EntryForm } from "./EntryForm";
import { Topic } from "@/lib/types";
import {
  Copy,
  Check,
  ExternalLink,
  Waves,
  Search,
  Scale,
  Target,
  History,
  Compass,
  Sparkles,
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

type Mode = "SELECT" | "PROMPT_COPIED" | "WRITE";

export function JournalingStarter({ topics }: Props) {
  const [selectedPreset, setSelectedPreset] = useState<JournalingPreset | null>(
    null
  );
  const [mode, setMode] = useState<Mode>("SELECT");
  const [copied, setCopied] = useState(false);
  const [customEntryPrompt, setCustomEntryPrompt] = useState("");

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

  const handleCopyPrompt = async () => {
    if (!selectedPreset) return;
    const fullPrompt = getFullSystemPrompt(selectedPreset);
    await navigator.clipboard.writeText(fullPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    setSelectedPreset(null);
    setMode("SELECT");
    setCopied(false);
  };

  // Mode: SELECT - プリセット選択画面
  if (mode === "SELECT") {
    return (
      <div style={{ maxWidth: "900px", margin: "0 auto" }}>
        {/* Hero Section */}
        <div
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
                onClick={() => {
                  setSelectedPreset(preset);
                  setMode("PROMPT_COPIED");
                }}
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

  // Mode: PROMPT_COPIED - プロンプト表示・コピー画面
  if (mode === "PROMPT_COPIED" && selectedPreset) {
    const colors = PRESET_COLORS[selectedPreset.iconId] || PRESET_COLORS.waves;

    return (
      <div style={{ maxWidth: "700px", margin: "0 auto" }}>
        {/* Header */}
        <div
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

        {/* Progress Steps */}
        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            marginBottom: "2rem",
          }}
        >
          {["プロンプトをコピー", "AIと対話", "結果を保存"].map((step, i) => (
            <div
              key={step}
              style={{
                flex: 1,
                padding: "0.75rem",
                background:
                  i === 0 ? colors.accent : "var(--color-bg-tertiary)",
                borderRadius: "8px",
                textAlign: "center",
                fontSize: "0.8rem",
                fontWeight: 500,
                color: i === 0 ? "#fff" : "var(--color-text-tertiary)",
              }}
            >
              {i + 1}. {step}
            </div>
          ))}
        </div>

        {/* Step 1: Copy Prompt */}
        <div
          style={{
            padding: "1.5rem",
            marginBottom: "1.5rem",
            background: "var(--color-bg-tertiary)",
            borderRadius: "16px",
            border: "1px solid var(--color-border)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1rem",
            }}
          >
            <h3
              style={{
                margin: 0,
                fontSize: "1rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <Sparkles size={18} style={{ color: colors.accent }} />
              AIに渡すプロンプト
            </h3>
            <button
              onClick={handleCopyPrompt}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.6rem 1.2rem",
                background: copied
                  ? "var(--color-accent-secondary)"
                  : colors.accent,
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: "0.9rem",
                transition: "all 0.2s",
              }}
            >
              {copied ? (
                <>
                  <Check size={16} /> コピー完了!
                </>
              ) : (
                <>
                  <Copy size={16} /> コピー
                </>
              )}
            </button>
          </div>
          <textarea
            readOnly
            value={getFullSystemPrompt(selectedPreset)}
            style={{
              width: "100%",
              height: "150px",
              padding: "1rem",
              fontSize: "0.8rem",
              fontFamily: "var(--font-mono)",
              background: "var(--color-bg-primary)",
              color: "var(--color-text-secondary)",
              border: "1px solid var(--color-border)",
              borderRadius: "8px",
              resize: "none",
            }}
          />
        </div>

        {/* Step 2: Use External AI */}
        <div
          style={{
            padding: "1.5rem",
            marginBottom: "1.5rem",
            background: "var(--color-bg-tertiary)",
            borderRadius: "16px",
            border: "1px solid var(--color-border)",
          }}
        >
          <h3 style={{ margin: "0 0 1rem 0", fontSize: "1rem" }}>
            お好みのAIで対話を開始
          </h3>
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            {[
              {
                name: "ChatGPT",
                url: "https://chat.openai.com/",
                color: "#10a37f",
              },
              { name: "Claude", url: "https://claude.ai/", color: "#cc785c" },
              {
                name: "Gemini",
                url: "https://gemini.google.com/",
                color: "#4285f4",
              },
            ].map((ai) => (
              <a
                key={ai.name}
                href={ai.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  padding: "0.6rem 1.2rem",
                  background: "var(--color-bg-primary)",
                  border: `1px solid ${ai.color}40`,
                  borderRadius: "8px",
                  color: ai.color,
                  textDecoration: "none",
                  fontSize: "0.9rem",
                  fontWeight: 500,
                  transition: "all 0.2s",
                }}
              >
                {ai.name} <ExternalLink size={14} />
              </a>
            ))}
          </div>
        </div>

        {/* Step 3: Record Result */}
        <button
          onClick={() => setMode("WRITE")}
          style={{
            width: "100%",
            padding: "1.25rem",
            background: `linear-gradient(135deg, ${colors.accent}, ${colors.accent}cc)`,
            color: "#fff",
            border: "none",
            borderRadius: "12px",
            cursor: "pointer",
            fontSize: "1rem",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
            transition: "all 0.2s",
          }}
        >
          <Edit3 size={18} />
          対話結果を記録する
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
      />
    </div>
  );
}
