"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X, SlidersHorizontal } from "lucide-react";

interface Genre {
  id: string;
  name: string;
  slug: string;
}

interface GameFiltersProps {
  genres: Genre[];
}

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR - 1979 }, (_, i) => CURRENT_YEAR - i);

export function GameFilters({ genres }: GameFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchValue, setSearchValue] = useState(searchParams.get("q") ?? "");
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (searchValue) {
        params.set("q", searchValue);
      } else {
        params.delete("q");
      }
      params.delete("page");
      router.push(`/games?${params.toString()}`);
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchValue]);

  const updateParam = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value && value !== "all") {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      params.delete("page");
      router.push(`/games?${params.toString()}`);
    },
    [router, searchParams]
  );

  const hasFilters =
    searchParams.has("genre") ||
    searchParams.has("year") ||
    searchParams.has("quality") ||
    searchParams.has("minRating") ||
    searchParams.has("q");

  const hasSecondaryFilters =
    searchParams.has("genre") ||
    searchParams.has("year") ||
    searchParams.has("quality") ||
    searchParams.has("minRating");

  const clearFilters = () => {
    setSearchValue("");
    const params = new URLSearchParams();
    const sort = searchParams.get("sort");
    if (sort) params.set("sort", sort);
    router.push(`/games?${params.toString()}`);
  };

  return (
    <div role="search" className="space-y-3">
      {/* Row 1: Search + Sort + mobile filter toggle */}
      <div className="flex gap-2 items-end">
        <div className="flex-1 flex flex-col gap-1 min-w-0">
          <label htmlFor="games-search" className="text-xs font-medium text-muted-foreground">
            Search
          </label>
          <Input
            id="games-search"
            placeholder="Search games…"
            value={searchValue}
            className="w-full"
            onChange={(e) => setSearchValue(e.target.value)}
          />
        </div>

        {/* Sort — always visible */}
        <div className="shrink-0 flex flex-col gap-1">
          <label htmlFor="games-sort" className="text-xs font-medium text-muted-foreground sr-only sm:not-sr-only">
            Sort by
          </label>
          <Select
            value={searchParams.get("sort") ?? "rating"}
            onValueChange={(v) => updateParam("sort", v)}
          >
            <SelectTrigger id="games-sort" className="w-[120px] sm:w-36">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="rating">Top Rated</SelectItem>
              <SelectItem value="year">Newest First</SelectItem>
              <SelectItem value="title">A–Z</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Mobile: toggle secondary filters */}
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="sm:hidden shrink-0 self-end relative"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-label="Toggle filters"
        >
          <SlidersHorizontal className="h-4 w-4" />
          {hasSecondaryFilters && (
            <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-primary" />
          )}
        </Button>
      </div>

      {/* Row 2: Secondary filters — always visible on sm+, toggled on mobile */}
      <div className={`grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-3 sm:items-end ${expanded ? "grid" : "hidden"} sm:flex`}>
        {/* Genre */}
        <div className="flex flex-col gap-1">
          <label htmlFor="games-genre" className="text-xs font-medium text-muted-foreground">Genre</label>
          <Select
            value={searchParams.get("genre") ?? "all"}
            onValueChange={(v) => updateParam("genre", v)}
          >
            <SelectTrigger id="games-genre" className="w-full sm:w-36">
              <SelectValue placeholder="Genre" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Genres</SelectItem>
              {genres.map((g) => (
                <SelectItem key={g.id} value={g.slug}>{g.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Year */}
        <div className="flex flex-col gap-1">
          <label htmlFor="games-year" className="text-xs font-medium text-muted-foreground">Year</label>
          <Select
            value={searchParams.get("year") ?? "all"}
            onValueChange={(v) => updateParam("year", v)}
          >
            <SelectTrigger id="games-year" className="w-full sm:w-28">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              <SelectItem value="all">All Years</SelectItem>
              {YEARS.map((y) => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Quality */}
        <div className="flex flex-col gap-1">
          <label htmlFor="games-quality" className="text-xs font-medium text-muted-foreground">Type</label>
          <Select
            value={searchParams.get("quality") ?? "all"}
            onValueChange={(v) => updateParam("quality", v)}
          >
            <SelectTrigger id="games-quality" className="w-full sm:w-32">
              <SelectValue placeholder="Quality" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="AAA">AAA</SelectItem>
              <SelectItem value="indie">Indie</SelectItem>
              <SelectItem value="free-to-play">Free to Play</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Min Rating */}
        <div className="flex flex-col gap-1">
          <label htmlFor="games-rating" className="text-xs font-medium text-muted-foreground">Min Rating</label>
          <Select
            value={searchParams.get("minRating") ?? "all"}
            onValueChange={(v) => updateParam("minRating", v)}
          >
            <SelectTrigger id="games-rating" className="w-full sm:w-32">
              <SelectValue placeholder="Min Rating" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any Rating</SelectItem>
              <SelectItem value="4">4+ Stars</SelectItem>
              <SelectItem value="3">3+ Stars</SelectItem>
              <SelectItem value="2">2+ Stars</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Clear */}
        {hasFilters && (
          <div className="col-span-2 sm:col-span-1 flex items-end">
            <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 w-full sm:w-auto justify-center">
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              Clear filters
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
