"use client";

import { useState, useEffect } from "react";
import {
  generateEntryEmbeddingAction,
  listEntriesMissingEmbeddingAction,
  getUserProfileAction,
  saveUserProfileAction,
} from "@/app/actions";
import { Loader2, Database, Crown, Check, Sparkles, User } from "lucide-react";

export default function SettingsPage() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [progress, setProgress] = useState(0);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [basicInfo, setBasicInfo] = useState("");
  const [currentConcerns, setCurrentConcerns] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileStatus, setProfileStatus] = useState("");

  // Load user profile on mount
  useEffect(() => {
    getUserProfileAction().then((res) => {
      if (res.success && res.data) {
        setBasicInfo(res.data.basic_info || "");
        setCurrentConcerns(res.data.current_concerns || "");
      }
    });
  }, []);

  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    setProfileStatus("");
    try {
      const res = await saveUserProfileAction(basicInfo, currentConcerns);
      if (res.success) {
        setProfileStatus("保存しました！");
        setTimeout(() => setProfileStatus(""), 3000);
      } else {
        setProfileStatus("エラー: " + res.error);
      }
    } catch {
      setProfileStatus("保存に失敗しました");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSyncMemories = async () => {
    setIsSyncing(true);
    setStatus("記録を取得中...");
    setProgress(0);

    try {
      let processedCount = 0;
      let totalProcessed = 0;

      // Loop batch processing
      while (true) {
        const res = await listEntriesMissingEmbeddingAction();
        if (!res.success || !res.data || res.data.length === 0) {
          break;
        }

        const entries = res.data;
        setStatus(`${entries.length}件の記録をIndex化しています... (Batch)`);

        for (const entry of entries) {
          await generateEntryEmbeddingAction(entry.id, entry.human_view);
          processedCount++;
        }

        totalProcessed += entries.length;
        // Simple progress (fake infinite)
        setProgress((prev) => Math.min(prev + 10, 90));
      }

      if (totalProcessed === 0) {
        setStatus("更新が必要な記録はありません。");
        setProgress(100);
      } else {
        setStatus(`完了: 合計 ${totalProcessed} 件をIndex化しました。`);
        setProgress(100);
      }
    } catch (e: any) {
      console.error(e);
      setStatus(`エラーが発生しました: ${e.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleUpgrade = async () => {
    setIsUpgrading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || "エラーが発生しました");
      }
    } catch (e) {
      console.error(e);
      alert("決済処理に失敗しました");
    } finally {
      setIsUpgrading(false);
    }
  };

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "2rem" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "2rem" }}>
        Settings
      </h1>

      {/* Plan Section */}
      <section
        style={{
          background:
            "linear-gradient(135deg, rgba(251, 146, 60, 0.1), rgba(245, 158, 11, 0.05))",
          padding: "1.5rem",
          borderRadius: "16px",
          border: "1px solid rgba(251, 146, 60, 0.3)",
          marginBottom: "1.5rem",
        }}
      >
        <h2
          style={{
            fontSize: "1.2rem",
            marginBottom: "1rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            color: "#fb923c",
          }}
        >
          <Crown size={20} />
          プラン
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
            gap: "1rem",
            marginBottom: "1.5rem",
          }}
        >
          {/* Free Plan */}
          <div
            style={{
              padding: "1rem",
              borderRadius: "12px",
              background: "var(--color-bg-secondary)",
              border: "1px solid var(--color-border)",
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: "0.5rem" }}>Free</div>
            <ul
              style={{
                fontSize: "0.85rem",
                color: "var(--color-text-secondary)",
                listStyle: "none",
                padding: 0,
                margin: 0,
              }}
            >
              <li
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  marginBottom: "0.25rem",
                }}
              >
                <Check size={14} style={{ color: "#10b981" }} /> 記録無制限
              </li>
              <li
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  marginBottom: "0.25rem",
                }}
              >
                <Check size={14} style={{ color: "#10b981" }} /> 週次レビュー
                月2回
              </li>
              <li
                style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
              >
                <Check size={14} style={{ color: "#10b981" }} /> トピック分析
                月3回
              </li>
            </ul>
          </div>

          {/* Pro Plan */}
          <div
            style={{
              padding: "1rem",
              borderRadius: "12px",
              background:
                "linear-gradient(135deg, rgba(251, 146, 60, 0.15), rgba(245, 158, 11, 0.1))",
              border: "2px solid #fb923c",
            }}
          >
            <div
              style={{
                fontWeight: 600,
                marginBottom: "0.5rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <Sparkles size={16} style={{ color: "#fb923c" }} />
              Pro
              <span style={{ fontSize: "0.75rem", color: "#fb923c" }}>
                ¥980/月
              </span>
            </div>
            <ul
              style={{
                fontSize: "0.85rem",
                color: "var(--color-text-secondary)",
                listStyle: "none",
                padding: 0,
                margin: 0,
              }}
            >
              <li
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  marginBottom: "0.25rem",
                }}
              >
                <Check size={14} style={{ color: "#fb923c" }} /> 全機能無制限
              </li>
              <li
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  marginBottom: "0.25rem",
                }}
              >
                <Check size={14} style={{ color: "#fb923c" }} /> AI自動分析
              </li>
              <li
                style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
              >
                <Check size={14} style={{ color: "#fb923c" }} /> 優先サポート
              </li>
            </ul>
          </div>
        </div>

        <button
          onClick={handleUpgrade}
          disabled={isUpgrading}
          style={{
            width: "100%",
            padding: "0.75rem",
            background: "linear-gradient(135deg, #fb923c, #f59e0b)",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            fontSize: "1rem",
            fontWeight: 600,
            cursor: isUpgrading ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
            opacity: isUpgrading ? 0.7 : 1,
          }}
        >
          {isUpgrading ? (
            <>
              <Loader2 className="animate-spin" size={18} />
              処理中...
            </>
          ) : (
            <>
              <Crown size={18} />
              Proにアップグレード
            </>
          )}
        </button>
      </section>

      {/* AI Memory Section */}
      <section
        style={{
          background: "var(--color-bg-secondary)",
          padding: "1.5rem",
          borderRadius: "16px",
          border: "1px solid var(--color-border)",
        }}
      >
        <h2
          style={{
            fontSize: "1.2rem",
            marginBottom: "1rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <Database size={20} />
          Personal AI Memory
        </h2>
        <p
          style={{
            color: "var(--color-text-secondary)",
            marginBottom: "1.5rem",
            lineHeight: 1.6,
          }}
        >
          あなたの過去の記録をAIが検索・記憶できるように、データベースを最適化します。
          <br />
          「Recall」機能で過去の記録が表示されない場合は、ここからIndexを更新してください。
        </p>

        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <button
            onClick={handleSyncMemories}
            disabled={isSyncing}
            className="btn-primary"
            style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
          >
            {isSyncing ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <Database size={18} />
            )}
            {isSyncing ? "Indexing..." : "Index Memories Now"}
          </button>

          {status && (
            <div
              style={{
                fontSize: "0.9rem",
                color: "var(--color-text-secondary)",
              }}
            >
              {status}
            </div>
          )}
        </div>

        {isSyncing && (
          <div
            style={{
              marginTop: "1rem",
              height: "4px",
              background: "var(--color-bg-tertiary)",
              borderRadius: "2px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${progress}%`,
                background: "var(--color-accent-primary)",
                height: "100%",
                transition: "width 0.3s",
              }}
            />
          </div>
        )}
      </section>

      {/* Personal AI Settings Section */}
      <section
        style={{
          background: "var(--color-bg-secondary)",
          padding: "1.5rem",
          borderRadius: "16px",
          border: "1px solid var(--color-border)",
          marginTop: "1.5rem",
        }}
      >
        <h2
          style={{
            fontSize: "1.2rem",
            marginBottom: "1rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <User size={20} />
          パーソナルAI設定
        </h2>
        <p
          style={{
            color: "var(--color-text-secondary)",
            marginBottom: "1.5rem",
            lineHeight: 1.6,
            fontSize: "0.9rem",
          }}
        >
          基本情報や最近の悩みを設定すると、Recallなどの対話がより的確になります。
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.85rem",
                fontWeight: 600,
                marginBottom: "0.5rem",
                color: "var(--color-text-secondary)",
              }}
            >
              基本情報（職業、年齢など）
            </label>
            <textarea
              value={basicInfo}
              onChange={(e) => setBasicInfo(e.target.value)}
              placeholder="例：26歳、フリーランスのデザイナー。副業でWebサービスを開発中。"
              style={{
                width: "100%",
                minHeight: "80px",
                padding: "0.75rem",
                borderRadius: "8px",
                border: "1px solid var(--color-border)",
                background: "var(--color-bg-primary)",
                color: "var(--color-text)",
                fontSize: "0.9rem",
                resize: "vertical",
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.85rem",
                fontWeight: 600,
                marginBottom: "0.5rem",
                color: "var(--color-text-secondary)",
              }}
            >
              最近の悩み・関心事
            </label>
            <textarea
              value={currentConcerns}
              onChange={(e) => setCurrentConcerns(e.target.value)}
              placeholder="例：キャリアの方向性を考え中。サービスの収益化をどう進めるか悩んでいる。"
              style={{
                width: "100%",
                minHeight: "80px",
                padding: "0.75rem",
                borderRadius: "8px",
                border: "1px solid var(--color-border)",
                background: "var(--color-bg-primary)",
                color: "var(--color-text)",
                fontSize: "0.9rem",
                resize: "vertical",
              }}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <button
              onClick={handleSaveProfile}
              disabled={isSavingProfile}
              className="btn-primary"
              style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
            >
              {isSavingProfile ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <Check size={18} />
              )}
              {isSavingProfile ? "保存中..." : "設定を保存"}
            </button>

            {profileStatus && (
              <span
                style={{
                  fontSize: "0.85rem",
                  color: profileStatus.includes("エラー")
                    ? "#ef4444"
                    : "#10b981",
                }}
              >
                {profileStatus}
              </span>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
