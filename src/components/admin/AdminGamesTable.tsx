"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { STATUS_LABELS, STATUS_COLORS } from "@/lib/release-status-config";
import type { ReleaseStatus } from "@/generated/prisma/client";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { StarDisplay } from "@/components/shared/StarDisplay";
import { SortableHead } from "@/components/admin/SortableHead";
import { Trash2, X } from "lucide-react";

interface Game {
  id: string;
  title: string;
  slug: string;
  releaseYear: number;
  releaseStatus: ReleaseStatus;
  qualityTier: string | null;
  avgRating: number;
  reviewCount: number;
  isPublished: boolean;
  igdbId: number | null;
}

export function AdminGamesTable({ games }: { games: Game[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  const currentSort = searchParams.get("sort") ?? "createdAt";
  const currentDir = (searchParams.get("dir") ?? "desc") as "asc" | "desc";

  const handleSort = (key: string) => {
    const newDir = currentSort === key && currentDir === "asc" ? "desc" : "asc";
    const params = new URLSearchParams(searchParams);
    params.set("sort", key);
    params.set("dir", newDir);
    router.push(`${pathname}?${params}`);
  };

  const allSelected = games.length > 0 && games.every((g) => selected.has(g.id));
  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(games.map((g) => g.id)));
  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const handleDelete = (id: string, title: string) => {
    if (!confirm(`Permanently delete "${title}"? This cannot be undone.`)) return;
    startTransition(async () => {
      const res = await fetch(`/api/games/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success(`"${title}" deleted.`);
        setSelected((prev) => { const next = new Set(prev); next.delete(id); return next; });
        router.refresh();
      } else {
        toast.error("Failed to delete game.");
      }
    });
  };

  const handleBulkDelete = () => {
    const ids = [...selected];
    if (!confirm(`Permanently delete ${ids.length} game${ids.length > 1 ? "s" : ""}? This cannot be undone.`)) return;
    startTransition(async () => {
      const results = await Promise.allSettled(
        ids.map((id) => fetch(`/api/games/${id}`, { method: "DELETE" }))
      );
      const failed = results.filter(
        (r) => r.status === "rejected" || (r.status === "fulfilled" && !r.value.ok)
      ).length;
      const succeeded = ids.length - failed;
      if (succeeded > 0) toast.success(`${succeeded} game${succeeded > 1 ? "s" : ""} deleted.`);
      if (failed > 0) toast.error(`${failed} deletion${failed > 1 ? "s" : ""} failed.`);
      setSelected(new Set());
      router.refresh();
    });
  };

  return (
    <div>
      {selected.size > 0 && (
        <div className="flex items-center gap-3 mb-4 px-4 py-2.5 bg-muted/60 border rounded-lg">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <div className="flex gap-2 ml-auto">
            <Button variant="destructive" size="sm" className="gap-1.5" onClick={handleBulkDelete} disabled={isPending}>
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())} disabled={isPending}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border border-input"
                  checked={allSelected}
                  onChange={toggleAll}
                  aria-label="Select all"
                  disabled={games.length === 0}
                />
              </TableHead>
              <TableHead>
                <SortableHead label="Title" sortKey="title" currentSort={currentSort} currentDir={currentDir} onSort={handleSort} />
              </TableHead>
              <TableHead>
                <SortableHead label="Year" sortKey="releaseYear" currentSort={currentSort} currentDir={currentDir} onSort={handleSort} />
              </TableHead>
              <TableHead>Era</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>
                <SortableHead label="Rating" sortKey="avgRating" currentSort={currentSort} currentDir={currentDir} onSort={handleSort} />
              </TableHead>
              <TableHead>
                <SortableHead label="Reviews" sortKey="reviewCount" currentSort={currentSort} currentDir={currentDir} onSort={handleSort} />
              </TableHead>
              <TableHead>
                <SortableHead label="Status" sortKey="isPublished" currentSort={currentSort} currentDir={currentDir} onSort={handleSort} />
              </TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {games.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground py-8">No games yet</TableCell>
              </TableRow>
            ) : (
              games.map((game) => (
                <TableRow
                  key={game.id}
                  data-state={selected.has(game.id) ? "selected" : undefined}
                  className={selected.has(game.id) ? "bg-muted/40" : undefined}
                >
                  <TableCell>
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border border-input"
                      checked={selected.has(game.id)}
                      onChange={() => toggle(game.id)}
                      aria-label={`Select ${game.title}`}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{game.title}</span>
                      {game.igdbId && (
                        <Badge variant="outline" className="text-[10px] py-0 h-4 px-1.5 text-blue-500 border-blue-500/40">
                          IGDB
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">{game.slug}</div>
                  </TableCell>
                  <TableCell className="text-sm">{game.releaseYear}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-xs border ${STATUS_COLORS[game.releaseStatus]}`}>
                      {STATUS_LABELS[game.releaseStatus]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {game.qualityTier && <Badge variant="secondary">{game.qualityTier}</Badge>}
                  </TableCell>
                  <TableCell>
                    <StarDisplay rating={game.avgRating} size="sm" showValue />
                  </TableCell>
                  <TableCell className="text-sm">{game.reviewCount}</TableCell>
                  <TableCell>
                    {game.isPublished ? (
                      <Badge variant="outline" className="text-green-600 border-green-600">Published</Badge>
                    ) : (
                      <Badge variant="secondary">Draft</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button render={<Link href={`/admin/games/${game.id}`} />} variant="ghost" size="sm">
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(game.id, game.title)}
                        disabled={isPending}
                        aria-label={`Delete ${game.title}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
