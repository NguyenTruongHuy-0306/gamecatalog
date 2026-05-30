"use client";

import { useRef, useState } from "react";
import { Camera, Trash2, Loader2, ImagePlus } from "lucide-react";
import { apiError } from "@/lib/client-error";

interface AvatarUploadProps {
  currentUrl: string | null;
  initials: string;
  onSave: (url: string | null) => void;
  uploadUrl?: string;   // defaults to /api/user/avatar
  deleteUrl?: string;   // defaults to /api/user/avatar
}

export function AvatarUpload({
  currentUrl,
  initials,
  onSave,
  uploadUrl = "/api/user/avatar",
  deleteUrl = "/api/user/avatar",
}: AvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentUrl);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState("");

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file (JPG, PNG, WebP…)");
      return;
    }
    if (file.size > 5_000_000) {
      setError("File must be under 5 MB.");
      return;
    }

    setError("");
    setUploading(true);

    // Optimistic local preview while uploading
    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);

    try {
      const form = new FormData();
      form.append("image", file);

      const res = await fetch(uploadUrl, { method: "POST", body: form });
      const data = await res.json();

      URL.revokeObjectURL(localUrl);

      if (!res.ok) {
        setPreview(currentUrl);
        setError(apiError(data, "Upload failed. Please try again."));
        return;
      }

      setPreview(data.url);
      onSave(data.url);
    } catch {
      URL.revokeObjectURL(localUrl);
      setPreview(currentUrl);
      setError("Network error. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    setError("");
    setRemoving(true);
    try {
      const res = await fetch(deleteUrl, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        setError(apiError(data, "Failed to remove avatar."));
        return;
      }
      setPreview(null);
      onSave(null);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setRemoving(false);
    }
  };

  const busy = uploading || removing;

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Avatar circle */}
      <div className="relative group">
        <div className="h-24 w-24 rounded-full overflow-hidden ring-4 ring-primary/20 shadow-lg shadow-primary/10">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview}
              alt="Your avatar"
              className={`h-full w-full object-cover transition-opacity duration-200 ${uploading ? "opacity-60" : ""}`}
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-primary/60 to-primary flex items-center justify-center text-primary-foreground text-2xl font-bold select-none">
              {initials}
            </div>
          )}
        </div>

        {/* Hover overlay */}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          aria-label="Change avatar"
          className="absolute inset-0 rounded-full bg-black/50 flex flex-col items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer disabled:cursor-wait"
        >
          {uploading
            ? <Loader2 className="h-6 w-6 text-white animate-spin" />
            : <Camera className="h-6 w-6 text-white" />}
          {!uploading && <span className="text-white text-[10px] font-medium">Change</span>}
        </button>
      </div>

      {/* Action links */}
      <div className="flex items-center gap-2 text-xs">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="flex items-center gap-1 font-medium text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
        >
          <ImagePlus className="h-3.5 w-3.5" />
          {preview ? "Change photo" : "Upload photo"}
        </button>

        {preview && !uploading && (
          <>
            <span className="text-muted-foreground">·</span>
            <button
              type="button"
              onClick={handleRemove}
              disabled={busy}
              className="flex items-center gap-1 font-medium text-destructive hover:text-destructive/80 transition-colors disabled:opacity-50"
            >
              {removing
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <Trash2 className="h-3.5 w-3.5" />}
              {removing ? "Removing…" : "Remove"}
            </button>
          </>
        )}
      </div>

      <p className="text-xs text-muted-foreground">JPG, PNG or WebP · max 5 MB · stored on Cloudinary CDN</p>

      {error && (
        <p className="text-xs text-destructive text-center max-w-[220px]">{error}</p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="sr-only"
        onChange={handleFile}
        aria-hidden
      />
    </div>
  );
}
