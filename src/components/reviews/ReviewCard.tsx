"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { StarDisplay } from "@/components/shared/StarDisplay";
import { Flag, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Review {
  id: string;
  rating: number;
  body?: string | null;
  createdAt: string | Date;
  user: { id: string; username: string };
}

interface ReviewCardProps {
  review: Review;
  gameSlug: string;
  onDelete?: (id: string) => void;
}

export function ReviewCard({ review, gameSlug, onDelete }: ReviewCardProps) {
  const { data: session } = useSession();
  const [flagging, setFlagging] = useState(false);
  const [flagged, setFlagged] = useState(false);

  const isOwner = session?.user.id === review.user.id;
  const isAdmin = session?.user.role === "admin";

  const initials = review.user.username.slice(0, 2).toUpperCase();

  const handleDelete = async () => {
    if (!confirm("Delete this review?")) return;
    const res = await fetch(`/api/games/${gameSlug}/reviews/${review.id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Review deleted"); onDelete?.(review.id); }
    else toast.error("Failed to delete review");
  };

  const handleFlag = async () => {
    setFlagging(true);
    const res = await fetch(`/api/games/${gameSlug}/reviews/${review.id}/flag`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}),
    });
    setFlagging(false);
    if (res.ok) { toast.success("Review flagged for moderation"); setFlagged(true); }
    else { const d = await res.json(); toast.error(d.error ?? "Failed to flag review"); }
  };

  return (
    <div className="group flex gap-3 py-4 border-b last:border-0 hover:bg-accent/30 rounded-lg px-2 -mx-2 transition-colors duration-150">
      {/* Avatar */}
      <div className="shrink-0 h-9 w-9 rounded-full bg-gradient-to-br from-primary/60 to-primary flex items-center justify-center text-primary-foreground text-xs font-bold shadow-sm">
        {initials}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="font-semibold text-sm">{review.user.username}</span>
            <div className="flex items-center gap-2 mt-0.5">
              <StarDisplay rating={review.rating} size="sm" />
              <span className="text-xs text-muted-foreground">
                {new Date(review.createdAt).toLocaleDateString("en-US", {
                  year: "numeric", month: "short", day: "numeric",
                })}
              </span>
            </div>
          </div>

          {session?.user && (
            <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              {(isOwner || isAdmin) && (
                <button onClick={handleDelete} aria-label="Delete review"
                  className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
              {!isOwner && !flagged && (
                <button onClick={handleFlag} disabled={flagging} aria-label="Flag review"
                  className="p-1.5 rounded-md text-muted-foreground hover:text-orange-500 hover:bg-orange-500/10 transition-all disabled:opacity-50">
                  <Flag className="h-3.5 w-3.5" />
                </button>
              )}
              {flagged && (
                <span className="text-xs text-orange-500 px-1.5 py-1">Flagged</span>
              )}
            </div>
          )}
        </div>

        {review.body && (
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            {review.body}
          </p>
        )}
      </div>
    </div>
  );
}
