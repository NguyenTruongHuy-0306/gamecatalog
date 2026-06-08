"use client";

import { useState } from "react";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface PostCardProps {
  post: {
    id: string;
    body: string;
    createdAt: string;
    author: { id: string; username: string; avatarUrl: string | null };
  };
  currentUserId?: string;
  isAdmin?: boolean;
  onDeleted?: (id: string) => void;
}

export function PostCard({ post, currentUserId, isAdmin, onDeleted }: PostCardProps) {
  const [deleting, setDeleting] = useState(false);
  const canDelete = currentUserId === post.author.id || isAdmin;
  const initials = post.author.username.slice(0, 2).toUpperCase();
  const date = new Date(post.createdAt).toLocaleString();

  async function handleDelete() {
    if (!confirm("Delete this reply?")) return;
    setDeleting(true);
    const res = await fetch(`/api/forum/posts/${post.id}`, { method: "DELETE" });
    setDeleting(false);
    if (res.ok) {
      toast.success("Reply deleted");
      onDeleted?.(post.id);
    } else {
      toast.error("Failed to delete reply");
    }
  }

  return (
    <div className="flex gap-3 p-4 rounded-xl border bg-card">
      <Avatar className="h-9 w-9 shrink-0 border">
        <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm">
            <Link href={`/profile/${post.author.username}`} className="font-semibold hover:text-primary transition-colors">
              {post.author.username}
            </Link>
            <span className="text-xs text-muted-foreground">{date}</span>
          </div>
          {canDelete && (
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={handleDelete} disabled={deleting}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
        <p className="text-sm whitespace-pre-wrap leading-relaxed">{post.body}</p>
      </div>
    </div>
  );
}
