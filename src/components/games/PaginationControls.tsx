"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationControlsProps {
  page: number;
  totalPages: number;
}

export function PaginationControls({ page, totalPages }: PaginationControlsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  if (totalPages <= 1) return null;

  const goToPage = (p: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(p));
    router.push(`/games?${params.toString()}`);
  };

  const pages = Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
    const start = Math.max(1, Math.min(page - 2, totalPages - 4));
    return start + i;
  }).filter((p) => p >= 1 && p <= totalPages);

  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-2">
      <Button
        variant="outline"
        size="sm"
        disabled={page <= 1}
        onClick={() => goToPage(page - 1)}
        aria-label="Go to previous page"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        Previous
      </Button>

      {pages[0] > 1 && (
        <>
          <Button variant="outline" size="sm" onClick={() => goToPage(1)} aria-label="Go to page 1">1</Button>
          {pages[0] > 2 && <span className="text-muted-foreground px-1" aria-hidden="true">…</span>}
        </>
      )}

      {pages.map((p) => (
        <Button
          key={p}
          variant={p === page ? "default" : "outline"}
          size="sm"
          onClick={() => goToPage(p)}
          aria-label={`Go to page ${p}`}
          aria-current={p === page ? "page" : undefined}
        >
          {p}
        </Button>
      ))}

      {pages[pages.length - 1] < totalPages && (
        <>
          {pages[pages.length - 1] < totalPages - 1 && (
            <span className="text-muted-foreground px-1" aria-hidden="true">…</span>
          )}
          <Button variant="outline" size="sm" onClick={() => goToPage(totalPages)} aria-label={`Go to page ${totalPages}`}>{totalPages}</Button>
        </>
      )}

      <Button
        variant="outline"
        size="sm"
        disabled={page >= totalPages}
        onClick={() => goToPage(page + 1)}
        aria-label="Go to next page"
      >
        Next
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </Button>
    </nav>
  );
}
