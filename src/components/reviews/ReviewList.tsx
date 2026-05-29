"use client";

import { useState } from "react";
import useSWR from "swr";
import { ReviewCard } from "./ReviewCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Review {
  id: string;
  rating: number;
  body?: string | null;
  createdAt: string;
  user: { id: string; username: string };
}

interface ReviewListProps {
  gameSlug: string;
  initialReviews?: Review[];
  initialTotal?: number;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function ReviewList({ gameSlug, initialReviews = [], initialTotal = 0 }: ReviewListProps) {
  const [page, setPage] = useState(1);

  const { data, mutate, isLoading } = useSWR<{
    reviews: Review[];
    total: number;
    totalPages: number;
  }>(
    `/api/games/${gameSlug}/reviews?page=${page}`,
    fetcher,
    { fallbackData: page === 1 ? { reviews: initialReviews, total: initialTotal, totalPages: Math.ceil(initialTotal / 10) } : undefined }
  );

  const handleDelete = (id: string) => {
    mutate((prev) => prev ? {
      ...prev,
      reviews: prev.reviews.filter((r) => r.id !== id),
      total: prev.total - 1,
    } : prev);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex gap-3 py-4 border-b">
            <Skeleton className="h-9 w-9 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const reviews = data?.reviews ?? [];
  const totalPages = data?.totalPages ?? 1;
  const total = data?.total ?? 0;

  return (
    <div>
      <div className="text-sm text-muted-foreground mb-4">
        {total} review{total !== 1 ? "s" : ""}
      </div>

      {reviews.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">
          No reviews yet. Be the first to review this game!
        </p>
      ) : (
        <div>
          {reviews.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              gameSlug={gameSlug}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-4">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
