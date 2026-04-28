"use client";

import { useState, useEffect } from "react";
import {
  generatePromptAction,
  saveAnalysisResultAction,
  autoAnalyzeTopicAction,
} from "@/app/ai-actions";
import { checkUsageLimit } from "@/lib/usage";
import { UsageCheckResult } from "@/lib/usage-types";
import { UsageLimitModal } from "./UsageLimitModal";
import { UsageIndicator } from "./UsageIndicator";
import { useRouter } from "next/navigation";

type Props = {
  topicId: string;
  topicName: string;
  latestSummary?: {
    human_summary: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- AI-generated JSON has dynamic schema
    ai_knowledge: any;
    created_at: string;
  };
};

type Trend = { period?: string; label?: string };

type Mode = "IDLE" | "PROMPT_READY" | "INPUT_RESULT";

export function TopicAnalysisSection({
  topicId,
  topicName,
  latestSummary,
}: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("IDLE");
  const [loading, setLoading] = useState(false);
  const [autoLoading, setAutoLoading] = useState(false);
  const [promptText, setPromptText] = useState("");
  const [jsonInput, setJsonInput] = useState("");
  const [usage, setUsage] = useState<UsageCheckResult | null>(null);
  const [showLimitModal, setShowLimitModal] = useState(false);

  // Fetch usage on mount
  useEffect(() => {
    checkUsageLimit("topic_analysis").then(setUsage);
  }, []);

  // -- Actions --

  const handleAutoAnalyze = async () => {
    setAutoLoading(true);
    try {
      const res = await autoAnalyzeTopicAction(topicId, topicName);
      if (res.success) {
        // Reload page to show new analysis
        router.refresh();
      } else if (res.error === "USAGE_LIMIT_EXCEEDED") {
        if (res.usage) setUsage(res.usage);
        setShowLimitModal(true);
      } else {
        alert(res.error || "分析に失敗しました");
      }
    } catch {
      alert("エラーが発生しました");
    } finally {
      setAutoLoading(false);
    }
  };

  const handleGeneratePrompt = async () => {
    setLoading(true);
    try {
      const res = await generatePromptAction(topicId, topicName);
      if (res.success && res.prompt) {
        setPromptText(res.prompt);
        setMode("PROMPT_READY");
        // Update usage from response
        if (res.usage) {
          setUsage(res.usage);
        }
      } else if (res.error === "USAGE_LIMIT_EXCEEDED") {
        // Show limit modal
        if (res.usage) setUsage(res.usage);
        setShowLimitModal(true);
      } else {
        alert(res.error || "プロンプト生成に失敗しました");
      }
    } catch {
      alert("エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(promptText);
    alert("プロンプトをコピーしました！GeminiやChatGPTに貼り付けてください。");
  };

  const handleSaveResult = async () => {
    if (!jsonInput.trim()) return;
    setLoading(true);
    try {
      const res = await saveAnalysisResultAction(topicId, jsonInput);
      if (res.success) {
        alert("分析データを保存しました！");
        setMode("IDLE");
        setJsonInput("");
        setPromptText("");
        // Ideally trigger a router refresh here if revalidatePath isn't enough for client state
      } else {
        alert(res.error || "保存に失敗しました");
      }
    } catch {
      alert("エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  // -- Render Logic --

  const data = latestSummary?.ai_knowledge;
  const hasData = !!data;

  // If we have data and are in IDLE mode, show dashboard
  if (hasData && mode === "IDLE") {
    // Check if it's a Weekly Review schema
    const isWeekly = !!data.theme;

    return (
      <section style={{ marginBottom: "4rem" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: "1rem",
          }}
        >
          <h2
            style={{
              fontSize: "1.3rem",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <span style={{ fontSize: "1.5rem" }}>{isWeekly ? "🗓️" : "📈"}</span>
            {isWeekly ? "週次インサイト" : "変化とインサイト"}
          </h2>
          <button
            onClick={handleAutoAnalyze}
            disabled={autoLoading}
            style={{
              fontSize: "0.85rem",
              fontWeight: 600,
              padding: "0.5rem 1rem",
              color: "#fff",
              backgroundColor: "var(--color-accent-primary)",
              border: "none",
              borderRadius: "20px",
              cursor: autoLoading ? "wait" : "pointer",
              opacity: autoLoading ? 0.7 : 1,
            }}
          >
            {autoLoading ? "分析中..." : "🔄 再分析する"}
          </button>
        </div>

        {/* Dashboard Cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "1rem",
            marginBottom: "1.5rem",
          }}
        >
          {isWeekly ? (
            // --- WEEKLY REVIEW VIEW ---
            <>
              <div
                style={{
                  borderRadius: "12px",
                  background: "var(--color-bg-tertiary)",
                  border: "1px solid var(--color-border)",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                  gridColumn: "1 / -1", // Full width
                  color: "var(--color-text-primary)",
                }}
              >
                <div
                  style={{
                    fontSize: "0.85rem",
                    color: "var(--color-subtle)",
                    marginBottom: "0.5rem",
                  }}
                >
                  今週のテーマ
                </div>
                <div
                  style={{
                    fontSize: "1.4rem",
                    fontWeight: 700,
                    color: "var(--color-text)",
                    marginBottom: "1rem",
                  }}
                >
                  {data.theme}
                </div>
                <div style={{ lineHeight: 1.6, fontSize: "0.95rem" }}>
                  {data.insight_text}
                </div>
              </div>

              <div
                style={{
                  padding: "1.5rem",
                  borderRadius: "12px",
                  background: "var(--color-bg-tertiary)", // Slightly different bg
                  border: "1px solid var(--color-border)",
                  gridColumn: "1 / -1",
                }}
              >
                <div
                  style={{
                    fontSize: "0.9rem",
                    fontWeight: 600,
                    marginBottom: "0.5rem",
                    color: "#d2691e",
                  }}
                >
                  🚀 Next Week&apos;s Focus
                </div>
                <div>{data.action_item || "-"}</div>
              </div>
            </>
          ) : (
            // --- STANDARD ANALYSIS VIEW ---
            <>
              {/* Status */}
              <div
                style={{
                  padding: "1.5rem",
                  borderRadius: "12px",
                  background: "var(--color-bg-tertiary)",
                  border: "1px solid var(--color-border)",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                }}
              >
                <div
                  style={{
                    fontSize: "0.85rem",
                    color: "var(--color-subtle)",
                    marginBottom: "0.5rem",
                  }}
                >
                  今の状態
                </div>
                <div
                  style={{
                    fontSize: "1.4rem",
                    fontWeight: 700,
                    color: "var(--color-text)",
                  }}
                >
                  {data.current_status || "不明"}
                </div>
                <div
                  style={{
                    marginTop: "0.8rem",
                    fontSize: "0.95rem",
                    lineHeight: 1.5,
                  }}
                >
                  <span style={{ fontWeight: 600 }}>理由:</span>{" "}
                  {data.reason || "-"}
                </div>
              </div>
              {/* Question */}
              <div
                style={{
                  padding: "1.5rem",
                  borderRadius: "12px",
                  background:
                    "linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(168, 85, 247, 0.05))",
                  border: "1px solid rgba(139, 92, 246, 0.3)",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                }}
              >
                <div
                  style={{
                    fontSize: "0.85rem",
                    color: "#a855f7",
                    marginBottom: "0.5rem",
                    fontWeight: 500,
                  }}
                >
                  💡 次の問い
                </div>
                <div
                  style={{
                    fontSize: "1.1rem",
                    fontWeight: 600,
                    marginBottom: "1rem",
                    color: "var(--color-text-primary)",
                  }}
                >
                  {data.next_question ? `「${data.next_question}」` : "-"}
                </div>
                {data.next_question && (
                  <button
                    onClick={() => router.push(`/new`)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      padding: "0.6rem 1rem",
                      background: "#a855f7",
                      color: "#fff",
                      border: "none",
                      borderRadius: "8px",
                      cursor: "pointer",
                      fontSize: "0.85rem",
                      fontWeight: 500,
                      transition: "all 0.2s",
                    }}
                  >
                    ✏️ このテーマで記録する
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        {/* Trends (Only for Standard Mode usually, but checking anyway) */}
        {!isWeekly && data.trends && data.trends.length > 0 && (
          <div
            style={{
              padding: "1.5rem",
              backgroundColor: "var(--color-bg-tertiary)",
              borderRadius: "12px",
              border: "1px dashed var(--color-border)",
            }}
          >
            <h3 style={{ fontSize: "1rem", margin: "0 0 1rem 0" }}>
              観測された傾向
            </h3>
            <ul style={{ paddingLeft: "1.2rem", margin: 0, lineHeight: 1.8 }}>
              {(data.trends as Trend[]).map((t: Trend, i: number) => (
                <li key={i}>
                  <span
                    style={{
                      fontSize: "0.9rem",
                      color: "var(--color-text-tertiary)",
                      marginRight: "0.5rem",
                    }}
                  >
                    {t.period}:
                  </span>
                  <strong>{t.label}</strong>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div
          style={{
            marginTop: "0.5rem",
            textAlign: "right",
            fontSize: "0.8rem",
            color: "var(--color-subtle)",
          }}
        >
          分析日時: {new Date(latestSummary!.created_at).toLocaleString()}
        </div>
      </section>
    );
  }

  // Operation UI (IDLE empty, or Wizard steps)
  return (
    <>
      <section
        style={{
          marginBottom: "3rem",
          padding: "1.5rem",
          backgroundColor: "var(--color-bg-tertiary)",
          borderRadius: "8px",
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
          <h2 style={{ fontSize: "1.1rem", margin: 0 }}>
            ▼ 時系列の変化 (AI Analysis)
          </h2>
        </div>

        {mode === "IDLE" && (
          <div style={{ textAlign: "center", padding: "1rem 0" }}>
            <p
              style={{
                marginBottom: "1.5rem",
                color: "var(--color-text-secondary)",
              }}
            >
              ログをまとめてAIに渡し、変化を分析します。
            </p>
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
                disabled={
                  autoLoading || loading || (usage?.remaining ?? 1) <= 0
                }
                style={{
                  fontSize: "1rem",
                  fontWeight: 600,
                  padding: "1rem 2rem",
                  color: "#fff",
                  backgroundColor:
                    (usage?.remaining ?? 1) <= 0
                      ? "var(--color-bg-tertiary)"
                      : "var(--color-accent)",
                  border: "none",
                  borderRadius: "30px",
                  cursor:
                    autoLoading || loading || (usage?.remaining ?? 1) <= 0
                      ? "not-allowed"
                      : "pointer",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
                  display: "flex",
                  alignItems: "center",
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
                      featureType="topic_analysis"
                      usage={usage}
                      compact
                    />
                  </>
                )}
              </button>

              {/* Secondary: Manual Prompt */}
              <button
                onClick={handleGeneratePrompt}
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
          </div>
        )}

        {mode === "PROMPT_READY" && (
          <div>
            <p
              style={{
                fontSize: "0.9rem",
                color: "var(--color-subtle)",
                marginBottom: "0.5rem",
              }}
            >
              1. 下のプロンプトをコピーしてください。
              <br />
              2. ChatGPT, Claude, Gemini などのAIに貼り付けて実行してください。
            </p>
            <textarea
              readOnly
              value={promptText}
              style={{
                width: "100%",
                height: "150px",
                fontSize: "0.8rem",
                padding: "0.5rem",
                borderRadius: "4px",
                border: "1px solid var(--color-border)",
                marginBottom: "1rem",
                fontFamily: "var(--font-sans)",
                background: "var(--color-bg-primary)",
                color: "var(--color-text-primary)",
              }}
            />
            <div style={{ display: "flex", gap: "1rem" }}>
              <button
                onClick={handleCopyPrompt}
                style={{
                  flex: 1,
                  padding: "0.6rem",
                  borderRadius: "4px",
                  border: "1px solid var(--color-border)",
                  background: "var(--color-bg-tertiary)",
                  color: "var(--color-text-primary)",
                  cursor: "pointer",
                }}
              >
                📋 コピー
              </button>
              <button
                onClick={() => setMode("INPUT_RESULT")}
                style={{
                  flex: 1,
                  padding: "0.6rem",
                  borderRadius: "4px",
                  background: "var(--color-accent)",
                  color: "#fff",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                次へ（結果を入力）→
              </button>
            </div>
          </div>
        )}

        {mode === "INPUT_RESULT" && (
          <div>
            <p
              style={{
                fontSize: "0.9rem",
                color: "var(--color-subtle)",
                marginBottom: "0.5rem",
              }}
            >
              3. AIが出力した <strong>JSON部分だけ</strong>{" "}
              をここに貼り付けてください。
            </p>
            <textarea
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              placeholder='{ "current_status": "...", ... }'
              style={{
                width: "100%",
                height: "150px",
                fontSize: "0.8rem",
                padding: "0.5rem",
                borderRadius: "4px",
                border: "1px solid var(--color-border)",
                marginBottom: "1rem",
                fontFamily: "var(--font-sans)",
                background: "var(--color-bg-primary)",
                color: "var(--color-text-primary)",
              }}
            />
            <div style={{ display: "flex", gap: "1rem" }}>
              <button
                onClick={() => setMode("PROMPT_READY")}
                style={{
                  flex: 1,
                  padding: "0.6rem",
                  borderRadius: "4px",
                  border: "1px solid var(--color-border)",
                  background: "var(--color-bg-tertiary)",
                  color: "var(--color-text-secondary)",
                  cursor: "pointer",
                }}
              >
                戻る
              </button>
              <button
                onClick={handleSaveResult}
                disabled={loading}
                style={{
                  flex: 1,
                  padding: "0.6rem",
                  borderRadius: "4px",
                  background: "var(--color-accent)",
                  color: "#fff",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                {loading ? "保存中..." : "💾 分析結果を保存"}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Usage Limit Modal */}
      {usage && (
        <UsageLimitModal
          isOpen={showLimitModal}
          onClose={() => setShowLimitModal(false)}
          featureType="topic_analysis"
          usage={usage}
        />
      )}
    </>
  );
}
