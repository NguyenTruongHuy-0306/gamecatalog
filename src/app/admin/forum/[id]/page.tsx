"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ChevronLeft, Trash2, Pin, Lock, ExternalLink, MessageSquare } from "lucide-react";

interface Post {
  id: string;
  body: string;
  createdAt: string;
  author: { id: string; username: string };
}

interface Thread {
  id: string;
  title: string;
  body: string;
  category: string;
  isPinned: boolean;
  isLocked: boolean;
  createdAt: string;
  lastPostAt: string;
  author: { id: string; username: string };
  game: { id: string; title: string; slug: string } | null;
  posts: Post[];
}

export default function AdminForumThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [thread, setThread] = useState<Thread | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/admin/forum/threads/${id}`)
      .then((r) => r.json())
      .then((d) => setThread(d.thread ?? null))
      .catch(() => toast.error("Failed to load thread"))
      .finally(() => setLoading(false));
  }, [id]);

  const patchThread = async (action: "pin" | "unpin" | "lock" | "unlock" | "delete") => {
    if (action === "delete" && !confirm("Delete this thread and all its posts? This cannot be undone.")) return;
    const res = await fetch(`/api/admin/forum/threads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (!res.ok) { toast.error("Action failed"); return; }
    if (action === "delete") {
      toast.success("Thread deleted");
      router.push("/admin/forum");
      return;
    }
    setThread((t) => {
      if (!t) return t;
      if (action === "pin") return { ...t, isPinned: true };
      if (action === "unpin") return { ...t, isPinned: false };
      if (action === "lock") return { ...t, isLocked: true };
      if (action === "unlock") return { ...t, isLocked: false };
      return t;
    });
    toast.success(action.charAt(0).toUpperCase() + action.slice(1) + "ned");
  };

  const deletePost = async (postId: string) => {
    if (!confirm("Delete this reply?")) return;
    const res = await fetch(`/api/admin/forum/posts/${postId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete" }),
    });
    if (!res.ok) { toast.error("Failed to delete reply"); return; }
    setThread((t) => t ? { ...t, posts: t.posts.filter((p) => p.id !== postId) } : t);
    toast.success("Reply deleted");
  };

  if (loading) return <div className="text-center py-16 text-muted-foreground">Loading…</div>;
  if (!thread) return <div className="text-center py-16 text-muted-foreground">Thread not found.</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link href="/admin/forum">
          <Button variant="ghost" size="sm" className="gap-1 -ml-2">
            <ChevronLeft className="h-4 w-4" /> Forum
          </Button>
        </Link>
      </div>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold">{thread.title}</h1>
            {thread.isPinned && <Badge variant="secondary" className="gap-1"><Pin className="h-3 w-3" />Pinned</Badge>}
            {thread.isLocked && <Badge variant="outline" className="gap-1"><Lock className="h-3 w-3" />Locked</Badge>}
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
            <Link href={`/admin/users/${thread.author.id}`} className="hover:underline font-medium">
              {thread.author.username}
            </Link>
            <Badge variant="outline" className="font-normal">{thread.category}</Badge>
            {thread.game && (
              <Link href={`/games/${thread.game.slug}`} className="text-primary hover:underline">
                {thread.game.title}
              </Link>
            )}
            <span>{new Date(thread.createdAt).toLocaleString()}</span>
            <span className="flex items-center gap-1"><MessageSquare className="h-3.5 w-3.5" /> {thread.posts.length} {thread.posts.length === 1 ? "reply" : "replies"}</span>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap shrink-0">
          {thread.game && (
            <Link href={`/games/${thread.game.slug}/forum/${thread.id}`} target="_blank">
              <Button variant="outline" size="sm" className="gap-1">
                <ExternalLink className="h-3.5 w-3.5" /> View
              </Button>
            </Link>
          )}
          <Button variant="outline" size="sm" className="gap-1"
            onClick={() => patchThread(thread.isPinned ? "unpin" : "pin")}>
            <Pin className={`h-3.5 w-3.5 ${thread.isPinned ? "text-primary" : ""}`} />
            {thread.isPinned ? "Unpin" : "Pin"}
          </Button>
          <Button variant="outline" size="sm" className="gap-1"
            onClick={() => patchThread(thread.isLocked ? "unlock" : "lock")}>
            <Lock className={`h-3.5 w-3.5 ${thread.isLocked ? "text-amber-500" : ""}`} />
            {thread.isLocked ? "Unlock" : "Lock"}
          </Button>
          <Button variant="destructive" size="sm" className="gap-1"
            onClick={() => patchThread("delete")}>
            <Trash2 className="h-3.5 w-3.5" /> Delete Thread
          </Button>
        </div>
      </div>

      {/* Original post */}
      <div className="border rounded-lg p-5 space-y-2 bg-muted/20">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{thread.author.username}</span>
          <span>·</span>
          <span>{new Date(thread.createdAt).toLocaleString()}</span>
          <Badge variant="secondary" className="ml-auto">OP</Badge>
        </div>
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{thread.body}</p>
      </div>

      {/* Replies */}
      {thread.posts.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Replies ({thread.posts.length})
          </h2>
          {thread.posts.map((post) => (
            <div key={post.id} className="border rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Link href={`/admin/users/${post.author.id}`} className="font-medium text-foreground hover:underline">
                    {post.author.username}
                  </Link>
                  <span>·</span>
                  <span>{new Date(post.createdAt).toLocaleString()}</span>
                </div>
                <Button variant="ghost" size="sm" className="gap-1 text-destructive hover:text-destructive hover:bg-destructive/10 px-2"
                  onClick={() => deletePost(post.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{post.body}</p>
            </div>
          ))}
        </div>
      )}

      {thread.posts.length === 0 && (
        <div className="text-center py-8 text-muted-foreground text-sm">No replies yet.</div>
      )}
    </div>
  );
}
