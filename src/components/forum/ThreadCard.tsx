import Link from "next/link";
import { MessageSquare, Pin, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getCategoryBySlug } from "@/lib/forum-categories";

interface ThreadCardProps {
  thread: {
    id: string;
    title: string;
    category: string;
    isPinned: boolean;
    isLocked: boolean;
    createdAt: string | Date;
    lastPostAt: string | Date;
    author: { id: string; username: string };
    _count: { posts: number };
  };
  showCategory?: boolean;
}

export function ThreadCard({ thread, showCategory = false }: ThreadCardProps) {
  const category = getCategoryBySlug(thread.category);
  const lastActivity = new Date(thread.lastPostAt);
  const now = new Date();
  const diffMs = now.getTime() - lastActivity.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  const timeAgo =
    diffMins < 1 ? "just now"
    : diffMins < 60 ? `${diffMins}m ago`
    : diffHours < 24 ? `${diffHours}h ago`
    : diffDays < 30 ? `${diffDays}d ago`
    : lastActivity.toLocaleDateString();

  return (
    <div className="flex items-start gap-3 p-4 rounded-xl border bg-card hover:bg-accent/30 transition-colors group">
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          {thread.isPinned && <Pin className="h-3.5 w-3.5 text-primary shrink-0" />}
          {thread.isLocked && <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
          <Link
            href={`/forum/thread/${thread.id}`}
            className="font-semibold text-sm leading-snug group-hover:text-primary transition-colors line-clamp-2"
          >
            {thread.title}
          </Link>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
          {showCategory && category && (
            <Badge variant="outline" className="text-[10px] py-0 h-4 px-1.5">
              {category.emoji} {category.label}
            </Badge>
          )}
          <span>by <Link href={`/profile/${thread.author.username}`} className="hover:text-foreground transition-colors">{thread.author.username}</Link></span>
          <span>·</span>
          <span>{timeAgo}</span>
        </div>
      </div>
      <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
        <MessageSquare className="h-3.5 w-3.5" />
        <span>{thread._count.posts}</span>
      </div>
    </div>
  );
}
