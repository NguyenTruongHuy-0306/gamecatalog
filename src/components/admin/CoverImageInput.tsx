"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Link, Upload, X } from "lucide-react";
import { Input } from "@/components/ui/input";

interface CoverImageInputProps {
  value: string;
  onChange: (url: string) => void;
  disabled?: boolean;
}

type Mode = "url" | "file";

export function CoverImageInput({ value, onChange, disabled }: CoverImageInputProps) {
  const [mode, setMode] = useState<Mode>("url");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const uploadFile = async (file: File) => {
    setUploadError("");
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await fetch("/api/admin/games/cover", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      onChange(data.url);
    } catch (e: unknown) {
      setUploadError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  };

  return (
    <div className="space-y-3">
      {/* Mode toggle */}
      <div className="flex rounded-md border w-fit overflow-hidden text-sm">
        <button
          type="button"
          onClick={() => setMode("url")}
          disabled={disabled}
          className={`flex items-center gap-1.5 px-3 py-1.5 transition-colors ${
            mode === "url"
              ? "bg-primary text-primary-foreground"
              : "hover:bg-muted text-muted-foreground"
          }`}
        >
          <Link className="h-3.5 w-3.5" />
          URL
        </button>
        <button
          type="button"
          onClick={() => setMode("file")}
          disabled={disabled}
          className={`flex items-center gap-1.5 px-3 py-1.5 transition-colors ${
            mode === "file"
              ? "bg-primary text-primary-foreground"
              : "hover:bg-muted text-muted-foreground"
          }`}
        >
          <Upload className="h-3.5 w-3.5" />
          Upload
        </button>
      </div>

      {/* Input area */}
      {mode === "url" ? (
        <Input
          type="url"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://example.com/cover.jpg"
          disabled={disabled}
        />
      ) : (
        <div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            disabled={disabled || uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadFile(file);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            disabled={disabled || uploading}
            className={`w-full rounded-md border-2 border-dashed p-8 text-center transition-colors disabled:opacity-50 ${
              dragOver
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary hover:bg-muted/40"
            }`}
          >
            {uploading ? (
              <p className="text-sm text-muted-foreground">Uploading…</p>
            ) : (
              <>
                <Upload className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
                <p className="text-sm font-medium">Click to upload or drag and drop</p>
                <p className="text-xs text-muted-foreground mt-1">PNG, JPG, WEBP — max 5 MB</p>
              </>
            )}
          </button>
          {uploadError && (
            <p className="mt-1.5 text-sm text-destructive">{uploadError}</p>
          )}
        </div>
      )}

      {/* Preview */}
      {value && (
        <div className="flex items-start gap-3">
          <div className="relative h-32 w-24 shrink-0 overflow-hidden rounded-md border">
            <Image
              src={value}
              alt="Cover preview"
              fill
              className="object-cover"
              unoptimized
            />
          </div>
          <button
            type="button"
            onClick={() => onChange("")}
            disabled={disabled}
            className="mt-1 flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
          >
            <X className="h-3.5 w-3.5" />
            Remove
          </button>
        </div>
      )}
    </div>
  );
}
