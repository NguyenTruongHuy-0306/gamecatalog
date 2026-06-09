"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FORUM_CATEGORIES } from "@/lib/forum-categories";
import { apiError } from "@/lib/client-error";

interface NewThreadFormProps {
  defaultCategory?: string;
  gameId: string;
  gameSlug: string;
}

export function NewThreadForm({ defaultCategory, gameId, gameSlug }: NewThreadFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState(defaultCategory ?? FORUM_CATEGORIES[0].slug);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/forum/threads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim(), body: body.trim(), category, gameId }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(apiError(data, "Failed to create thread"));
      return;
    }
    router.push(`/forum/thread/${data.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-2xl">
      <div className="space-y-1.5">
        <Label htmlFor="category">Category</Label>
        <Select value={category} onValueChange={(v) => v && setCategory(v)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FORUM_CATEGORIES.map((c) => (
              <SelectItem key={c.slug} value={c.slug}>
                {c.emoji} {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What's on your mind?"
          maxLength={200}
          required
          disabled={loading}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="body">Post</Label>
        <Textarea
          id="body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Share your knowledge, question, or discussion…"
          rows={8}
          maxLength={10000}
          required
          disabled={loading}
        />
        <p className="text-xs text-muted-foreground text-right">{body.length}/10000</p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={loading || title.trim().length < 3 || body.trim().length < 10}>
          {loading ? "Posting…" : "Create Thread"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
