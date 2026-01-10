"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Topic } from "@/lib/types";
import {
  createTopicAction,
  updateTopicAction,
  deleteTopicAction,
} from "@/app/actions";
import {
  Hash,
  Sparkles,
  ChevronRight,
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
} from "lucide-react";

// カラーパレット（トピックごとに異なる色）
const TOPIC_COLORS = [
  {
    bg: "rgba(139, 92, 246, 0.1)",
    accent: "#8b5cf6",
    border: "rgba(139, 92, 246, 0.3)",
  },
  {
    bg: "rgba(16, 185, 129, 0.1)",
    accent: "#10b981",
    border: "rgba(16, 185, 129, 0.3)",
  },
  {
    bg: "rgba(245, 158, 11, 0.1)",
    accent: "#f59e0b",
    border: "rgba(245, 158, 11, 0.3)",
  },
  {
    bg: "rgba(239, 68, 68, 0.1)",
    accent: "#ef4444",
    border: "rgba(239, 68, 68, 0.3)",
  },
  {
    bg: "rgba(59, 130, 246, 0.1)",
    accent: "#3b82f6",
    border: "rgba(59, 130, 246, 0.3)",
  },
  {
    bg: "rgba(236, 72, 153, 0.1)",
    accent: "#ec4899",
    border: "rgba(236, 72, 153, 0.3)",
  },
  {
    bg: "rgba(168, 85, 247, 0.1)",
    accent: "#a855f7",
    border: "rgba(168, 85, 247, 0.3)",
  },
];

function getTopicColor(index: number) {
  return TOPIC_COLORS[index % TOPIC_COLORS.length];
}

