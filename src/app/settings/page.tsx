"use client";

import { useState } from "react";
import {
  generateEntryEmbeddingAction,
  listEntriesMissingEmbeddingAction,
} from "@/app/actions";
import { Loader2, Database } from "lucide-react";

export default function SettingsPage() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [progress, setProgress] = useState(0);

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

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "2rem" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "2rem" }}>
        Settings
      </h1>

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
    </div>
  );
}
