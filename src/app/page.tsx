import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/db";
import { GameCard } from "@/components/games/GameCard";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { StarDisplay } from "@/components/shared/StarDisplay";
import { ArrowRight, Star, Zap, Shield } from "lucide-react";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "GameCatalog — Discover & Rate Games",
  description:
    "Browse top-rated games by genre, year, and quality. Read and write reviews, discover hidden gems.",
};

async function getTopRatedGames() {
  try {
    return await prisma.game.findMany({
      where: { isPublished: true },
      orderBy: { avgRating: "desc" },
      take: 10,
      include: { gameGenres: { include: { genre: true } } },
    });
  } catch {
    return [];
  }
}

async function getStats() {
  try {
    const [games, reviews] = await Promise.all([
      prisma.game.count({ where: { isPublished: true } }),
      prisma.review.count({ where: { deletedAt: null } }),
    ]);
    return { games, reviews };
  } catch {
    return { games: 0, reviews: 0 };
  }
}

const features = [
  {
    num: "01",
    icon: Star,
    title: "Community Ratings",
    desc: "Honest scores from verified players. No bots, no paid placements — just real opinions protected by reCAPTCHA.",
    accent: "text-yellow-500",
  },
  {
    num: "02",
    icon: Zap,
    title: "Smart Filtering",
    desc: "Drill down by genre, release year, quality tier, and minimum rating. Find exactly what you want in seconds.",
    accent: "text-primary",
  },
  {
    num: "03",
    icon: Shield,
    title: "Trusted & Moderated",
    desc: "Email-verified accounts and an active moderation system keep the community genuine and the data clean.",
    accent: "text-emerald-500",
  },
];

