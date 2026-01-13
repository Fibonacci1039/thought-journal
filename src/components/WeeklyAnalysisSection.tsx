"use client";

import { useState, useEffect } from "react";
import {
  generateWeeklyPromptAction,
  saveWeeklySummaryAction,
  autoWeeklyAnalysisAction,
} from "@/app/ai-actions";
import { useRouter } from "next/navigation";
import { checkUsageLimit } from "@/lib/usage";
import { UsageCheckResult } from "@/lib/usage-types";
import { UsageLimitModal } from "./UsageLimitModal";
import { UsageIndicator } from "./UsageIndicator";

type Props = {
  initialData?: any;
};

export function WeeklyAnalysisSection({ initialData }: Props) {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [aiInput, setAiInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [autoLoading, setAutoLoading] = useState(false);
  const [mode, setMode] = useState<"IDLE" | "PROMPT_SHOWN" | "DONE" | "VIEW">(
    initialData ? "VIEW" : "IDLE"
  );
  const [result, setResult] = useState<any>(
    initialData?.ai_knowledge || initialData || null
  );
  const [usage, setUsage] = useState<UsageCheckResult | null>(null);
  const [showLimitModal, setShowLimitModal] = useState(false);

  // Fetch usage on mount
  useEffect(() => {
    checkUsageLimit("weekly_review").then(setUsage);
  }, []);

  const handleAutoAnalyze = async () => {
    setAutoLoading(true);
    try {
      const res = await autoWeeklyAnalysisAction();
      if (res.success && res.topicId && res.data) {
        setResult(res.data);
        setMode("VIEW");
        // No longer redirecting, staying on page to show result
        // router.push(`/topics/${res.topicId}`);
      } else if (res.success && res.topicId) {
        // Fallback if data not returned (should not happen with latest action update)
        router.push(`/topics/${res.topicId}`);
      } else if (res.error === "USAGE_LIMIT_EXCEEDED") {
        if (res.usage) setUsage(res.usage);
        setShowLimitModal(true);
      } else {
        alert("エラー: " + (res.error || "分析に失敗しました"));
      }
    } catch {
      alert("エラーが発生しました");
    } finally {
      setAutoLoading(false);
    }
  };

  const handleGenerate = async () => {
    setLoading(true);
    const res = await generateWeeklyPromptAction();
    if (res.success && res.prompt) {
      setPrompt(res.prompt);
      setMode("PROMPT_SHOWN");
      // Update usage from response
      if (res.usage) {
        setUsage(res.usage);
      }
    } else if (res.error === "USAGE_LIMIT_EXCEEDED") {
      // Show limit modal
      if (res.usage) setUsage(res.usage);
      setShowLimitModal(true);
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
    <>
      <div
        style={{
          marginTop: "2rem",
          padding: "1.5rem",
          borderRadius: "12px",
          backgroundColor: "var(--color-bg-tertiary)",
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
          <span>📝</span> 週次レビュー (AI Analysis)
        </h3>

        <p
          style={{
            fontSize: "0.9rem",
            color: "var(--color-text)",
            lineHeight: 1.6,
            marginBottom: "1.5rem",
          }}
        >
          過去1週間のログをAIが集計し、振り返りと次週の指針を提案します。
        </p>

        {/* Preview Cards - Show what users will get */}
        {mode === "IDLE" && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              gap: "0.75rem",
              marginBottom: "1.5rem",
              opacity: 0.6,
            }}
          >
            <div
              style={{
                padding: "1rem",
                background: "var(--color-bg-primary)",
                borderRadius: "10px",
                border: "1px dashed var(--color-border)",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: "1.5rem", marginBottom: "0.25rem" }}>
                🎯
              </div>
              <div
                style={{
                  fontSize: "0.75rem",
                  color: "var(--color-text-tertiary)",
                }}
              >
                今週のテーマ
              </div>
            </div>
            <div
              style={{
                padding: "1rem",
                background: "var(--color-bg-primary)",
                borderRadius: "10px",
                border: "1px dashed var(--color-border)",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: "1.5rem", marginBottom: "0.25rem" }}>
                💡
              </div>
              <div
                style={{
                  fontSize: "0.75rem",
                  color: "var(--color-text-tertiary)",
                }}
              >
                インサイト
              </div>
            </div>
            <div
              style={{
                padding: "1rem",
                background: "var(--color-bg-primary)",
                borderRadius: "10px",
                border: "1px dashed var(--color-border)",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: "1.5rem", marginBottom: "0.25rem" }}>
                🚀
              </div>
              <div
                style={{
                  fontSize: "0.75rem",
                  color: "var(--color-text-tertiary)",
                }}
              >
                来週の指針
              </div>
            </div>
          </div>
        )}

        {/* Step 1: Generate */}
        {mode === "IDLE" && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "1rem",
            }}
          >
            {/* Main: Auto Analyze Button */}
            <button
              onClick={handleAutoAnalyze}
              disabled={autoLoading || loading || (usage?.remaining ?? 1) <= 0}
              style={{
                width: "100%",
                padding: "1rem",
                backgroundColor:
                  (usage?.remaining ?? 1) <= 0
                    ? "var(--color-bg-tertiary)"
                    : "var(--color-accent)",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                fontSize: "1rem",
                fontWeight: 600,
                cursor:
                  autoLoading || loading || (usage?.remaining ?? 1) <= 0
                    ? "not-allowed"
                    : "pointer",
                boxShadow: "0 2px 8px rgba(255, 159, 10, 0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
              }}
            >
              {autoLoading ? (
                <>
                  <span className="animate-spin">⏳</span> AI分析中...
                </>
              ) : (
                <>
                  ✨ AI自動分析
                  <UsageIndicator
                    featureType="weekly_review"
                    usage={usage}
                    compact
                  />
                </>
              )}
            </button>

            {/* Secondary: Manual Prompt */}
            <button
              onClick={handleGenerate}
              disabled={loading || autoLoading}
              style={{
                fontSize: "0.85rem",
                fontWeight: 500,
                padding: "0.5rem 1rem",
                color: "var(--color-text-secondary)",
                backgroundColor: "transparent",
                border: "1px solid var(--color-border)",
                borderRadius: "20px",
                cursor: loading || autoLoading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "準備中..." : "📋 手動でプロンプトを取得"}
            </button>
          </div>
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
                  color: "var(--color-text-primary)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "8px",
                  backgroundColor: "#1c1c1e",
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
                  color: "var(--color-text-primary)",
                  backgroundColor: "#1c1c1e",
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
                  cursor:
                    !aiInput.trim() || loading ? "not-allowed" : "pointer",
                }}
              >
                {loading ? "保存中..." : "レターを受け取る (保存)"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Result View */}
      {mode === "VIEW" && result && (
        <div
          className="animate-enter"
          style={{
            marginTop: "2rem",
            padding: "2rem",
            borderRadius: "16px",
            background: "linear-gradient(135deg, #1c1c1e 0%, #2c2c2e 100%)",
            border: "1px solid var(--color-border)",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "2rem",
              borderBottom: "1px solid rgba(255,255,255,0.1)",
              paddingBottom: "1rem",
            }}
          >
            <h2 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#fff" }}>
              Weekly Insight
            </h2>
            <div
              style={{
                fontSize: "0.85rem",
                color: "rgba(255,255,255,0.6)",
              }}
            >
              AI Analysis Result
            </div>
          </div>

          <div style={{ display: "grid", gap: "2rem" }}>
            {/* Status / Theme */}
            <div
              style={{
                padding: "1.5rem",
                background: "rgba(255,255,255,0.05)",
                borderRadius: "12px",
              }}
            >
              <h3
                style={{
                  fontSize: "0.9rem",
                  color: "var(--color-accent)",
                  marginBottom: "0.5rem",
                  textTransform: "uppercase",
                  letterSpacing: "1px",
                }}
              >
                Current Theme
              </h3>
              <p style={{ fontSize: "1.2rem", fontWeight: 600, color: "#fff" }}>
                {result.current_status || result.theme || "No Theme"}
              </p>
            </div>

            {/* Main Content Render */}
            <div style={{ lineHeight: 1.8, color: "rgba(255,255,255,0.9)" }}>
              {result.reason && (
                <div style={{ marginBottom: "1.5rem" }}>
                  <h4
                    style={{
                      fontSize: "1rem",
                      fontWeight: 600,
                      marginBottom: "0.5rem",
                      color: "#fff",
                    }}
                  >
                    Analysis
                  </h4>
                  <p>{result.reason}</p>
                </div>
              )}

              {/* Fallback for other fields */}
              {!result.reason && !result.current_status && (
                <pre
                  style={{
                    whiteSpace: "pre-wrap",
                    fontSize: "0.85rem",
                    color: "var(--color-subtle)",
                  }}
                >
                  {JSON.stringify(result, null, 2)}
                </pre>
              )}
            </div>
          </div>

          <div style={{ marginTop: "2rem", textAlign: "center" }}>
            <button
              onClick={() => setMode("IDLE")}
              style={{
                background: "transparent",
                border: "1px solid var(--color-border)",
                color: "var(--color-subtle)",
                padding: "0.5rem 1rem",
                borderRadius: "20px",
                cursor: "pointer",
                fontSize: "0.85rem",
              }}
            >
              閉じる / 再分析
            </button>
          </div>
        </div>
      )}

      {/* Usage Limit Modal */}
      {usage && (
        <UsageLimitModal
          isOpen={showLimitModal}
          onClose={() => setShowLimitModal(false)}
          featureType="weekly_review"
          usage={usage}
        />
      )}
    </>
  );
}
