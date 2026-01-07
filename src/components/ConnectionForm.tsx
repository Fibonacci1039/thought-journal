"use client";

import { useState } from "react";
import { Topic } from "@/lib/types";
import { createTopicRelationshipAction } from "@/app/actions";

export function ConnectionForm({ topics }: { topics: Topic[] }) {
  const [source, setSource] = useState("");
  const [target, setTarget] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!source || !target || source === target) {
      alert("異なる2つのトピックを選択してください");
      return;
    }

    setLoading(true);
    const res = await createTopicRelationshipAction(source, target);
    setLoading(false);

    if (res.success) {
      alert("接続しました！");
      setSource("");
      setTarget("");
      // Logic to refresh graph? simple refresh page
      // window.location.reload(); // naive reload
    } else {
      alert(res.error || "エラーが発生しました");
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: "flex",
        gap: "1rem",
        alignItems: "center",
        flexWrap: "wrap",
      }}
    >
      <select
        value={source}
        onChange={(e) => setSource(e.target.value)}
        required
        style={{
          padding: "0.5rem",
          borderRadius: "8px",
          border: "1px solid #ccc",
        }}
      >
        <option value="">(元トピック)</option>
        {topics.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>

      <span>→</span>

      <select
        value={target}
        onChange={(e) => setTarget(e.target.value)}
        required
        style={{
          padding: "0.5rem",
          borderRadius: "8px",
          border: "1px solid #ccc",
        }}
      >
        <option value="">(先トピック)</option>
        {topics.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>

      <button
        type="submit"
        disabled={loading}
        style={{
          padding: "0.5rem 1rem",
          borderRadius: "20px",
          border: "none",
          backgroundColor: "var(--color-accent-primary)",
          color: "#fff",
          cursor: "pointer",
        }}
      >
        {loading ? "接続中..." : "接続する"}
      </button>
    </form>
  );
}
