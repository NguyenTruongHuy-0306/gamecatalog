"use client";

import { useState } from "react";
import { PostCard } from "@/components/forum/PostCard";
import { ReplyForm } from "@/components/forum/ReplyForm";
import { Separator } from "@/components/ui/separator";
import { MessageSquare } from "lucide-react";

interface Post {
  id: string;
  body: string;
  createdAt: string;
  author: { id: string; username: string; avatarUrl: string | null };
}

interface PostListProps {
  threadId: string;
  initialPosts: Post[];
  initialTotal: number;
  isLocked: boolean;
  currentUserId?: string;
  isAdmin?: boolean;
}

export function PostList({ threadId, initialPosts, initialTotal, isLocked, currentUserId, isAdmin }: PostListProps) {
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [total, setTotal] = useState(initialTotal);

  function handleDeleted(id: string) {
    setPosts((prev) => prev.filter((p) => p.id !== id));
    setTotal((prev) => prev - 1);
  }

  function handlePosted(post: Post) {
    setPosts((prev) => [...prev, post]);
    setTotal((prev) => prev + 1);
  }

  return (
    <>
      {total > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
            <MessageSquare className="h-4 w-4" />
            {total} {total === 1 ? "Reply" : "Replies"}
          </h2>
          <div className="space-y-2">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                currentUserId={currentUserId}
                isAdmin={isAdmin}
                onDeleted={handleDeleted}
              />
            ))}
          </div>
        </section>
      )}

      {!isLocked && (
        <section className="space-y-3">
          <Separator />
          <h2 className="text-sm font-semibold">Leave a Reply</h2>
          <ReplyForm threadId={threadId} onPosted={handlePosted} />
        </section>
      )}
    </>
  );
}
