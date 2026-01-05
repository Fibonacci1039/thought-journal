"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Topic } from "@/lib/types";
import Link from "next/link";

export function TopicManager({
  initialTopics,
  apiToken,
}: {
  initialTopics: Topic[];
  apiToken: string;
}) {
  const router = useRouter();
  const [topics, setTopics] = useState(initialTopics);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    try {
      const res = await fetch("/api/topics", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-app-token": apiToken,
        },
        body: JSON.stringify({ name: newName }), // Use 'name' per new schema? API updated to 'title' in previous step?
        // Wait, I updated 'POST /api/topics' to check for 'title' but I WANT 'name'.
        // I actually updated POST /api/topics to read 'title' but createTopic expects 'name'.
        // Re-read step 147 (route.ts content): "const body = await req.json(); if (!body.title) ... createTopic(body.title)".
        // createTopic was defined in step 140 as: `export async function createTopic(name: string)`
        // So the API route is inconsistent with the Frontend update plan?
        // Plan said: "Update TopicManager (title -> name)".
        // I should send `name` here, and API should expect `name`.
        // Let's assume API will be fixed or I should send `title` to match API?
        // No, I want to migrate to `name`.
        // I will fix this component to send `name`.
        // But if API expects `title`, it will fail.
        // Let's check API again. Previous step 147: `if (!body.title) return error`.
        // So I must send `title` OR update API.
        // I'll update API to expect `name` in next step or now if I can?
        // I can only edit one file at a time or multi.
        // I will update TopicManager here to use `name` and I will update the API route to match `name` in a subsequent step or rely on what I "thought" I did?
        // Actually, in step 142 I wrote POST /api/topics to check `body.title`. I should have made it `body.name`.
        // I will fix API route in next step. For now, let's write TopicManager using `name` field in UI and state, but sending `name` in body.
      });
      if (res.ok) {
        setNewName("");
        router.refresh();
        const created = await res.json();
        setTopics([...topics, created]);
      }
    } catch {
      alert("トピックの作成に失敗しました");
    }
  };

  const startEdit = (t: Topic) => {
    setEditingId(t.id); // Use id
    setEditName(t.name); // Use name
  };

  const handleUpdate = async (id: string) => {
    try {
      const res = await fetch(`/api/topics/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-app-token": apiToken,
        },
        body: JSON.stringify({ name: editName }), // Use name
      });
      if (res.ok) {
        setTopics(
          topics.map((t) => (t.id === id ? { ...t, name: editName } : t))
        );
        setEditingId(null);
        router.refresh();
      }
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
      const res = await fetch(`/api/topics/${id}`, {
        method: "DELETE",
        headers: {
          "x-app-token": apiToken,
        },
      });
      if (res.ok) {
        setTopics(topics.filter((t) => t.id !== id));
        router.refresh();
      }
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
