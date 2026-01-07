"use client";

import { useState, useRef, KeyboardEvent } from "react";
import { X } from "lucide-react";

type Props = {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
};

export function TagInput({
  tags,
  onChange,
  placeholder = "タグを入力...",
}: Props) {
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const addTag = (tag: string) => {
    const trimmed = tag.trim().toLowerCase();
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
    }
    setInputValue("");
  };

  const removeTag = (tagToRemove: string) => {
    onChange(tags.filter((t) => t !== tagToRemove));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === "Backspace" && inputValue === "" && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "0.5rem",
        padding: "0.5rem",
        background: "var(--color-bg-primary)",
        border: "1px solid var(--color-border)",
        borderRadius: "8px",
        minHeight: "44px",
        cursor: "text",
      }}
      onClick={() => inputRef.current?.focus()}
    >
      {tags.map((tag) => (
        <span
          key={tag}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.25rem",
            padding: "0.25rem 0.5rem",
            background: "rgba(167, 139, 250, 0.2)",
            color: "#a78bfa",
            borderRadius: "4px",
            fontSize: "0.85rem",
          }}
        >
          #{tag}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              removeTag(tag);
            }}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              cursor: "pointer",
              color: "#a78bfa",
              display: "flex",
              alignItems: "center",
            }}
          >
            <X size={14} />
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          if (inputValue.trim()) addTag(inputValue);
        }}
        placeholder={tags.length === 0 ? placeholder : ""}
        style={{
          flex: 1,
          minWidth: "80px",
          background: "transparent",
          border: "none",
          outline: "none",
          fontSize: "0.9rem",
          color: "var(--color-text-primary)",
          padding: "0.25rem",
        }}
      />
    </div>
  );
}