export function TopicManager({ initialTopics }: { initialTopics: Topic[] }) {
  const router = useRouter();
  const [topics, setTopics] = useState(initialTopics);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    try {
      const res = await createTopicAction(newName);
      if (!res.success) {
        alert((res as { success: false; error: string }).error);
        return;
      }
      if (res.data) {
        setNewName("");
        setTopics([...topics, res.data]);
        setShowCreateForm(false);
      }
    } catch {
      alert("トピックの作成に失敗しました");
    }
  };

  const startEdit = (t: Topic) => {
    setEditingId(t.id);
    setEditName(t.name);
  };

  const handleUpdate = async (id: string) => {
    try {
      const res = await updateTopicAction(id, editName);
      if (!res.success) {
        alert((res as { success: false; error: string }).error);
        return;
      }
      setTopics(
        topics.map((t) => (t.id === id ? { ...t, name: editName } : t))
      );
      setEditingId(null);
    } catch {
      alert("トピックの更新に失敗しました");
    }
  };

  const handleDelete = async (id: string) => {
    if (
      !confirm(
        "本当に削除しますか？\n（エントリ自体は削除されませんが、タグ付けは解除されます）"
      )
    )
      return;
    try {
      const res = await deleteTopicAction(id);
      if (!res.success) {
        alert((res as { success: false; error: string }).error);
        return;
      }
      setTopics(topics.filter((t) => t.id !== id));
    } catch {
      alert("トピックの削除に失敗しました");
    }
  };

  return (
    <div>
      {/* Header Section */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1.5rem",
        }}
      >
        <div>
          <p
            style={{
              color: "var(--color-text-tertiary)",
              fontSize: "0.9rem",
              margin: 0,
            }}
          >
            AIがトピックごとにエントリーを分析し、傾向とインサイトを発見します
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.6rem 1rem",
            background: showCreateForm
              ? "var(--color-bg-tertiary)"
              : "var(--color-accent)",
            color: showCreateForm ? "var(--color-text-secondary)" : "#fff",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: 500,
            fontSize: "0.9rem",
            transition: "all 0.2s",
          }}
        >
          {showCreateForm ? (
            <>
              <X size={16} /> キャンセル
            </>
          ) : (
            <>
              <Plus size={16} /> 新規トピック
            </>
          )}
        </button>
      </div>

      {/* Create Form (Collapsible) */}
      {showCreateForm && (
        <form
          onSubmit={handleCreate}
          style={{
            marginBottom: "2rem",
            padding: "1.25rem",
            background: "var(--color-bg-tertiary)",
            borderRadius: "12px",
            border: "1px solid var(--color-border)",
          }}
        >
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="トピック名（例: キャリア、健康、家族）"
              autoFocus
              style={{
                flex: 1,
                padding: "0.75rem 1rem",
                fontSize: "1rem",
                border: "1px solid var(--color-border)",
                borderRadius: "8px",
                backgroundColor: "var(--color-bg-primary)",
                color: "var(--color-text-primary)",
              }}
            />
            <button
              type="submit"
              style={{
                padding: "0 1.5rem",
                background: "var(--color-accent)",
                color: "#fff",
                borderRadius: "8px",
                fontWeight: 600,
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <Plus size={16} /> 作成
            </button>
          </div>
        </form>
      )}

      {/* Topics Grid */}
      {topics.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "4rem 2rem",
            background: "var(--color-bg-tertiary)",
            borderRadius: "16px",
            border: "1px dashed var(--color-border)",
          }}
        >
          <Hash
            size={48}
            style={{
              color: "var(--color-text-tertiary)",
              marginBottom: "1rem",
            }}
          />
          <h3
            style={{
              color: "var(--color-text-secondary)",
              marginBottom: "0.5rem",
            }}
          >
            トピックがありません
          </h3>
          <p
            style={{ color: "var(--color-text-tertiary)", fontSize: "0.9rem" }}
          >
            「新規トピック」ボタンから最初のトピックを作成しましょう
          </p>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: "1rem",
          }}
        >
          {topics.map((t, index) => {
            const colors = getTopicColor(index);
            const isEditing = editingId === t.id;

            return (
              <div
                key={t.id}
                style={{
                  padding: "1.25rem",
                  background: colors.bg,
                  border: `1px solid ${colors.border}`,
                  borderRadius: "16px",
                  cursor: isEditing ? "default" : "pointer",
                  transition: "all 0.25s ease",
                  position: "relative",
                }}
                onClick={() => {
                  if (!isEditing) {
                    router.push(`/topics/${t.id}`);
                  }
                }}
                onMouseEnter={(e) => {
                  if (!isEditing) {
                    e.currentTarget.style.transform = "translateY(-4px)";
                    e.currentTarget.style.boxShadow = `0 12px 24px rgba(0,0,0,0.15)`;
                    e.currentTarget.style.borderColor = colors.accent;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isEditing) {
                    e.currentTarget.style.transform = "none";
                    e.currentTarget.style.boxShadow = "none";
                    e.currentTarget.style.borderColor = colors.border;
                  }
                }}
              >
                {isEditing ? (
                  /* Edit Mode */
                  <div onClick={(e) => e.stopPropagation()}>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      autoFocus
                      style={{
                        width: "100%",
                        padding: "0.75rem",
                        marginBottom: "0.75rem",
                        backgroundColor: "var(--color-bg-primary)",
                        color: "var(--color-text-primary)",
                        border: "1px solid var(--color-border)",
                        borderRadius: "8px",
                        fontSize: "1rem",
                      }}
                    />
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <button
                        onClick={() => handleUpdate(t.id)}
                        style={{
                          flex: 1,
                          padding: "0.6rem",
                          background: colors.accent,
                          color: "#fff",
                          border: "none",
                          borderRadius: "6px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "0.3rem",
                          fontWeight: 500,
                        }}
                      >
                        <Check size={14} /> 保存
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        style={{
                          padding: "0.6rem 1rem",
                          background: "var(--color-bg-tertiary)",
                          color: "var(--color-text-secondary)",
                          border: "1px solid var(--color-border)",
                          borderRadius: "6px",
                          cursor: "pointer",
                        }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ) : (
                  /* View Mode */
                  <>
                    {/* Topic Icon & Title */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                        marginBottom: "1rem",
                      }}
                    >
                      <div
                        style={{
                          width: "40px",
                          height: "40px",
                          borderRadius: "10px",
                          background: `${colors.accent}20`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: colors.accent,
                        }}
                      >
                        <Hash size={20} />
                      </div>
                      <h3
                        style={{
                          margin: 0,
                          fontSize: "1.1rem",
                          fontWeight: 600,
                          color: "var(--color-text-primary)",
                          flex: 1,
                        }}
                      >
                        {t.name}
                      </h3>
                    </div>

                    {/* CTA Area */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        paddingTop: "0.75rem",
                        borderTop: `1px solid ${colors.border}`,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.4rem",
                          color: colors.accent,
                          fontSize: "0.85rem",
                          fontWeight: 500,
                        }}
                      >
                        <Sparkles size={14} />
                        <span>AIインサイトを見る</span>
                        <ChevronRight size={14} />
                      </div>

                      {/* Edit/Delete Actions */}
                      <div
                        style={{
                          display: "flex",
                          gap: "0.25rem",
                        }}
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            startEdit(t);
                          }}
                          style={{
                            width: "28px",
                            height: "28px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            background: "rgba(255,255,255,0.1)",
                            border: "none",
                            borderRadius: "6px",
                            cursor: "pointer",
                            color: "var(--color-text-tertiary)",
                            transition: "all 0.2s",
                          }}
                          title="名前変更"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(t.id);
                          }}
                          style={{
                            width: "28px",
                            height: "28px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            background: "rgba(239, 68, 68, 0.1)",
                            border: "none",
                            borderRadius: "6px",
                            cursor: "pointer",
                            color: "#ef4444",
                            transition: "all 0.2s",
                          }}
                          title="削除"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
