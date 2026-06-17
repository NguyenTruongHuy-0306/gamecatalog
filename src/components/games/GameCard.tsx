import Link from "next/link";
import Image from "next/image";
import { ShoppingCart } from "lucide-react";
import { StarDisplay } from "@/components/shared/StarDisplay";
import { STATUS_LABELS, STATUS_COLORS } from "@/lib/release-status-config";
import type { ReleaseStatus } from "@/generated/prisma/client";

interface Genre {
  id: string;
  name: string;
  slug: string;
}

interface PurchaseLink {
  store: string;
  url: string;
}

interface GameCardProps {
  id: string;
  title: string;
  slug: string;
  coverImageUrl?: string | null;
  avgRating: number;
  reviewCount: number;
  releaseYear: number;
  releaseStatus: ReleaseStatus;
  qualityTier?: string | null;
  gameGenres?: { genre: Genre }[];
  purchaseLinks?: unknown;
  rank?: number;
}

const QUALITY_COLORS: Record<string, string> = {
  AAA: "bg-yellow-500/90 text-yellow-950",
  indie: "bg-violet-500/90 text-white",
  "free-to-play": "bg-emerald-500/90 text-white",
};

const QUALITY_LABELS: Record<string, string> = {
  AAA: "AAA",
  indie: "Indie",
  "free-to-play": "F2P",
};

function parsePurchaseLinks(raw: unknown): PurchaseLink[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (l): l is PurchaseLink =>
      l !== null && typeof l === "object" && typeof l.store === "string" && typeof l.url === "string"
  );
}

export function GameCard({
  title,
  slug,
  coverImageUrl,
  avgRating,
  reviewCount,
  releaseYear,
  releaseStatus,
  qualityTier,
  gameGenres = [],
  purchaseLinks: rawLinks,
  rank,
}: GameCardProps) {
  const links = parsePurchaseLinks(rawLinks);

  return (
    <div className="group flex flex-col h-full">
      {/* Clickable cover + info card */}
      <Link href={`/games/${slug}`} className="block flex-1">
        <div className="relative h-full rounded-2xl overflow-hidden bg-card neon-card transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-primary/15">

          {/* Cover */}
          <div className="relative aspect-[3/4] bg-muted overflow-hidden">
            {coverImageUrl ? (
              <Image
                src={coverImageUrl}
                alt={title}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-110"
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 20vw"
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-primary/15 to-primary/5 text-muted-foreground">
                <span className="text-4xl" aria-hidden="true">🎮</span>
                <span className="text-xs font-medium opacity-60">No Cover</span>
              </div>
            )}

            {/* Hover gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            {/* Rank */}
            {rank !== undefined && (
              <div className="absolute top-2.5 left-2.5 z-10">
                <span className="font-mono text-xs font-bold bg-black/70 backdrop-blur-sm text-white/80 rounded-full px-2 py-0.5">
                  #{rank}
                </span>
              </div>
            )}

            {/* Quality badge */}
            {qualityTier && (
              <span className={`absolute top-2.5 right-2.5 z-10 text-xs px-2.5 py-0.5 rounded-full font-semibold backdrop-blur-sm ${QUALITY_COLORS[qualityTier] ?? "bg-black/70 text-white"}`}>
                {QUALITY_LABELS[qualityTier] ?? qualityTier}
              </span>
            )}

            {/* Hover rating overlay */}
            <div className="absolute inset-x-0 bottom-0 z-10 p-3 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-1 group-hover:translate-y-0">
              <div className="flex items-center gap-2 bg-black/60 backdrop-blur-sm rounded-xl px-3 py-2">
                <StarDisplay rating={avgRating} size="sm" />
                <span className="text-white text-xs font-semibold">{avgRating.toFixed(1)}</span>
                <span className="text-white/50 text-xs ml-auto">({reviewCount})</span>
              </div>
            </div>
          </div>

          {/* Info */}
          <div className="p-3.5 space-y-2">
            <h3 className="font-bold text-sm leading-tight line-clamp-2 group-hover:text-primary transition-colors duration-200">
              {title}
            </h3>
            <div className="flex items-center justify-between">
              <StarDisplay rating={avgRating} size="sm" />
              <div className="flex items-center gap-1.5">
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${STATUS_COLORS[releaseStatus]}`}>
                  {STATUS_LABELS[releaseStatus]}
                </span>
                <span className="text-xs text-muted-foreground tabular-nums font-medium">{releaseYear}</span>
              </div>
            </div>
            {gameGenres.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {gameGenres.slice(0, 2).map(({ genre }) => (
                  <span
                    key={genre.id}
                    className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium"
                  >
                    {genre.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </Link>

      {/* Purchase links — outside the card Link so they don't nest <a> inside <a> */}
      {links.length > 0 && (
        <div className="mt-2 flex flex-col gap-1">
          {links.map((link, i) => (
            <a
              key={i}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-lg border bg-muted/40 hover:bg-muted/80 px-3 py-1.5 text-xs font-medium transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <ShoppingCart className="h-3 w-3 text-primary" />
                {link.store}
              </span>
              <span className="text-muted-foreground text-[10px]">Buy →</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
