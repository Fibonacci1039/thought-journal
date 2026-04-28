"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Entry, Topic } from "@/lib/types";
import {
  createEntryAction,
  enrichEntryAiViewAction,
  updateEntryAction,
} from "@/app/actions";

import { uploadImage } from "@/lib/client-storage";
import { ImageUploader } from "@/components/ImageUploader";
import { Mic, MicOff, Book, Save } from "lucide-react";
import { CompletionRitual } from "./CompletionRitual";

// Extend Window for Speech API

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    speechRecognitionInstance: any;
  }
}

type Props = {
  topics: Topic[];
  initialData?: Entry;
  presetPrompt?: string;
  initialTitle?: string;
  initialNarrative?: string;
  initialAiView?: Record<string, unknown>;
};

// Default AI View structure
const DEFAULT_AI_VIEW = {
  schema_version: "2.1",
  type: "journal",
  reflection_assets: {
    concerns: [],
    emotions: [],
    values: [],
    next_actions: [],
    questions_for_future: [],
  },
};

export function EntryForm({
  topics,
  initialData,
  presetPrompt,
  initialTitle,
  initialNarrative,
  initialAiView,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showRitual, setShowRitual] = useState(false);

  // Minimalist Form State
  const [title, setTitle] = useState(
    initialData?.title || initialTitle || ""
  );
  const [narrative, setNarrative] = useState(
    initialData?.human_view || initialNarrative || ""
  );
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>(
    initialData?.topic_ids || []
  );

  // Reference Capture State
  const [isReferenceMode, setIsReferenceMode] = useState(
    !!(initialData?.source_url || initialData?.cite_text)
  );
  const [sourceUrl, setSourceUrl] = useState(initialData?.source_url || "");
  const [citeText, setCiteText] = useState(initialData?.cite_text || "");

  // Image Upload State
  const [newImages, setNewImages] = useState<File[]>([]);
  // Store valid URLs of existing images (filtering out deletions logic can be added later if needed)
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>(
    initialData?.images || []
  );

  const handleExistingImageRemove = (url: string) => {
    setExistingImageUrls((prev) => prev.filter((u) => u !== url));
  };

  // Voice Input State
  const [isListening, setIsListening] = useState(false);

  const toggleListening = () => {
    if (isListening) {
      setIsListening(false);
      // Logic to stop handled by useEffect cleanup or native behavior?
      // Actually, simple start/stop logic:
      window.speechRecognitionInstance?.stop();
    } else {
      /* eslint-disable @typescript-eslint/no-explicit-any */
      const SpeechRecognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;
      /* eslint-enable @typescript-eslint/no-explicit-any */
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

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- SpeechRecognitionEvent not available in TypeScript
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

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- SpeechRecognitionErrorEvent not available in TypeScript
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
      : initialAiView
      ? JSON.stringify(initialAiView, null, 2)
      : ""
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!narrative.trim()) {
      alert("思考ログを入力してください");
      return;
    }

    // Parse AI JSON Key
    let parsedAiView: Record<string, unknown> =
      initialData?.ai_view || DEFAULT_AI_VIEW;
    if (aiJsonInput.trim()) {
      try {
        // Remove markdown code blocks if present
        const cleaned = aiJsonInput
          .replace(/```json/g, "")
          .replace(/```/g, "")
          .trim();
        parsedAiView = JSON.parse(cleaned);
      } catch {
        alert(
          "AIデータのJSON形式が正しくありません。\n確認して修正するか、空欄にしてください。"
        );
        return;
      }
    }

    // Include preset prompt in AI view if provided
    if (presetPrompt && !initialData) {
      parsedAiView = {
        ...parsedAiView,
        session_prompt: presetPrompt,
      };
    }

    setLoading(true);

    try {
      // 1. Upload Images
      let finalImageUrls = [...existingImageUrls];
      if (newImages.length > 0) {
        // Upload concurrently
        const uploadedUrls = await Promise.all(
          newImages.map((file) => uploadImage(file))
        );
        finalImageUrls = [...finalImageUrls, ...uploadedUrls];
      }

      const payload = {
        title: title,
        human_view: narrative,
        ai_view: parsedAiView,
        topic_ids: selectedTopicIds,
        source_url: sourceUrl,
        cite_text: citeText,
        // entry_type is inferred? or default 'journal'
        images: finalImageUrls,
      };

      const res = initialData
        ? await updateEntryAction(initialData.id, payload)
        : await createEntryAction(payload);

      if (!res.success) {
        const errorMsg = (res as { success: false; error: string }).error;
        throw new Error(errorMsg);
      }

      if ("data" in res && res.data?.id) {
        void enrichEntryAiViewAction(res.data.id);
      }

      // Instead of alert/push immediate, trigger ritual
      setShowRitual(true);
    } catch (e: unknown) {
      const msg =
        e instanceof Error ? e.message : "保存中にエラーが発生しました";
      alert(msg);
      setLoading(false);
    }
  };

  const handleRitualComplete = () => {
    router.push("/");
    router.refresh();
  };

  const toggleTopic = (tid: string) => {
    setSelectedTopicIds((prev) =>
      prev.includes(tid) ? prev.filter((id) => id !== tid) : [...prev, tid]
    );
  };

  return (
    <>
      <form
        onSubmit={handleSubmit}
        className="animate-enter"
        style={{
          maxWidth: "700px",
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: "2rem",
        }}
      >
        {/* 1. Header: Date & Title */}
        <div style={{ textAlign: "center" }}>
          <p className="text-label" style={{ marginBottom: "0.5rem" }}>
            {new Date().toLocaleDateString("ja-JP", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="タイトルを入力..."
            style={{
              width: "100%",
              textAlign: "center",
              fontSize: "2rem",
              fontWeight: 700,
              border: "none",
              outline: "none",
              background: "transparent",
              color: "var(--color-heading)",
              fontFamily: "var(--font-sans)",
              letterSpacing: "-0.02em",
            }}
          />
        </div>

        {/* 2. Zen Editor "Paper" */}
        <div style={{ position: "relative" }}>
          <textarea
            required
            autoFocus={!initialData}
            value={narrative}
            onChange={(e) => setNarrative(e.target.value)}
            placeholder="今、何を考えていますか？"
            style={{
              width: "100%",
              minHeight: "400px",
              lineHeight: 1.8,
              fontSize: "1.15rem", // Slightly larger for comfortable writing
              fontFamily: "var(--font-sans)",
              border: "none",
              outline: "none",
              resize: "none",
              backgroundColor: "transparent", // Blend into the page like Reflection.app
              color: "var(--color-text-primary)",
            }}
          />

          {/* Floating Controls (Voice / Ref) - Subtle */}
          <div
            style={{
              position: "absolute",
              top: "-2rem",
              right: "0",
              display: "flex",
              gap: "1rem",
              opacity: 0.6,
              transition: "opacity 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.6")}
          >
            <button
              type="button"
              onClick={toggleListening}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.3rem",
                fontSize: "0.9rem",
                cursor: "pointer",
              }}
              title={isListening ? "音声入力を停止" : "音声入力を開始"}
            >
              {isListening ? (
                <MicOff size={18} color="#ef4444" />
              ) : (
                <Mic size={18} />
              )}
            </button>
            <button
              type="button"
              onClick={() => setIsReferenceMode(!isReferenceMode)}
              style={{ fontSize: "0.9rem", cursor: "pointer" }}
              title="参考文献・引用を追加"
            >
              <Book size={18} />
            </button>
          </div>

          {/* Reference Panel (Conditional) */}
          {isReferenceMode && (
            <div
              className="glass-card"
              style={{
                padding: "1rem",
                marginTop: "1rem",
                background: "var(--color-bg-tertiary)",
              }}
            >
              <input
                type="url"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="参考URL (https://...)"
                className="input-field"
                style={{
                  marginBottom: "0.5rem",
                  fontSize: "0.9rem",
                  padding: "0.5rem",
                }}
              />
              <textarea
                value={citeText}
                onChange={(e) => setCiteText(e.target.value)}
                placeholder="引用テキストやメモ..."
                style={{
                  width: "100%",
                  border: "1px solid var(--color-border)",
                  borderRadius: "8px",
                  padding: "0.5rem",
                }}
              />
            </div>
          )}
        </div>

        <ImageUploader
          images={newImages}
          onImagesChange={setNewImages}
          existingImages={existingImageUrls}
          onExistingImageRemove={handleExistingImageRemove}
        />

        {/* 3. Footer Meta (Topics & Save) */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderTop: "1px solid var(--color-border)",
            paddingTop: "2rem",
            marginTop: "2rem",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: "0.5rem",
              flexWrap: "wrap",
              maxWidth: "70%",
            }}
          >
            {topics.map((t) => (
              <button
                type="button"
                key={t.id}
                onClick={() => toggleTopic(t.id)}
                style={{
                  fontSize: "0.8rem",
                  padding: "0.3rem 0.8rem",
                  borderRadius: "20px",
                  fontWeight: 500,
                  background: selectedTopicIds.includes(t.id)
                    ? "rgba(255, 159, 10, 0.2)" // Orange Tint
                    : "rgba(255,255,255,0.05)",
                  color: selectedTopicIds.includes(t.id)
                    ? "var(--color-accent-primary)" // Orange Text
                    : "var(--color-text-secondary)",
                  border: selectedTopicIds.includes(t.id)
                    ? "1px solid var(--color-accent-primary)"
                    : "1px solid transparent",
                  transition: "all 0.2s ease",
                }}
              >
                {t.name}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", gap: "1rem" }}>
            <span
              style={{
                fontSize: "0.8rem",
                color: "var(--color-text-tertiary)",
                alignSelf: "center",
              }}
            >
              {narrative.length} 文字
            </span>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
            >
              <Save size={16} />
              {loading ? "保存中..." : "保存する"}
            </button>
          </div>
        </div>

        {/* Hidden Technical Fields (Summary of AI view, etc) 
          If strictly needed, keep them collapsed. For a Zen User, they don't need to see JSON input usually. 
      */}
        <details style={{ marginTop: "2rem" }} open>
          <summary
            style={{
              cursor: "pointer",
              color: "var(--color-text-tertiary)",
              fontSize: "0.8rem",
            }}
          >
            高度な設定: AI JSONデータ
          </summary>
          <textarea
            value={aiJsonInput}
            onChange={(e) => setAiJsonInput(e.target.value)}
            style={{
              width: "100%",
              height: "100px",
              marginTop: "0.5rem",
              padding: "0.5rem",
              fontSize: "0.8rem",
              fontFamily: "var(--font-sans)",
              backgroundColor: "#333", // Light Gray (relative to dark theme)
              color: "#fff",
              border: "1px solid var(--color-border)",
              borderRadius: "8px",
            }}
          />
        </details>
      </form>
      <CompletionRitual
        isVisible={showRitual}
        onComplete={handleRitualComplete}
      />
    </>
  );
}
