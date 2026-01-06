"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Entry, Topic } from "@/lib/types";
import { createEntryAction, updateEntryAction } from "@/app/actions";

// Extend Window for Speech API
declare global {
  interface Window {
    speechRecognitionInstance: any;
  }
}

type Props = {
  topics: Topic[];
  initialData?: Entry;
};

// Default AI View structure
const DEFAULT_AI_VIEW = {
  schema_version: "1.0",
};

export function EntryForm({ topics, initialData }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Minimalist Form State
  const [title, setTitle] = useState(initialData?.title || "");
  const [narrative, setNarrative] = useState(initialData?.human_view || "");
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>(
    initialData?.topic_ids || []
  );

  // Voice Input State
  const [isListening, setIsListening] = useState(false);

  const toggleListening = () => {
    if (isListening) {
      setIsListening(false);
      // Logic to stop handled by useEffect cleanup or native behavior?
      // Actually, simple start/stop logic:
      window.speechRecognitionInstance?.stop();
    } else {
      const SpeechRecognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        alert(
          "お使いのブラウザは音声入力に対応していません (Chrome/Safari推奨)"
        );
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.lang = "ja-JP";
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);

      recognition.onresult = (event: any) => {
        let finalTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          setNarrative((prev) => prev + (prev ? "\n" : "") + finalTranscript);
        }
      };

      recognition.onerror = (event: any) => {
        console.error(event.error);
        setIsListening(false);
      };

      recognition.start();
      // Keep reference to stop later
      window.speechRecognitionInstance = recognition;
    }
  };

  // AI View Input State
  const [aiJsonInput, setAiJsonInput] = useState(
    initialData?.ai_view && Object.keys(initialData.ai_view).length > 1
      ? JSON.stringify(initialData.ai_view, null, 2)
      : ""
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!narrative.trim()) {
      alert("思考ログを入力してください");
      return;
    }

    // Parse AI JSON Key
    let parsedAiView = initialData?.ai_view || DEFAULT_AI_VIEW;
    if (aiJsonInput.trim()) {
      try {
        // Remove markdown code blocks if present
        const cleaned = aiJsonInput
          .replace(/```json/g, "")
          .replace(/```/g, "")
          .trim();
        parsedAiView = JSON.parse(cleaned);
      } catch (err) {
        alert(
          "AIデータのJSON形式が正しくありません。\n確認して修正するか、空欄にしてください。"
        );
        return;
      }
    }

    setLoading(true);

    try {
      const payload = {
        title: title,
        human_view: narrative,
        ai_view: parsedAiView,
        topic_ids: selectedTopicIds,
        // Mood is removed from input
      };

      const res = initialData
        ? await updateEntryAction(initialData.id, payload)
        : await createEntryAction(payload);

      if (!res.success) {
        const errorMsg = (res as { success: false; error: string }).error;
        throw new Error(errorMsg);
      }

      alert("記録しました");
      router.push("/");
      router.refresh();
    } catch (e: any) {
      const msg =
        e instanceof Error ? e.message : "保存中にエラーが発生しました";
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  const toggleTopic = (tid: string) => {
    setSelectedTopicIds((prev) =>
      prev.includes(tid) ? prev.filter((id) => id !== tid) : [...prev, tid]
    );
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}
    >
      {/* 0. Title Input */}
      <div>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="タイトル (任意)"
          style={{
            width: "100%",
            padding: "1rem 0",
            fontSize: "1.5rem",
            fontWeight: 700,
            border: "none",
            borderBottom: "1px solid var(--color-border)",
            outline: "none",
            backgroundColor: "transparent",
            color: "var(--color-heading)",
          }}
        />
      </div>

      {/* 1. Main Input (Focus) */}
      <div style={{ position: "relative" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: "0.5rem",
          }}
        >
          <label
            style={{
              fontWeight: 600,
              fontSize: "0.9rem",
              color: "var(--color-text)",
            }}
          >
            Human View (人間向けの文章)
          </label>
          <button
            type="button"
            onClick={toggleListening}
            style={{
              border: "none",
              background: isListening ? "var(--color-accent-primary)" : "#eee",
              color: isListening ? "#fff" : "var(--color-text)",
              borderRadius: "20px",
              padding: "0.4rem 1rem",
              fontSize: "0.85rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              transition: "all 0.2s",
            }}
          >
            <span>{isListening ? "■ 停止" : "🎙️ 音声入力"}</span>
          </button>
        </div>

        <textarea
          required
          autoFocus={!initialData}
          value={narrative}
          onChange={(e) => setNarrative(e.target.value)}
          placeholder={
            isListening
              ? "お話しください..."
              : "今、頭の中にあることをそのまま書いてください..."
          }
          style={{
            width: "100%",
            minHeight: "200px",
            padding: "1.5rem",
            lineHeight: 1.8,
            fontSize: "1.1rem",
            fontFamily: "var(--font-sans)",
            border: isListening
              ? "2px solid var(--color-accent-primary)"
              : "none",
            borderRadius: "12px",
            backgroundColor: "#fff",
            boxShadow:
              "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)",
            resize: "vertical",
            outline: "none",
            transition: "border 0.2s",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "1rem",
            right: "1rem",
            fontSize: "0.8rem",
            color: "var(--color-subtle)",
          }}
        >
          {narrative.length}文字
        </div>
      </div>

      {/* 2. AI Data Input (Optional) */}
      <div>
        <label
          style={{
            display: "block",
            marginBottom: "0.5rem",
            fontWeight: 600,
            fontSize: "0.9rem",
            color: "var(--color-text)",
          }}
        >
          AI Knowledge (JSONデータ){" "}
          <span style={{ fontWeight: 400, color: "var(--color-subtle)" }}>
            ※任意
          </span>
        </label>
        <textarea
          value={aiJsonInput}
          onChange={(e) => setAiJsonInput(e.target.value)}
          placeholder={
            '{\n  "ai_view": { ... }\n}\nまたは外部AIの出力JSONをそのまま貼り付け'
          }
          style={{
            width: "100%",
            minHeight: "120px",
            padding: "1rem",
            fontSize: "0.85rem",
            fontFamily: "monospace",
            border: "1px solid var(--color-border)",
            borderRadius: "8px",
            backgroundColor: "#fafafa",
            resize: "vertical",
          }}
        />
        <p
          style={{
            fontSize: "0.8rem",
            color: "var(--color-subtle)",
            marginTop: "0.3rem",
          }}
        >
          「AI向けプロンプト」を使って生成されたJSONをここに貼り付けると、分析精度が向上します。
        </p>
      </div>

      {/* 3. Meta & Actions */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end", // Align bottom to keep buttons grounded
          gap: "1rem",
        }}
      >
        {/* Topics */}
        <div style={{ flex: 1, marginRight: "1rem" }}>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "0.5rem",
              alignItems: "center",
            }}
          >
            <span
              style={{
                fontSize: "0.9rem",
                color: "var(--color-subtle)",
                marginRight: "0.5rem",
              }}
            >
              トピック:
            </span>
            {topics.map((t) => (
              <button
                type="button"
                key={t.id}
                onClick={() => toggleTopic(t.id)}
                style={{
                  padding: "0.3rem 0.8rem",
                  fontSize: "0.85rem",
                  border: "1px solid",
                  borderColor: selectedTopicIds.includes(t.id)
                    ? "var(--color-accent-primary)"
                    : "transparent",
                  backgroundColor: selectedTopicIds.includes(t.id)
                    ? "var(--color-accent-primary)"
                    : "#f0f0f0",
                  color: selectedTopicIds.includes(t.id)
                    ? "#fff"
                    : "var(--color-text)",
                  borderRadius: "20px",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
              >
                {t.name}
              </button>
            ))}
          </div>
        </div>

        {/* Actions - Resized to be more compact */}
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <button
            type="button"
            onClick={() => router.back()}
            style={{
              padding: "0.6rem 1rem",
              fontSize: "0.9rem",
              color: "var(--color-subtle)",
              background: "transparent",
              border: "none",
              cursor: "pointer",
            }}
          >
            キャンセル
          </button>
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: "0.6rem 1.5rem",
              fontSize: "0.9rem",
              backgroundColor: "var(--color-text)",
              color: "var(--color-base)",
              borderRadius: "20px",
              fontWeight: 600,
              border: "none",
              opacity: loading ? 0.7 : 1,
              cursor: loading ? "wait" : "pointer",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
              whiteSpace: "nowrap",
            }}
          >
            {loading ? "保存中..." : "保存する"}
          </button>
        </div>
      </div>
    </form>
  );
}
