"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { apiError } from "@/lib/client-error";

interface ReplyFormProps {
  threadId: string;
  onPosted?: (post: {
    id: string;
    body: string;
    createdAt: string;
    author: { id: string; username: string; avatarUrl: string | null };
  }) => void;
}

export function ReplyForm({ threadId, onPosted }: ReplyFormProps) {
  const { data: session } = useSession();
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);

  if (!session?.user) {
    return (
      <div className="rounded-xl border bg-muted/30 p-4 text-sm text-center text-muted-foreground">
        <Link href="/login" className="text-primary hover:underline font-medium">Sign in</Link> to join the discussion.
      </div>
    );
  }

  if (!session.user.emailVerified) {
    return (
      <div className="rounded-xl border bg-muted/30 p-4 text-sm text-center text-muted-foreground">
        Please verify your email to post replies.
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) return;
    setLoading(true);
    const res = await fetch(`/api/forum/threads/${threadId}/posts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: trimmed }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      toast.error(apiError(data, "Failed to post reply"));
      return;
    }
    toast.success("Reply posted!");
    setBody("");
    onPosted?.(data);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Textarea
        placeholder="Write your reply…"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={4}
        disabled={loading}
        maxLength={5000}
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{body.length}/5000</span>
        <Button type="submit" disabled={loading || body.trim().length < 2}>
          {loading ? "Posting…" : "Post Reply"}
        </Button>
      </div>
    </form>
  );
}