export default async function HomePage() {
  const [topGames, stats] = await Promise.all([getTopRatedGames(), getStats()]);
  const [hero, ...rest] = topGames;
  const marqueeItems = topGames.length
    ? [...topGames, ...topGames].map((g) => g.title)
    : ["Elden Ring", "The Witcher 3", "Hades", "Celeste", "Portal 2", "Sekiro", "Disco Elysium", "Elden Ring", "The Witcher 3", "Hades", "Celeste", "Portal 2", "Sekiro", "Disco Elysium"];

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main id="main-content" className="flex-1">

        {/* ── HERO ── */}
        <section className="relative overflow-hidden bg-grid">
          {/* Radial fade over the grid */}
          <div className="absolute inset-0 bg-gradient-to-b from-background/0 via-background/0 to-background pointer-events-none" aria-hidden="true" />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/0 to-background pointer-events-none" aria-hidden="true" />

          <div className="relative mx-auto max-w-7xl px-4 pt-20 pb-16">
            {/* System label */}
            <div className="inline-flex items-center gap-2 font-mono text-xs text-primary border border-primary/30 rounded px-2.5 py-1 mb-8 ring-glow">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              GAMECATALOG — COMMUNITY DISCOVERY PLATFORM
            </div>

            {/* Headline */}
            <h1 className="font-black tracking-tighter leading-none mb-6">
              <span className="block text-5xl sm:text-7xl md:text-8xl xl:text-9xl">
                DISCOVER
              </span>
              <span className="block text-5xl sm:text-7xl md:text-8xl xl:text-9xl gradient-text">
                GREAT
              </span>
              <span className="block text-5xl sm:text-7xl md:text-8xl xl:text-9xl text-outline opacity-40">
                GAMES.
              </span>
            </h1>

            <p className="max-w-md text-base text-muted-foreground leading-relaxed mb-10">
              Browse thousands of titles, filter by genre and year, and read
              reviews from a verified community of players.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mb-12 sm:mb-16">
              <Button
                render={<Link href="/games" />}
                size="lg"
                className="gap-2 shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:scale-[1.03] active:scale-[0.98]"
              >
                Browse All Games
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                render={<Link href="/signup" />}
                size="lg"
                className="hover:bg-primary/5 hover:border-primary/40"
              >
                Join Free
              </Button>
            </div>

            {/* Stats bar */}
            <div className="grid grid-cols-3 gap-4 border-t border-border/50 pt-6 sm:flex sm:gap-8">
              <div>
                <span className="block text-xl sm:text-2xl font-black tabular-nums">{stats.games.toLocaleString()}</span>
                <span className="text-muted-foreground text-xs uppercase tracking-wider font-medium">Games</span>
              </div>
              <div className="sm:border-l sm:border-border/50 sm:pl-8">
                <span className="block text-xl sm:text-2xl font-black tabular-nums">{stats.reviews.toLocaleString()}</span>
                <span className="text-muted-foreground text-xs uppercase tracking-wider font-medium">Reviews</span>
              </div>
              <div className="sm:border-l sm:border-border/50 sm:pl-8">
                <span className="block text-xl sm:text-2xl font-black">100%</span>
                <span className="text-muted-foreground text-xs uppercase tracking-wider font-medium">Free</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── MARQUEE STRIP ── */}
        {topGames.length > 0 && (
          <div className="border-y border-border/60 bg-muted/30 overflow-hidden py-3 select-none" aria-hidden="true">
            <div className="flex animate-marquee whitespace-nowrap gap-0">
              {marqueeItems.map((title, i) => (
                <span key={i} className="inline-flex items-center gap-4 px-4 text-sm font-medium text-muted-foreground">
                  {title}
                  <span className="text-primary/60">◆</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── HERO GAME + GRID ── */}
        {topGames.length > 0 && (
          <section className="py-16 px-4">
            <div className="mx-auto max-w-7xl">
              {/* Section label */}
              <div className="flex items-center gap-3 mb-8">
                <span className="h-px flex-1 bg-border" />
                <span className="font-mono text-xs text-muted-foreground uppercase tracking-widest">Community&apos;s Best</span>
                <span className="h-px flex-1 bg-border" />
              </div>

              {/* #1 Hero card */}
              {hero && (
                <Link href={`/games/${hero.slug}`} className="group block mb-6">
                  <div className="relative overflow-hidden rounded-2xl ring-1 ring-border hover:ring-primary/40 transition-all duration-300 hover:shadow-2xl hover:shadow-primary/10">
                    <div className="relative aspect-[21/9] md:aspect-[3/1] bg-muted">
                      {hero.coverImageUrl ? (
                        <Image
                          src={hero.coverImageUrl}
                          alt={hero.title}
                          fill
                          className="object-cover transition-transform duration-700 group-hover:scale-105"
                          priority
                          sizes="100vw"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5" />
                      )}
                      {/* Gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/50 to-black/10" />
                    </div>

                    {/* Info overlay */}
                    <div className="absolute inset-0 flex flex-col justify-end md:justify-center p-6 md:p-10 md:max-w-lg">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="font-mono text-xs text-primary border border-primary/40 rounded px-2 py-0.5">#1 RANKED</span>
                        {hero.qualityTier && (
                          <span className="font-mono text-xs text-muted-foreground border border-border/50 rounded px-2 py-0.5">
                            {hero.qualityTier.toUpperCase()}
                          </span>
                        )}
                      </div>
                      <h2 className="text-white text-2xl md:text-4xl font-black tracking-tight leading-tight mb-3">
                        {hero.title}
                      </h2>
                      <div className="flex items-center gap-4 mb-4">
                        <StarDisplay rating={hero.avgRating} size="md" showValue />
                        <span className="text-white/50 text-sm">{hero.reviewCount} reviews</span>
                        <span className="text-white/50 text-sm">{hero.releaseYear}</span>
                      </div>
                      {hero.gameGenres.length > 0 && (
                        <div className="flex gap-2 flex-wrap">
                          {hero.gameGenres.slice(0, 3).map(({ genre }) => (
                            <span key={genre.id} className="text-xs text-white/70 border border-white/20 rounded px-2 py-0.5">
                              {genre.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Arrow on hover */}
                    <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
                      <div className="flex items-center gap-1 text-white/80 text-sm font-medium">
                        View Game <ArrowRight className="h-4 w-4" />
                      </div>
                    </div>
                  </div>
                </Link>
              )}

              {/* Remaining games grid */}
              {rest.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {rest.map((game, i) => (
                    <GameCard key={game.id} {...game} rank={i + 2} />
                  ))}
                </div>
              )}

              <div className="text-center mt-8">
                <Button
                  variant="outline"
                  render={<Link href="/games" />}
                  className="gap-2 hover:bg-primary/5 hover:border-primary/40 group"
                >
                  View Full Catalog
                  <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                </Button>
              </div>
            </div>
          </section>
        )}

        {/* ── FEATURES ── */}
        <section className="py-16 px-4 border-t bg-muted/20">
          <div className="mx-auto max-w-5xl">
            <div className="flex items-center gap-3 mb-12">
              <span className="h-px flex-1 bg-border" />
              <span className="font-mono text-xs text-muted-foreground uppercase tracking-widest">Why GameCatalog</span>
              <span className="h-px flex-1 bg-border" />
            </div>
            <div className="grid md:grid-cols-3 gap-px bg-border rounded-2xl overflow-hidden">
              {features.map(({ num, icon: Icon, title, desc, accent }) => (
                <div key={num} className="bg-background p-8 flex flex-col gap-4 group hover:bg-muted/40 transition-colors duration-200">
                  <div className="flex items-start justify-between">
                    <div className={`flex items-center justify-center h-10 w-10 rounded-xl bg-muted group-hover:scale-110 transition-transform duration-200`}>
                      <Icon className={`h-5 w-5 ${accent}`} />
                    </div>
                    <span className="font-mono text-xs text-muted-foreground/40 font-bold">{num}</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-base mb-2">{title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="py-20 px-4 bg-grid relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 pointer-events-none" aria-hidden="true" />
          <div className="relative mx-auto max-w-2xl text-center">
            <p className="font-mono text-xs text-primary uppercase tracking-widest mb-4">Ready to start?</p>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight leading-tight mb-4">
              Rate games.<br />
              <span className="gradient-text">Share your takes.</span>
            </h2>
            <p className="text-muted-foreground mb-8 leading-relaxed">
              Create a free account to write reviews, track favorites, and
              make your voice part of the community.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Button
                render={<Link href="/signup" />}
                size="lg"
                className="gap-2 shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:scale-[1.03] active:scale-[0.98]"
              >
                Create Free Account
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                render={<Link href="/games" />}
                size="lg"
                className="text-muted-foreground hover:text-foreground"
              >
                Browse First
              </Button>
            </div>
          </div>
        </section>

      </main>
      <Footer />
    </div>
  );
}
