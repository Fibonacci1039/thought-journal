"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Topic } from "@/lib/types";
import { createEntryAction } from "@/app/actions";
import { uploadImage } from "@/lib/client-storage";
import { ImageUploader } from "@/components/ImageUploader";
import { Book, Film, Palette, Globe, MoreHorizontal } from "lucide-react";
import { TagInput } from "./TagInput";

type SourceType = "book" | "movie" | "art" | "web" | "other";

const SOURCE_TYPES: {
  value: SourceType;
  label: string;
  icon: React.ReactNode;
}[] = [
  { value: "book", label: "本", icon: <Book size={16} /> },
  { value: "movie", label: "映画", icon: <Film size={16} /> },
  { value: "art", label: "美術館", icon: <Palette size={16} /> },
  { value: "web", label: "Web", icon: <Globe size={16} /> },
  { value: "other", label: "その他", icon: <MoreHorizontal size={16} /> },
];

type Props = {
  topics: Topic[];
};

export function QuoteForm({ topics }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Form state
  const [sourceType, setSourceType] = useState<SourceType>("book");
  const [sourceTitle, setSourceTitle] = useState("");
  const [sourceAuthor, setSourceAuthor] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [page, setPage] = useState("");
  const [quoteText, setQuoteText] = useState("");
  const [myNote, setMyNote] = useState("");
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>([]);

  const [tags, setTags] = useState<string[]>([]);
  const [newImages, setNewImages] = useState<File[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // 引用かメモのどちらかが必要
    if (!quoteText.trim() && !myNote.trim()) {
      alert("引用テキストまたはメモ・感想のどちらかを入力してください");
      return;
    }

    setLoading(true);

    try {
      // Upload Images
      let imageUrls: string[] = [];
      if (newImages.length > 0) {
        imageUrls = await Promise.all(
          newImages.map((file) => uploadImage(file))
        );
      }

      const quoteData = {
        type: "quote",
        source_type: sourceType,
        source_title: sourceTitle,
        source_author: sourceAuthor || undefined,
        source_url: sourceUrl || undefined,
        page: page || undefined,
        quote_text: quoteText,
        my_note: myNote || undefined,
      };

      const result = await createEntryAction({
        title: sourceTitle || "引用",
        human_view: myNote || quoteText,
        ai_view: { schema_version: "2.0", ...quoteData },
        topic_ids: selectedTopicIds,
        tags: tags.length > 0 ? tags : undefined,
        source_url: sourceUrl,
        cite_text: quoteText,
        images: imageUrls,
      });

      if (result.success) {
        router.push("/");
        router.refresh();
      } else {
        alert("error" in result ? result.error : "保存に失敗しました");
      }
    } catch {
      alert("エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: "100%",
    padding: "0.75rem",
    fontSize: "1rem",
    background: "var(--color-bg-primary)",
    color: "var(--color-text-primary)",
    border: "1px solid var(--color-border)",
    borderRadius: "8px",
  };

  const labelStyle = {
    display: "block",
    marginBottom: "0.5rem",
    fontSize: "0.85rem",
    color: "var(--color-text-tertiary)",
    fontWeight: 500 as const,
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Source Type */}
      <div style={{ marginBottom: "1.5rem" }}>
        <label style={labelStyle}>ソースの種類</label>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          {SOURCE_TYPES.map((st) => (
            <button
              key={st.value}
              type="button"
              onClick={() => setSourceType(st.value)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                padding: "0.5rem 0.75rem",
                fontSize: "0.85rem",
                borderRadius: "8px",
                border:
                  sourceType === st.value
                    ? "1px solid var(--color-accent)"
                    : "1px solid var(--color-border)",
                background:
                  sourceType === st.value
                    ? "var(--color-accent-subtle)"
                    : "transparent",
                color:
                  sourceType === st.value
                    ? "var(--color-accent)"
                    : "var(--color-text-secondary)",
                cursor: "pointer",
              }}
            >
              {st.icon} {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* Source Title */}
      <div style={{ marginBottom: "1.5rem" }}>
        <label style={labelStyle}>
          {sourceType === "book"
            ? "本のタイトル"
            : sourceType === "movie"
            ? "映画のタイトル"
            : sourceType === "art"
            ? "展示名 / 美術館名"
            : "ソース名"}
        </label>
        <input
          type="text"
          value={sourceTitle}
          onChange={(e) => setSourceTitle(e.target.value)}
          placeholder="例: 嫌われる勇気"
          style={inputStyle}
        />
      </div>

      {/* Author (optional) */}
      <div style={{ marginBottom: "1.5rem" }}>
        <label style={labelStyle}>
          {sourceType === "book"
            ? "著者"
            : sourceType === "movie"
            ? "監督"
            : "作者 / クリエイター"}
          <span
            style={{ fontWeight: 400, color: "var(--color-text-tertiary)" }}
          >
            {" "}
            (任意)
          </span>
        </label>
        <input
          type="text"
          value={sourceAuthor}
          onChange={(e) => setSourceAuthor(e.target.value)}
          placeholder="例: 岸見一郎"
          style={inputStyle}
        />
      </div>

      {/* Page (for books) */}
      {sourceType === "book" && (
        <div style={{ marginBottom: "1.5rem" }}>
          <label style={labelStyle}>
            ページ
            <span
              style={{ fontWeight: 400, color: "var(--color-text-tertiary)" }}
            >
              {" "}
              (任意)
            </span>
          </label>
          <input
            type="text"
            value={page}
            onChange={(e) => setPage(e.target.value)}
            placeholder="例: 42"
            style={{ ...inputStyle, width: "120px" }}
          />
        </div>
      )}

      {/* URL (optional) */}
      <div style={{ marginBottom: "1.5rem" }}>
        <label style={labelStyle}>
          URL
          <span
            style={{ fontWeight: 400, color: "var(--color-text-tertiary)" }}
          >
            {" "}
            (任意)
          </span>
        </label>
        <input
          type="url"
          value={sourceUrl}
          onChange={(e) => setSourceUrl(e.target.value)}
          placeholder="https://..."
          style={inputStyle}
        />
      </div>

      {/* Images */}
      <ImageUploader images={newImages} onImagesChange={setNewImages} />

      {/* Quote Text */}
      <div style={{ marginBottom: "1.5rem" }}>
        <label style={labelStyle}>
          引用テキスト
          <span
            style={{ fontWeight: 400, color: "var(--color-text-tertiary)" }}
          >
            {" "}
            (任意)
          </span>
        </label>
        <textarea
          value={quoteText}
          onChange={(e) => setQuoteText(e.target.value)}
          placeholder="心に残った言葉や文章..."
          rows={4}
          style={{ ...inputStyle, resize: "vertical" }}
        />
      </div>

      {/* My Note */}
      <div style={{ marginBottom: "1.5rem" }}>
        <label style={labelStyle}>
          自分のメモ・感想
          <span
            style={{ fontWeight: 400, color: "var(--color-text-tertiary)" }}
          >
            {" "}
            (任意)
          </span>
        </label>
        <textarea
          value={myNote}
          onChange={(e) => setMyNote(e.target.value)}
          placeholder="なぜこの言葉が響いたのか、思ったことなど..."
          rows={3}
          style={{ ...inputStyle, resize: "vertical" }}
        />
      </div>

      {/* Topics */}
      {topics.length > 0 && (
        <div style={{ marginBottom: "2rem" }}>
          <label style={labelStyle}>トピック</label>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {topics.map((topic) => {
              const selected = selectedTopicIds.includes(topic.id);
              return (
                <button
                  key={topic.id}
                  type="button"
                  onClick={() =>
                    setSelectedTopicIds(
                      selected
                        ? selectedTopicIds.filter((id) => id !== topic.id)
                        : [...selectedTopicIds, topic.id]
                    )
                  }
                  style={{
                    padding: "0.4rem 0.75rem",
                    fontSize: "0.85rem",
                    borderRadius: "16px",
                    border: selected
                      ? "1px solid var(--color-accent-secondary)"
                      : "1px solid var(--color-border)",
                    background: selected
                      ? "rgba(159, 209, 57, 0.15)"
                      : "transparent",
                    color: selected
                      ? "var(--color-accent-secondary)"
                      : "var(--color-text-secondary)",
                    cursor: "pointer",
                  }}
                >
                  {topic.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Tags */}
      <div style={{ marginBottom: "2rem" }}>
        <label style={labelStyle}>タグ</label>
        <TagInput
          tags={tags}
          onChange={setTags}
          placeholder="タグを入力... (Enter で追加)"
        />
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={loading || (!quoteText.trim() && !myNote.trim())}
        className="btn-primary"
        style={{
          width: "100%",
          opacity: loading || (!quoteText.trim() && !myNote.trim()) ? 0.5 : 1,
          cursor: loading ? "wait" : "pointer",
        }}
      >
        {loading ? "保存中..." : "保存"}
      </button>
    </form>
  );
}
