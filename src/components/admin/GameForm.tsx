"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { X } from "lucide-react";
import { CoverImageInput } from "@/components/admin/CoverImageInput";

interface Genre {
  id: string;
  name: string;
  slug: string;
}

interface GameFormProps {
  genres: Genre[];
  initial?: {
    id?: string;
    title?: string;
    slug?: string;
    description?: string;
    releaseYear?: number;
    developer?: string;
    publisher?: string;
    qualityTier?: string;
    youtubeVideoId?: string;
    coverImageUrl?: string;
    isPublished?: boolean;
    selectedGenreIds?: string[];
  };
}

function slugify(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function GameForm({ genres, initial = {} }: GameFormProps) {
  const router = useRouter();
  const isEdit = !!initial.id;

  const [title, setTitle] = useState(initial.title ?? "");
  const [slug, setSlug] = useState(initial.slug ?? "");
  const [description, setDescription] = useState(initial.description ?? "");
  const [releaseYear, setReleaseYear] = useState(String(initial.releaseYear ?? new Date().getFullYear()));
  const [developer, setDeveloper] = useState(initial.developer ?? "");
  const [publisher, setPublisher] = useState(initial.publisher ?? "");
  const [qualityTier, setQualityTier] = useState(initial.qualityTier ?? "");
  const [youtubeVideoId, setYoutubeVideoId] = useState(initial.youtubeVideoId ?? "");
  const [coverImageUrl, setCoverImageUrl] = useState(initial.coverImageUrl ?? "");
  const [isPublished, setIsPublished] = useState(initial.isPublished ?? false);
  const [selectedGenreIds, setSelectedGenreIds] = useState<string[]>(initial.selectedGenreIds ?? []);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const toggleGenre = (id: string) => {
    setSelectedGenreIds((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]
    );
  };

  const handleTitleChange = (v: string) => {
    setTitle(v);
    if (!isEdit) setSlug(slugify(v));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const body = {
      title,
      slug,
      description,
      releaseYear: parseInt(releaseYear, 10),
      developer: developer || undefined,
      publisher: publisher || undefined,
      qualityTier: qualityTier || undefined,
      youtubeVideoId: youtubeVideoId || undefined,
      coverImageUrl: coverImageUrl || undefined,
      isPublished,
      genreIds: selectedGenreIds,
    };

    const url = isEdit ? `/api/games/${initial.id}` : "/api/games";
    const method = isEdit ? "PUT" : "POST";

    let res: Response;
    let data: { error?: string };
    try {
      res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      data = await res.json();
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
      return;
    }

    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Failed to save game");
      return;
    }

    toast.success(isEdit ? "Game updated" : "Game created");
    router.push("/admin/games");
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 space-y-1.5">
          <Label htmlFor="title">Title *</Label>
          <Input id="title" value={title} onChange={(e) => handleTitleChange(e.target.value)} required disabled={loading} />
        </div>
        <div className="col-span-2 space-y-1.5">
          <Label htmlFor="slug">Slug *</Label>
          <Input id="slug" value={slug} onChange={(e) => setSlug(e.target.value)} required pattern="[a-z0-9-]+" disabled={loading} />
          <p className="text-xs text-muted-foreground">URL: /games/{slug || "..."}</p>
        </div>
        <div className="col-span-2 space-y-1.5">
          <Label htmlFor="description">Description *</Label>
          <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={4} required disabled={loading} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="year">Release Year *</Label>
          <Input id="year" type="number" value={releaseYear} onChange={(e) => setReleaseYear(e.target.value)} min={1970} max={2100} required disabled={loading} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="quality">Quality Tier</Label>
          <Select value={qualityTier || "none"} onValueChange={(v) => setQualityTier(v === "none" ? "" : v as string)}>
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="AAA">AAA</SelectItem>
              <SelectItem value="indie">Indie</SelectItem>
              <SelectItem value="free-to-play">Free to Play</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="developer">Developer</Label>
          <Input id="developer" value={developer} onChange={(e) => setDeveloper(e.target.value)} disabled={loading} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="publisher">Publisher</Label>
          <Input id="publisher" value={publisher} onChange={(e) => setPublisher(e.target.value)} disabled={loading} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="youtube">YouTube Video ID</Label>
          <Input id="youtube" value={youtubeVideoId} onChange={(e) => setYoutubeVideoId(e.target.value)} placeholder="dQw4w9WgXcQ" disabled={loading} />
        </div>
        <div className="col-span-2 space-y-1.5">
          <Label>Cover Image</Label>
          <CoverImageInput value={coverImageUrl} onChange={setCoverImageUrl} disabled={loading} />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Genres</Label>
        <div className="flex flex-wrap gap-2">
          {genres.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => toggleGenre(g.id)}
              className="focus:outline-none"
            >
              <Badge
                variant={selectedGenreIds.includes(g.id) ? "default" : "outline"}
                className="cursor-pointer"
              >
                {g.name}
                {selectedGenreIds.includes(g.id) && <X className="ml-1 h-3 w-3" />}
              </Badge>
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <input
          id="published"
          type="checkbox"
          checked={isPublished}
          onChange={(e) => setIsPublished(e.target.checked)}
          disabled={loading}
          className="h-4 w-4 rounded border border-input"
        />
        <Label htmlFor="published">Published (visible to users)</Label>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={loading}>
          {loading ? "Saving…" : isEdit ? "Update Game" : "Create Game"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
