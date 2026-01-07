"use client";

import { useState } from "react";
import {
  generatePromptAction,
  saveAnalysisResultAction,
} from "@/app/ai-actions";

type Props = {
  topicId: string;
  topicName: string;
  latestSummary?: {
    human_summary: string;
    ai_knowledge: any;
    created_at: string;
  };
};

type Mode = "IDLE" | "PROMPT_READY" | "INPUT_RESULT";

export function TopicAnalysisSection({
  topicId,
  topicName,
  latestSummary,
}: Props) {
  const [mode, setMode] = useState<Mode>("IDLE");
  const [loading, setLoading] = useState(false);
  const [promptText, setPromptText] = useState("");
  const [jsonInput, setJsonInput] = useState("");

  // -- Actions --

  const handleGeneratePrompt = async () => {
    setLoading(true);
    try {
      const res = await generatePromptAction(topicId, topicName);
      if (res.success && res.prompt) {
        setPromptText(res.prompt);
        setMode("PROMPT_READY");
      } else {
        alert(res.error || "プロンプト生成に失敗しました");
      }
    } catch (e) {
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
    } catch (e) {
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
            onClick={() => setMode("IDLE")}
            onClickCapture={() => {
              setMode("IDLE");
              handleGeneratePrompt();
            }}
            disabled={loading}
            style={{
              fontSize: "0.85rem",
              fontWeight: 600,
              padding: "0.5rem 1rem",
              color: "#fff",
              backgroundColor: "var(--color-accent-primary)",
              border: "none",
              borderRadius: "20px",
              cursor: loading ? "wait" : "pointer",
            }}
          >
            {loading ? "準備中..." : "🔄 再分析する"}
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
                  🚀 Next Week's Focus
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
                  次の問い
                </div>
                <div
                  style={{
                    fontSize: "1.1rem",
                    fontWeight: 600,
                    marginBottom: "0.8rem",
                  }}
                >
                  {data.next_question ? `「${data.next_question}」` : "-"}
                </div>
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
              {data.trends.map((t: any, i: number) => (
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
          <p style={{ marginBottom: "1.5rem", color: "var(--color-subtle)" }}>
            ログをまとめてAIに渡し、変化を分析します。
          </p>
          <button
            onClick={handleGeneratePrompt}
            disabled={loading}
            style={{
              fontSize: "1rem",
              fontWeight: 600,
              padding: "0.8rem 1.5rem",
              color: "#fff",
              backgroundColor: "var(--color-text)",
              border: "none",
              borderRadius: "30px",
              cursor: loading ? "wait" : "pointer",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            }}
          >
            {loading ? "生成中..." : "🪄 分析用プロンプトを作成"}
          </button>
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
              fontFamily: "monospace",
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
                background: "var(--color-text)",
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
              fontFamily: "monospace",
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
                background: "var(--color-text)",
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
  );
}
