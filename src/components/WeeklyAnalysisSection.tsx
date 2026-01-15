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
import {
  RotateCcw,
  Check,
  Target,
  Lightbulb,
  Compass,
  BarChart2,
  FileText,
} from "lucide-react";

type Props = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- AI-generated JSON has dynamic schema
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- AI result has dynamic structure
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
      let _parsed;
      try {
        _parsed = JSON.parse(jsonString);
      } catch {
        // If strict parse fails, it might be due to loose formatting.
        // For now, let's just create a valid object if we can't parse, or throw.
        console.error("JSON Parsing failed in WeeklyAnalysisSection");
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
    } catch (e: unknown) {
      const errMsg =
        e instanceof Error ? e.message : "予期せぬエラーが発生しました";
      alert("エラー: " + errMsg);
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
          marginTop: "1.5rem",
          padding: "1.25rem",
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
          <FileText size={20} /> 週次レビュー (AI Analysis)
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
              gap: "1rem",
              marginBottom: "2rem",
            }}
          >
            <div
              style={{
                padding: "1.25rem 1rem",
                background: "var(--color-bg-secondary)",
                borderRadius: "12px",
                border: "1px solid var(--color-border)",
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <div
                style={{
                  fontSize: "1.75rem",
                  background: "rgba(255, 159, 10, 0.1)",
                  width: "48px",
                  height: "48px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "0.25rem",
                }}
              >
                <Target size={24} color="#f59e0b" />
              </div>
              <div
                style={{
                  fontSize: "0.9rem",
                  fontWeight: 600,
                  color: "var(--color-text-secondary)",
                }}
              >
                今週のテーマ
              </div>
              <div
                style={{
                  fontSize: "0.75rem",
                  color: "var(--color-text-tertiary)",
                }}
              >
                活動の焦点を明確化
              </div>
            </div>

            <div
              style={{
                padding: "1.25rem 1rem",
                background: "var(--color-bg-secondary)",
                borderRadius: "12px",
                border: "1px solid var(--color-border)",
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <div
                style={{
                  fontSize: "1.75rem",
                  background: "rgba(59, 130, 246, 0.1)",
                  width: "48px",
                  height: "48px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "0.25rem",
                }}
              >
                <Lightbulb size={24} color="#3b82f6" />
              </div>
              <div
                style={{
                  fontSize: "0.9rem",
                  fontWeight: 600,
                  color: "var(--color-text-secondary)",
                }}
              >
                インサイト
              </div>
              <div
                style={{
                  fontSize: "0.75rem",
                  color: "var(--color-text-tertiary)",
                }}
              >
                隠れた思考のパターン
              </div>
            </div>

            <div
              style={{
                padding: "1.25rem 1rem",
                background: "var(--color-bg-secondary)",
                borderRadius: "12px",
                border: "1px solid var(--color-border)",
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <div
                style={{
                  fontSize: "1.75rem",
                  background: "rgba(16, 185, 129, 0.1)",
                  width: "48px",
                  height: "48px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "0.25rem",
                }}
              >
                <Compass size={24} color="#10b981" />
              </div>
              <div
                style={{
                  fontSize: "0.9rem",
                  fontWeight: 600,
                  color: "var(--color-text-secondary)",
                }}
              >
                来週の指針
              </div>
              <div
                style={{
                  fontSize: "0.75rem",
                  color: "var(--color-text-tertiary)",
                }}
              >
                具体的なアクション
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
            marginTop: "1.5rem",
            padding: "1.5rem",
            borderRadius: "12px",
            background: "var(--color-bg-tertiary)",
            border: "1px solid var(--color-border)",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1.5rem",
            }}
          >
            <h3
              style={{
                fontSize: "1.1rem",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <BarChart2 size={20} /> 週次インサイト
            </h3>
            <span
              style={{
                fontSize: "0.8rem",
                color: "var(--color-subtle)",
              }}
            >
              {result.period_label || "今週"}
            </span>
          </div>

          {/* Theme Card */}
          <div
            style={{
              padding: "1rem 1.25rem",
              background: "rgba(255, 159, 10, 0.1)",
              borderRadius: "10px",
              borderLeft: "3px solid var(--color-accent)",
              marginBottom: "1rem",
            }}
          >
            <div
              style={{
                fontSize: "0.75rem",
                color: "var(--color-accent)",
                marginBottom: "0.25rem",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: "0.25rem",
              }}
            >
              <Target size={14} /> 今週のテーマ
            </div>
            <div style={{ fontSize: "1rem", fontWeight: 600 }}>
              {result.theme || result.current_status || "テーマなし"}
            </div>
          </div>

          {/* Insight */}
          {(result.insight_text || result.reason) && (
            <div style={{ marginBottom: "1rem" }}>
              <div
                style={{
                  fontSize: "0.8rem",
                  color: "var(--color-subtle)",
                  marginBottom: "0.5rem",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: "0.25rem",
                }}
              >
                <Lightbulb size={14} /> インサイト
              </div>
              <p
                style={{
                  fontSize: "0.95rem",
                  lineHeight: 1.7,
                  color: "var(--color-text-secondary)",
                }}
              >
                {result.insight_text || result.reason}
              </p>
            </div>
          )}

          {/* Action Item */}
          {result.action_item && (
            <div
              style={{
                padding: "1rem",
                background: "rgba(16, 185, 129, 0.08)",
                borderRadius: "10px",
                borderLeft: "3px solid #10b981",
              }}
            >
              <div
                style={{
                  fontSize: "0.75rem",
                  color: "#10b981",
                  marginBottom: "0.25rem",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: "0.25rem",
                }}
              >
                <Compass size={14} /> 来週のアクション
              </div>
              <p style={{ fontSize: "0.95rem", lineHeight: 1.6 }}>
                {result.action_item}
              </p>
            </div>
          )}

          {/* Actions Footer */}
          <div
            style={{
              marginTop: "2rem",
              paddingTop: "1.5rem",
              borderTop: "1px solid var(--color-border)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <button
              onClick={() => setMode("IDLE")}
              style={{
                background: "transparent",
                color: "var(--color-text-tertiary)",
                border: "none",
                fontSize: "0.85rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                padding: "0.5rem",
                borderRadius: "6px",
                transition: "color 0.2s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.color = "var(--color-text-primary)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.color = "var(--color-text-tertiary)")
              }
            >
              <RotateCcw size={14} /> 再分析する
            </button>

            <button
              onClick={() => setMode("IDLE")}
              style={{
                background: "var(--color-bg-primary)",
                border: "1px solid var(--color-border)",
                color: "var(--color-text-primary)",
                padding: "0.6rem 1.5rem",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: 500,
                fontSize: "0.9rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                boxShadow: "var(--shadow-sm)",
              }}
            >
              <Check size={16} /> 閉じる
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
