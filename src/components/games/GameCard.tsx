import Link from "next/link";
import Image from "next/image";
import { StarDisplay } from "@/components/shared/StarDisplay";

interface Genre {
  id: string;
  name: string;
  slug: string;
}

interface GameCardProps {
  id: string;
  title: string;
  slug: string;
  coverImageUrl?: string | null;
  avgRating: number;
  reviewCount: number;
  releaseYear: number;
  qualityTier?: string | null;
  gameGenres?: { genre: Genre }[];
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

export function GameCard({
  title,
  slug,
  coverImageUrl,
  avgRating,
  reviewCount,
  releaseYear,
  qualityTier,
  gameGenres = [],
}: GameCardProps) {
  return (
    <Link href={`/games/${slug}`} className="group block">
      <div className="rounded-xl overflow-hidden border bg-card card-hover">
        {/* Cover */}
        <div className="relative aspect-[3/4] bg-muted overflow-hidden">
          {coverImageUrl ? (
            <Image
              src={coverImageUrl}
              alt={title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-110"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-primary/10 to-primary/5 text-muted-foreground">
              <span className="text-4xl" aria-hidden="true">🎮</span>
              <span className="text-xs font-medium opacity-60">No Cover</span>
            </div>
          )}

          {/* Overlay gradient on hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          {/* Quality badge */}
          {qualityTier && (
            <span className={`absolute top-2 right-2 text-xs px-2 py-0.5 rounded-full font-semibold backdrop-blur-sm ${QUALITY_COLORS[qualityTier] ?? "bg-black/70 text-white"}`}>
              {QUALITY_LABELS[qualityTier] ?? qualityTier}
            </span>
          )}

          {/* Rating on hover */}
          <div className="absolute bottom-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-1 group-hover:translate-y-0">
            <div className="flex items-center gap-1.5 bg-black/70 backdrop-blur-sm rounded-lg px-2 py-1">
              <StarDisplay rating={avgRating} size="sm" />
              <span className="text-white text-xs font-medium">{avgRating.toFixed(1)}</span>
              <span className="text-white/60 text-xs ml-auto">({reviewCount})</span>
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="p-3 space-y-1.5">
          <h3 className="font-semibold text-sm leading-tight line-clamp-2 group-hover:text-primary transition-colors duration-150">
            {title}
          </h3>
          <div className="flex items-center justify-between">
            <StarDisplay rating={avgRating} size="sm" />
            <span className="text-xs text-muted-foreground">{releaseYear}</span>
          </div>
          {gameGenres.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {gameGenres.slice(0, 2).map(({ genre }) => (
                <span
                  key={genre.id}
                  className="text-xs px-2 py-0.5 rounded-full bg-primary/8 text-primary font-medium"
                >
                  {genre.name}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
