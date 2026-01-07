"use client";

import { useState } from "react";
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
} from "lucide-react";

type Props = {
  topics: Topic[];
};

// iconIdとLucideアイコンのマッピング
const PRESET_ICONS: Record<string, React.ReactNode> = {
  waves: <Waves size={20} />,
  search: <Search size={20} />,
  scale: <Scale size={20} />,
  target: <Target size={20} />,
  history: <History size={20} />,
  compass: <Compass size={20} />,
};

type Mode = "SELECT" | "PROMPT_COPIED" | "WRITE";

export function JournalingStarter({ topics }: Props) {
  const [selectedPreset, setSelectedPreset] = useState<JournalingPreset | null>(
    null
  );
  const [mode, setMode] = useState<Mode>("SELECT");
  const [copied, setCopied] = useState(false);

  const handleCopyPrompt = async () => {
    if (!selectedPreset) return;
    await navigator.clipboard.writeText(selectedPreset.systemPrompt);
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
      <div>
        <h1 style={{ marginBottom: "0.5rem" }}>ジャーナリングを始める</h1>
        <p
          style={{
            color: "var(--color-text-tertiary)",
            marginBottom: "2rem",
            fontSize: "0.95rem",
          }}
        >
          今日はどんなモードで対話しますか？
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "1rem",
          }}
        >
          {JOURNALING_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => {
                setSelectedPreset(preset);
                setMode("PROMPT_COPIED");
              }}
              style={{
                padding: "1.5rem",
                background: "var(--color-bg-tertiary)",
                border: "1px solid var(--color-border)",
                borderRadius: "12px",
                textAlign: "left",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--color-accent)";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--color-border)";
                e.currentTarget.style.transform = "none";
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  marginBottom: "0.75rem",
                }}
              >
                <span
                  style={{
                    color: "var(--color-accent)",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  {PRESET_ICONS[preset.iconId] || <Waves size={20} />}
                </span>
                <span
                  style={{
                    fontSize: "1.1rem",
                    fontWeight: 600,
                    color: "var(--color-text-primary)",
                  }}
                >
                  {preset.name}
                </span>
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: "0.9rem",
                  color: "var(--color-text-tertiary)",
                  lineHeight: 1.5,
                }}
              >
                {preset.description}
              </p>
            </button>
          ))}
        </div>

        {/* Quick start option */}
        <div
          style={{
            marginTop: "2rem",
            paddingTop: "2rem",
            borderTop: "1px solid var(--color-border)",
            textAlign: "center",
          }}
        >
          <button
            onClick={() => {
              setSelectedPreset(null);
              setMode("WRITE");
            }}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--color-text-tertiary)",
              fontSize: "0.9rem",
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            プロンプトなしで直接書き始める
          </button>
        </div>
      </div>
    );
  }

  // Mode: PROMPT_COPIED - プロンプト表示・コピー画面
  if (mode === "PROMPT_COPIED" && selectedPreset) {
    return (
      <div>
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
            ← 別のモードを選ぶ
          </button>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              color: "var(--color-text-tertiary)",
            }}
          >
            <span
              style={{
                color: "var(--color-accent)",
                display: "flex",
                alignItems: "center",
              }}
            >
              {PRESET_ICONS[selectedPreset.iconId] || <Waves size={18} />}
            </span>
            <span style={{ fontSize: "0.9rem", fontWeight: 600 }}>
              {selectedPreset.name}
            </span>
          </div>
        </div>

        {/* Step 1: Copy Prompt */}
        <div
          style={{
            padding: "1.5rem",
            marginBottom: "1.5rem",
            background: "var(--color-bg-tertiary)",
            borderRadius: "12px",
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
            <h3 style={{ margin: 0, fontSize: "1rem" }}>
              ① AIに渡すプロンプト
            </h3>
            <button
              onClick={handleCopyPrompt}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.5rem 1rem",
                background: copied
                  ? "var(--color-accent-secondary)"
                  : "var(--color-accent)",
                color: copied ? "#000" : "#fff",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: "0.9rem",
              }}
            >
              {copied ? (
                <>
                  <Check size={16} /> コピーしました
                </>
              ) : (
                <>
                  <Copy size={16} /> プロンプトをコピー
                </>
              )}
            </button>
          </div>
          <textarea
            readOnly
            value={selectedPreset.systemPrompt}
            style={{
              width: "100%",
              height: "200px",
              padding: "1rem",
              fontSize: "0.85rem",
              fontFamily: "var(--font-mono)",
              background: "var(--color-bg-primary)",
              color: "var(--color-text-primary)",
              border: "1px solid var(--color-border)",
              borderRadius: "8px",
              resize: "vertical",
            }}
          />
        </div>

        {/* Step 2: Use External AI */}
        <div
          style={{
            padding: "1.5rem",
            marginBottom: "1.5rem",
            background: "var(--color-bg-tertiary)",
            borderRadius: "12px",
            border: "1px solid var(--color-border)",
          }}
        >
          <h3 style={{ margin: "0 0 1rem 0", fontSize: "1rem" }}>
            ② 外部AIで対話する
          </h3>
          <p
            style={{
              fontSize: "0.9rem",
              color: "var(--color-text-secondary)",
              marginBottom: "1rem",
              lineHeight: 1.6,
            }}
          >
            上のプロンプトをコピーして、お好みのAIに貼り付けて対話を始めてください。
            対話が終わったら「出力して」と言って、結果を受け取ってください。
          </p>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <a
              href="https://chat.openai.com/"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.3rem",
                padding: "0.5rem 1rem",
                background: "var(--color-bg-primary)",
                border: "1px solid var(--color-border)",
                borderRadius: "8px",
                color: "var(--color-text-secondary)",
                textDecoration: "none",
                fontSize: "0.85rem",
              }}
            >
              ChatGPT <ExternalLink size={14} />
            </a>
            <a
              href="https://claude.ai/"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.3rem",
                padding: "0.5rem 1rem",
                background: "var(--color-bg-primary)",
                border: "1px solid var(--color-border)",
                borderRadius: "8px",
                color: "var(--color-text-secondary)",
                textDecoration: "none",
                fontSize: "0.85rem",
              }}
            >
              Claude <ExternalLink size={14} />
            </a>
            <a
              href="https://gemini.google.com/"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.3rem",
                padding: "0.5rem 1rem",
                background: "var(--color-bg-primary)",
                border: "1px solid var(--color-border)",
                borderRadius: "8px",
                color: "var(--color-text-secondary)",
                textDecoration: "none",
                fontSize: "0.85rem",
              }}
            >
              Gemini <ExternalLink size={14} />
            </a>
          </div>
        </div>

        {/* Step 3: Record Result */}
        <div
          style={{
            padding: "1.5rem",
            background: "var(--color-bg-tertiary)",
            borderRadius: "12px",
            border: "1px solid var(--color-border)",
          }}
        >
          <h3 style={{ margin: "0 0 1rem 0", fontSize: "1rem" }}>
            ③ 対話結果を記録する
          </h3>
          <p
            style={{
              fontSize: "0.9rem",
              color: "var(--color-text-secondary)",
              marginBottom: "1rem",
              lineHeight: 1.6,
            }}
          >
            AIから受け取った結果（Human View と AI Knowledge
            JSON）をアプリに保存しましょう。
          </p>
          <button
            onClick={() => setMode("WRITE")}
            className="btn-primary"
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
            }}
          >
            結果を記録する →
          </button>
        </div>
      </div>
    );
  }

  // Mode: WRITE - 記録入力画面
  return (
    <div>
      {/* Header with back button */}
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
          ← 最初から
        </button>
        {selectedPreset && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              color: "var(--color-text-tertiary)",
            }}
          >
            <span
              style={{
                color: "var(--color-accent)",
                display: "flex",
                alignItems: "center",
              }}
            >
              {PRESET_ICONS[selectedPreset.iconId] || <Waves size={18} />}
            </span>
            <span style={{ fontSize: "0.9rem", fontWeight: 600 }}>
              {selectedPreset.name}
            </span>
          </div>
        )}
      </div>

      {/* Entry Form */}
      <EntryForm topics={topics} presetPrompt={selectedPreset?.systemPrompt} />
    </div>
  );
}
