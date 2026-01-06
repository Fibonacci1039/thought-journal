"use client";

import { useState } from "react";
import { Topic } from "@/lib/types";
import Link from "next/link";
import {
  createTopicAction,
  updateTopicAction,
  deleteTopicAction,
} from "@/app/actions";

export function TopicManager({ initialTopics }: { initialTopics: Topic[] }) {
  // We can still use local state for optimistic UI or just simple refetching via Next.js
  // Since server actions revalidatePath, new data will come in if we are using useOptimistic or just rendering props.
  // HOWEVER, initialTopics is just initial. We need to handle updates.
  // Actually, since revalidatePath refreshes the Server Component, the parent Page will re-render and pass fresh initialTopics?
  // Yes, if using router.refresh() or if the action was generic.
  // But wait, router.refresh() is needed if we want to re-fetch the server component payload.
  // revalidatePath in Server Action does purge cache, but in a client component we might not see it immediately unless we router.refresh() or if Next.js handles it automatically for form actions.
  // Let's stick to the existing pattern: update local state for immediate feedback, but also trust revalidation.
  // Actually, simpler: The parent passes updated topics if the page reloads.
  // But to avoid full page reload feel, we rely on router.refresh().
  // Even better: use local state as the source of truth for the LIST, updating it on success.
  // Assuming the `initialTopics` prop updates when parent re-renders?

  const [topics, setTopics] = useState(initialTopics);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  // Note: If the parent re-renders with new initialTopics (due to revalidatePath triggering page update),
  // we might want to sync 'topics'. But 'useState(initialTopics)' only runs once.
  // Standard Next.js pattern: use `useRouter` to refresh.
  // Or just rely on local state updates if we return the new object from action.

  // Let's keep local state management for instant feedback and simplicity.

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    try {
      const res = await createTopicAction(newName);
      if (!res.success) {
        alert((res as { success: false; error: string }).error);
        return;
      }
      // res.success is true, so res.data is available
      if (res.data) {
        setNewName("");
        setTopics([...topics, res.data]);
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
      {/* Create Form */}
      <form
        onSubmit={handleCreate}
        style={{ marginBottom: "2rem", display: "flex", gap: "1rem" }}
      >
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="新しいトピック名"
          style={{
            flexGrow: 1,
            padding: "0.5rem",
            border: "1px solid var(--color-border)",
            borderRadius: "4px",
          }}
        />
        <button
          type="submit"
          style={{
            padding: "0.5rem 1rem",
            background: "var(--color-text)",
            color: "var(--color-base)",
            borderRadius: "4px",
          }}
        >
          追加
        </button>
      </form>

      {/* List */}
      <div style={{ display: "grid", gap: "1rem" }}>
        {topics.map((t) => (
          <div
            key={t.id}
            style={{
              padding: "1rem",
              border: "1px solid var(--color-border)",
              borderRadius: "4px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            {editingId === t.id ? (
              <div style={{ display: "flex", gap: "0.5rem", flexGrow: 1 }}>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  style={{ flexGrow: 1, padding: "0.25rem" }}
                  autoFocus
                />
                <button
                  onClick={() => handleUpdate(t.id)}
                  style={{ fontSize: "0.9rem" }}
                >
                  保存
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  style={{ color: "var(--color-subtle)", fontSize: "0.9rem" }}
                >
                  キャンセル
                </button>
              </div>
            ) : (
              <>
                <Link
                  href={`/topics/${t.id}`}
                  style={{
                    textDecoration: "none",
                    color: "inherit",
                    fontWeight: 500,
                  }}
                >
                  {t.name}
                </Link>
                <div
                  style={{ display: "flex", gap: "1rem", fontSize: "0.85rem" }}
                >
                  <button
                    onClick={() => startEdit(t)}
                    style={{ color: "var(--color-subtle)" }}
                  >
                    名前変更
                  </button>
                  <button
                    onClick={() => handleDelete(t.id)}
                    style={{ color: "var(--color-subtle)" }}
                  >
                    削除
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
