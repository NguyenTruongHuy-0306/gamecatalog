"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MessageSquare, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface GameForumEntry {
  id: string;
  title: string;
  slug: string;
  coverImageUrl: string | null;
  qualityTier: string | null;
  releaseYear: number;
  gameGenres: { genre: { id: string; name: string } }[];
  threadCount: number;
  latestActivity: string | null;
}

type SortKey = "activity" | "threads" | "title";

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

const QUALITY_BADGE: Record<string, string> = {
  AAA: "bg-yellow-500/90 text-yellow-950",
  indie: "bg-violet-500/90 text-white",
  "free-to-play": "bg-emerald-500/90 text-white",
};
const QUALITY_LABEL: Record<string, string> = {
  AAA: "AAA",
  indie: "Indie",
  "free-to-play": "F2P",
};

export function ForumDirectory({ games }: { games: GameForumEntry[] }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("activity");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const result = q ? games.filter((g) => g.title.toLowerCase().includes(q)) : games;
    return [...result].sort((a, b) => {
      if (sort === "title") return a.title.localeCompare(b.title);
      if (sort === "threads") return b.threadCount - a.threadCount;
      if (!a.latestActivity) return 1;
      if (!b.latestActivity) return -1;
      return new Date(b.latestActivity).getTime() - new Date(a.latestActivity).getTime();
    });
  }, [games, query, sort]);

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="flex gap-2 items-end">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search game forums…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-8"
            aria-label="Search game forums"
          />
        </div>
        <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
          <SelectTrigger className="w-[150px] shrink-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="activity">Most Recent</SelectItem>
            <SelectItem value="threads">Most Threads</SelectItem>
            <SelectItem value="title">A–Z</SelectItem>
          </SelectContent>
        </Select>
        {query && (
          <Button variant="ghost" size="icon" onClick={() => setQuery("")} aria-label="Clear search">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Result count */}
      <p className="text-sm text-muted-foreground">
        {filtered.length} game{filtered.length !== 1 ? "s" : ""} with active forums
        {query && ` matching "${query}"`}
      </p>

      {/* Game list */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 border rounded-xl text-muted-foreground">
          <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No forums found{query ? ` for "${query}"` : ""}</p>
          {query && (
            <Button variant="ghost" size="sm" className="mt-2" onClick={() => setQuery("")}>
              Clear search
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((game) => (
            <Link
              key={game.id}
              href={`/games/${game.slug}/forum`}
              className="group flex items-center gap-4 p-4 rounded-xl border bg-card hover:bg-accent/30 hover:border-primary/30 transition-all"
            >
              {/* Cover thumbnail */}
              <div className="relative h-14 w-10 shrink-0 rounded-md overflow-hidden bg-muted">
                {game.coverImageUrl ? (
                  <Image
                    src={game.coverImageUrl}
                    alt={game.title}
                    fill
                    className="object-cover"
                    sizes="40px"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-lg">🎮</div>
                )}
                {game.qualityTier && (
                  <span className={`absolute bottom-0 inset-x-0 text-center text-[8px] font-bold py-0.5 ${QUALITY_BADGE[game.qualityTier] ?? "bg-black/70 text-white"}`}>
                    {QUALITY_LABEL[game.qualityTier] ?? game.qualityTier}
                  </span>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0 space-y-1">
                <p className="font-semibold text-sm leading-snug group-hover:text-primary transition-colors line-clamp-1">
                  {game.title}
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-muted-foreground">{game.releaseYear}</span>
                  {game.gameGenres.slice(0, 2).map(({ genre }) => (
                    <span key={genre.id} className="text-xs px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                      {genre.name}
                    </span>
                  ))}
                </div>
              </div>

              {/* Thread count + last activity */}
              <div className="shrink-0 text-right space-y-0.5">
                <div className="flex items-center gap-1 justify-end text-xs font-medium">
                  <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{game.threadCount} thread{game.threadCount !== 1 ? "s" : ""}</span>
                </div>
                {game.latestActivity && (
                  <p className="text-xs text-muted-foreground">{timeAgo(game.latestActivity)}</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
