import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { YouTubeEmbed } from "@/components/games/YouTubeEmbed";
import { VersionHistoryList } from "@/components/games/VersionHistoryList";
import { FavoriteButton } from "@/components/games/FavoriteButton";
import { ReviewList } from "@/components/reviews/ReviewList";
import { ReviewForm } from "@/components/reviews/ReviewForm";
import { StarDisplay } from "@/components/shared/StarDisplay";
import { GenreBadge } from "@/components/shared/GenreBadge";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calendar, User2, Building2, Layers, MessageSquare, History, ShoppingCart, ExternalLink } from "lucide-react";
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function getGame(slug: string) {
  return prisma.game.findFirst({
    where: { slug, isPublished: true },
    include: {
      gameGenres: { include: { genre: true } },
      versions: { orderBy: { releaseDate: "desc" } },
      reviews: {
        where: { deletedAt: null },
        include: { user: { select: { id: true, username: true } } },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      _count: { select: { reviews: { where: { deletedAt: null } } } },
    },
  });
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const game = await prisma.game.findFirst({
    where: { slug, isPublished: true },
    select: { title: true, description: true },
  });
  if (!game) return { title: "Game Not Found" };
  return { title: game.title, description: game.description.slice(0, 160) };
}

const QUALITY_COLORS: Record<string, string> = {
  AAA: "bg-yellow-500/15 text-yellow-700 border-yellow-500/30 dark:text-yellow-400",
  indie: "bg-violet-500/15 text-violet-700 border-violet-500/30 dark:text-violet-400",
  "free-to-play": "bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-400",
};
const QUALITY_LABELS: Record<string, string> = { AAA: "AAA", indie: "Indie", "free-to-play": "Free to Play" };

export default async function GameDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const [game, session] = await Promise.all([getGame(slug), auth()]);
  if (!game) notFound();

  const isFavorited = session?.user
    ? !!(await prisma.favorite.findUnique({
        where: { userId_gameId: { userId: session.user.id, gameId: game.id } },
      }))
    : false;

  const initialReviews = game.reviews.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-8">

      {/* Hero */}
      <div className="relative rounded-2xl overflow-hidden border bg-card">
        {/* Blurred backdrop */}
        {game.coverImageUrl && (
          <div className="absolute inset-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={game.coverImageUrl} alt="" aria-hidden className="w-full h-full object-cover blur-2xl opacity-20 scale-110" />
            <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/80 to-background/40" />
          </div>
        )}

        <div className="relative flex flex-col sm:flex-row gap-6 p-6">
          {/* Cover */}
          {game.coverImageUrl && (
            <div className="shrink-0 w-36 sm:w-44 rounded-xl overflow-hidden shadow-xl shadow-black/20 self-start">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={game.coverImageUrl} alt={game.title} className="w-full aspect-[3/4] object-cover" />
            </div>
          )}

          {/* Info */}
          <div className="flex-1 min-w-0 space-y-3">
            <div className="flex flex-wrap items-start gap-2">
              <h1 className="text-2xl sm:text-3xl font-bold flex-1 leading-tight">{game.title}</h1>
              {game.qualityTier && (
                <Badge className={`border text-xs font-semibold ${QUALITY_COLORS[game.qualityTier] ?? ""}`} variant="outline">
                  {QUALITY_LABELS[game.qualityTier] ?? game.qualityTier}
                </Badge>
              )}
            </div>

            {/* Meta */}
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" /> {game.releaseYear}
              </span>
              {game.developer && (
                <span className="flex items-center gap-1.5">
                  <User2 className="h-3.5 w-3.5" /> {game.developer}
                </span>
              )}
              {game.publisher && game.publisher !== game.developer && (
                <span className="flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5" /> {game.publisher}
                </span>
              )}
            </div>

            {/* Rating + favorite */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-1.5">
                <StarDisplay rating={game.avgRating} size="md" showValue />
                <span className="text-xs text-muted-foreground border-l pl-2">
                  {game.reviewCount} review{game.reviewCount !== 1 ? "s" : ""}
                </span>
              </div>
              <FavoriteButton gameId={game.id} initialFavorited={isFavorited} />
            </div>

            {/* Genres */}
            {game.gameGenres.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {game.gameGenres.map(({ genre }) => (
                  <GenreBadge key={genre.id} name={genre.name} slug={genre.slug} />
                ))}
              </div>
            )}

            {/* Description */}
            <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
              {game.description}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Trailer */}
          {game.youtubeVideoId && (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <span className="h-1 w-4 rounded-full bg-primary inline-block" />
                Trailer / Gameplay
              </h2>
              <YouTubeEmbed videoId={game.youtubeVideoId} title={`${game.title} trailer`} />
            </section>
          )}

          {/* Reviews */}
          <section className="space-y-4">
            <Separator />
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              Reviews &amp; Ratings
            </h2>
            <ReviewForm gameSlug={slug} />
            <ReviewList gameSlug={slug} initialReviews={initialReviews} initialTotal={game._count.reviews} />
          </section>
        </div>

        {/* Sidebar */}
        <aside className="space-y-4">
          {/* Details card */}
          <div className="rounded-2xl border bg-card p-4 space-y-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" /> Details
            </h3>
            <div className="space-y-2">
              {[
                { icon: Calendar, label: "Release Year", value: String(game.releaseYear) },
                { icon: User2, label: "Developer", value: game.developer },
                { icon: Building2, label: "Publisher", value: game.publisher },
              ]
                .filter(({ value }) => value)
                .map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Icon className="h-3.5 w-3.5" /> {label}
                    </span>
                    <span className="font-medium text-right max-w-[55%] truncate ml-2">{value}</span>
                  </div>
                ))}
            </div>
          </div>

          {/* Where to buy card */}
          {Array.isArray(game.purchaseLinks) && game.purchaseLinks.length > 0 && (
            <div className="rounded-2xl border bg-card p-4 space-y-3">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-primary" /> Where to Buy
              </h3>
              <div className="space-y-2">
                {(game.purchaseLinks as { store: string; url: string }[]).map((link, i) => (
                  <a
                    key={i}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between w-full rounded-lg border bg-muted/30 hover:bg-muted/60 px-3 py-2 text-sm font-medium transition-colors group"
                  >
                    <span>{link.store}</span>
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Version history card */}
          <div className="rounded-2xl border bg-card p-4 space-y-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <History className="h-4 w-4 text-primary" /> Version History
            </h3>
            <VersionHistoryList versions={game.versions} />
          </div>
        </aside>
      </div>
    </div>
  );
}
