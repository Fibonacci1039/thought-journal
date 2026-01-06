"use client";

import { useState } from "react";
import {
  generateWeeklyPromptAction,
  saveWeeklySummaryAction,
} from "@/app/ai-actions";
import { useRouter } from "next/navigation";

export function WeeklyAnalysisSection() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [aiInput, setAiInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"IDLE" | "PROMPT_SHOWN" | "DONE">("IDLE");

  const handleGenerate = async () => {
    setLoading(true);
    const res = await generateWeeklyPromptAction();
    if (res.success && res.prompt) {
      setPrompt(res.prompt);
      setMode("PROMPT_SHOWN");
    } else {
      alert("エラー: " + (res.error || "プロンプト生成に失敗しました"));
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!aiInput.trim()) return;

    setLoading(true);

    try {
      // Robust JSON extraction
      let jsonString = aiInput;
      // 1. Try to find markdown code block first
      const codeBlockMatch = aiInput.match(/```json\n([\s\S]*?)\n```/);
      if (codeBlockMatch) {
        jsonString = codeBlockMatch[1];
      } else {
        // 2. Try to find the first '{' and last '}'
        const firstOpen = aiInput.indexOf("{");
        const lastClose = aiInput.lastIndexOf("}");
        if (firstOpen !== -1 && lastClose !== -1 && lastClose > firstOpen) {
          jsonString = aiInput.substring(firstOpen, lastClose + 1);
        }
      }

      // 3. Try parsing
      let parsed;
      try {
        parsed = JSON.parse(jsonString);
      } catch (e) {
        // If strict parse fails, it might be due to loose formatting.
        // For now, let's just create a valid object if we can't parse, or throw.
        console.error("JSON Parsing failed", e);
        throw new Error(
          "JSONデータの解析に失敗しました。正しいJSON形式が含まれているか確認してください。"
        );
      }

      // If parsing succeeded, we need to pass the *string* or the *object*?
      // The action expects a string (AI raw output) or the object?
      // Looking at saveWeeklySummaryAction, it takes the raw string and tries to parse it again?
      // Let's look at the action signature.
      // Ah, the action takes string, extracts JSON, and validates.
      // So we can actually just pass the raw input to the action if the action is robust.
      // But it's better to clean it up here to give immediate feedback.

      // Let's pass the cleaned JSON string if extraction worked, otherwise passing raw might retain text.
      // Actually, let's just pass the original input, but we validated it locally first.

      const res = await saveWeeklySummaryAction(aiInput);

      if (res.success && res.topicId) {
        alert("Weekly Insightを保存しました！");
        setMode("DONE");
        setAiInput("");
        setPrompt("");
        router.push(`/topics/${res.topicId}`);
      } else {
        throw new Error(res.error || "保存に失敗しました");
      }
    } catch (e: any) {
      alert("エラー: " + (e.message || "予期せぬエラーが発生しました"));
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(prompt);
    alert("プロンプトをコピーしました");
  };

  return (
    <div
      style={{
        marginTop: "2rem",
        padding: "1.5rem",
        borderRadius: "12px",
        backgroundColor: "#fff",
        border: "1px solid var(--color-border)",
      }}
    >
      <h3
        style={{
          marginBottom: "1rem",
          fontSize: "1.2rem",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
        }}
      >
        <span>📮</span> 週刊インサイト・レター
      </h3>

      <p
        style={{
          fontSize: "0.9rem",
          color: "var(--color-text)",
          lineHeight: 1.6,
          marginBottom: "1.5rem",
        }}
      >
        過去1週間のログをAI編集者に渡し、あなたへの「週刊レター」を書いてもらいましょう。
        <br />
        隠れた感情や小さな前進を発見できます。
      </p>

      {/* Step 1: Generate */}
      {mode === "IDLE" && (
        <button
          onClick={handleGenerate}
          disabled={loading}
          style={{
            width: "100%",
            padding: "1rem",
            backgroundColor: "var(--color-text)",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            fontSize: "1rem",
            fontWeight: 600,
            cursor: loading ? "wait" : "pointer",
          }}
        >
          {loading ? "データを収集中..." : "今週のレターを発行する"}
        </button>
      )}

      {/* Step 2: Copy & Paste */}
      {mode === "PROMPT_SHOWN" && (
        <div
          style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}
        >
          {/* Prompt Area */}
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "0.5rem",
              }}
            >
              <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>
                1. AIへの依頼文 (コピーしてください)
              </label>
              <button
                onClick={copyToClipboard}
                style={{
                  fontSize: "0.8rem",
                  textDecoration: "underline",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--color-accent-primary)",
                }}
              >
                コピー
              </button>
            </div>
            <textarea
              readOnly
              value={prompt}
              style={{
                width: "100%",
                height: "100px", // Compact view
                padding: "0.8rem",
                fontSize: "0.8rem",
                fontFamily: "monospace",
                color: "var(--color-subtle)",
                border: "1px solid var(--color-border)",
                borderRadius: "8px",
                backgroundColor: "#f9f9f9",
                resize: "vertical",
              }}
            />
          </div>

          <div
            style={{
              textAlign: "center",
              fontSize: "1.2rem",
              color: "var(--color-subtle)",
            }}
          >
            ⬇
          </div>

          {/* Input Area */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.85rem",
                fontWeight: 600,
                marginBottom: "0.5rem",
              }}
            >
              2. AIからの返信 (JSON) を貼り付け
            </label>
            <textarea
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              placeholder='{ "period_label": ... }'
              style={{
                width: "100%",
                height: "150px",
                padding: "1rem",
                fontSize: "0.9rem",
                fontFamily: "monospace",
                border: "1px solid var(--color-border)",
                borderRadius: "8px",
                resize: "vertical",
              }}
            />
          </div>

          <div style={{ display: "flex", gap: "1rem" }}>
            <button
              onClick={() => setMode("IDLE")}
              style={{
                flex: 1,
                padding: "0.8rem",
                backgroundColor: "transparent",
                color: "var(--color-subtle)",
                border: "1px solid var(--color-border)",
                borderRadius: "8px",
                cursor: "pointer",
              }}
            >
              キャンセル
            </button>
            <button
              onClick={handleSave}
              disabled={loading || !aiInput.trim()}
              style={{
                flex: 2,
                padding: "0.8rem",
                backgroundColor: "var(--color-accent-primary)",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                fontWeight: 600,
                opacity: !aiInput.trim() || loading ? 0.5 : 1,
                cursor: !aiInput.trim() || loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "保存中..." : "レターを受け取る (保存)"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
