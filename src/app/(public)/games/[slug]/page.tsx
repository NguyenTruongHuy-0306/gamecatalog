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
import { STATUS_LABELS, STATUS_COLORS } from "@/lib/release-status-config";
import { Separator } from "@/components/ui/separator";
import { Calendar, User2, Building2, Layers, MessageSquare, History, ShoppingCart, ExternalLink, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { RecaptchaProvider } from "@/components/auth/RecaptchaProvider";
import { SyncFromIgdbButton } from "@/components/games/SyncFromIgdbButton";
import type { Metadata } from "next";

const STORE_PLATFORM: Record<string, string> = {
  "Steam": "PC",
  "Epic Games": "PC",
  "GOG": "PC",
  "EA App": "PC",
  "Battle.net": "PC",
  "Humble Bundle": "PC",
  "PlayStation Store": "Console",
  "Xbox": "Console",
  "Nintendo eShop": "Nintendo",
};

const PLATFORM_ORDER = ["PC", "Console", "Nintendo", "Other"];

function groupPurchaseLinks(links: { store: string; url: string }[]) {
  const groups = new Map<string, { store: string; url: string }[]>();
  for (const link of links) {
    const platform = STORE_PLATFORM[link.store] ?? "Other";
    if (!groups.has(platform)) groups.set(platform, []);
    groups.get(platform)!.push(link);
  }
  return PLATFORM_ORDER
    .filter((p) => groups.has(p))
    .map((platform) => ({ platform, links: groups.get(platform)! }));
}

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
      _count: {
        select: {
          reviews: { where: { deletedAt: null } },
          forumThreads: { where: { deletedAt: null } },
        },
      },
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

  const initialReviews = game.reviews.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    helpfulCount: r.helpfulCount,
    notHelpfulCount: r.notHelpfulCount,
  }));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-8">

      {/* Hero */}
      <div className="relative rounded-2xl overflow-hidden border bg-card">
        {/* Blurred backdrop */}
        {game.coverImageUrl && (
          <div className="absolute inset-0">
            <Image src={game.coverImageUrl} alt="" aria-hidden fill className="object-cover blur-2xl opacity-20 scale-110" sizes="100vw" />
            <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/80 to-background/40" />
          </div>
        )}

        <div className="relative flex flex-col sm:flex-row gap-6 p-6">
          {/* Cover */}
          {game.coverImageUrl && (
            <div className="shrink-0 w-36 sm:w-44 rounded-xl overflow-hidden shadow-xl shadow-black/20 self-start">
              <Image src={game.coverImageUrl} alt={game.title} width={176} height={235} priority className="w-full aspect-[3/4] object-cover" sizes="(max-width: 640px) 144px, 176px" />
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
              <Badge className={`border text-xs font-semibold ${STATUS_COLORS[game.releaseStatus]}`} variant="outline">
                {STATUS_LABELS[game.releaseStatus]}
              </Badge>
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
            <RecaptchaProvider>
              <ReviewForm gameSlug={slug} />
            </RecaptchaProvider>
            <ReviewList gameSlug={slug} initialReviews={initialReviews} initialTotal={game._count.reviews} />
          </section>
        </div>

        {/* Sidebar */}
        <aside className="space-y-4">
          {/* Admin utilities */}
          {session?.user?.role === "admin" && game.igdbId && (
            <div className="rounded-2xl border border-dashed bg-card/50 p-3 space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Admin</p>
              <SyncFromIgdbButton gameId={game.id} />
            </div>
          )}

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
              <div className="space-y-4">
                {groupPurchaseLinks(game.purchaseLinks as { store: string; url: string }[]).map(
                  ({ platform, links }) => (
                    <div key={platform}>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                        {platform}
                      </p>
                      <div className="space-y-2">
                        {links.map((link, i) => (
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
                  )
                )}
              </div>
            </div>
          )}

          {/* Community forum card */}
          <div className="rounded-2xl border bg-card p-4 space-y-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" /> Community Forum
            </h3>
            <p className="text-xs text-muted-foreground">
              {game._count.forumThreads === 0
                ? "No threads yet. Be the first to start a discussion!"
                : `${game._count.forumThreads} thread${game._count.forumThreads !== 1 ? "s" : ""} from the community`}
            </p>
            <div className="flex flex-col gap-2">
              <Link
                href={`/games/${slug}/forum`}
                className="flex items-center justify-center gap-1.5 w-full rounded-lg border bg-muted/30 hover:bg-muted/60 px-3 py-2 text-sm font-medium transition-colors"
              >
                <MessageSquare className="h-3.5 w-3.5" /> View Discussions
              </Link>
              <Link
                href={`/games/${slug}/forum/new`}
                className="flex items-center justify-center gap-1.5 w-full rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 px-3 py-2 text-sm font-medium transition-colors"
              >
                Start a Thread
              </Link>
            </div>
          </div>

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
