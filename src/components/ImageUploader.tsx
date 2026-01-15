"use client";

import { useState, useRef, useEffect } from "react";
import { X, Upload } from "lucide-react";

type Props = {
  images: File[];
  onImagesChange: (images: File[]) => void;
  // Previously uploaded image URLs (for edit mode)
  existingImages?: string[];
  onExistingImageRemove?: (url: string) => void;
};

export function ImageUploader({
  images,
  onImagesChange,
  existingImages = [],
  onExistingImageRemove,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<string[]>([]);

  // Create previews for new files
  useEffect(() => {
    const newPreviews = images.map((file) => URL.createObjectURL(file));
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Deriving state from prop for preview URLs
    setPreviews(newPreviews);

    // Cleanup
    return () => {
      newPreviews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [images]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      // Validate types if needed
      const validFiles = selectedFiles.filter((file) =>
        file.type.startsWith("image/")
      );
      onImagesChange([...images, ...validFiles]);
    }
  };

  const removeNewImage = (index: number) => {
    const newImages = [...images];
    newImages.splice(index, 1);
    onImagesChange(newImages);
  };

  return (
    <div style={{ marginBottom: "1rem" }}>
      <label
        style={{
          display: "block",
          marginBottom: "0.5rem",
          fontSize: "0.9rem",
          fontWeight: 600,
          color: "var(--color-text-secondary)",
        }}
      >
        画像
      </label>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
        {/* Existing Images */}
        {existingImages.map((url) => (
          <div
            key={url}
            style={{
              position: "relative",
              width: "80px",
              height: "80px",
              borderRadius: "8px",
              overflow: "hidden",
              border: "1px solid var(--color-border)",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt="Uploaded"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
            {onExistingImageRemove && (
              <button
                type="button"
                onClick={() => onExistingImageRemove(url)}
                style={{
                  position: "absolute",
                  top: "2px",
                  right: "2px",
                  background: "rgba(0,0,0,0.6)",
                  color: "white",
                  border: "none",
                  borderRadius: "50%",
                  width: "20px",
                  height: "20px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                <X size={12} />
              </button>
            )}
          </div>
        ))}

        {/* New Image Previews */}
        {previews.map((url, index) => (
          <div
            key={url}
            style={{
              position: "relative",
              width: "80px",
              height: "80px",
              borderRadius: "8px",
              overflow: "hidden",
              border: "1px solid var(--color-border)",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt="Preview"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
            <button
              type="button"
              onClick={() => removeNewImage(index)}
              style={{
                position: "absolute",
                top: "2px",
                right: "2px",
                background: "rgba(0,0,0,0.6)",
                color: "white",
                border: "none",
                borderRadius: "50%",
                width: "20px",
                height: "20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                padding: 0,
              }}
            >
              <X size={12} />
            </button>
          </div>
        ))}

        {/* Upload Button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          style={{
            width: "80px",
            height: "80px",
            borderRadius: "8px",
            border: "1px dashed var(--color-border)",
            background: "var(--color-bg-tertiary)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "var(--color-text-tertiary)",
            gap: "4px",
          }}
        >
          <Upload size={20} />
          <span style={{ fontSize: "0.7rem" }}>追加</span>
        </button>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept="image/*"
        multiple
        style={{ display: "none" }}
      />
    </div>
  );
}
