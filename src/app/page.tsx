import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { StarDisplay } from "@/components/shared/StarDisplay";
import { ScrollReveal } from "@/components/home/ScrollReveal";
import { AnimatedCounter } from "@/components/home/AnimatedCounter";
import { HomeCta } from "@/components/home/HomeCta";
import { ArrowRight, Star, Zap, Shield, Infinity } from "lucide-react";
import type { Metadata } from "next";

export const revalidate = 3600;

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
    id: "ratings",
    icon: Star,
    title: "Community Ratings",
    desc: "Honest scores from verified players. No bots, no paid placements — just real opinions.",
    accent: "text-primary",
    bg: "bg-primary/8",
  },
  {
    id: "filtering",
    icon: Zap,
    title: "Smart Filtering",
    desc: "Drill down by genre, release year, quality tier, and rating. Find exactly what you want.",
    accent: "text-sky-400",
    bg: "bg-sky-400/8",
  },
  {
    id: "trusted",
    icon: Shield,
    title: "Trusted & Moderated",
    desc: "Email-verified accounts and active moderation keep the community genuine.",
    accent: "text-emerald-500",
    bg: "bg-emerald-500/8",
  },
  {
    id: "free",
    icon: Infinity,
    title: "Free Forever",
    desc: "No subscriptions. No paywalls. GameCatalog is and always will be completely free.",
    accent: "text-violet-400",
    bg: "bg-violet-400/8",
  },
];

export default async function HomePage() {
  const [topGames, stats] = await Promise.all([getTopRatedGames(), getStats()]);
  const [hero, ...rest] = topGames;

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main id="main-content" className="flex-1">

        {/* ── HERO ── */}
        <section className="relative overflow-hidden min-h-[calc(100vh-4rem)] flex items-center">
          {/* Full-bleed featured cover — right side, large screens only */}
          {hero?.coverImageUrl && (
            <div className="absolute right-0 top-0 bottom-0 w-[45%] hidden lg:block" aria-hidden="true">
              <Image
                src={hero.coverImageUrl}
                alt=""
                fill
                className="object-cover object-center"
                priority
                sizes="45vw"
              />
              {/* Fade cover into background from left */}
              <div className="absolute inset-0 bg-gradient-to-r from-background via-background/65 to-transparent" />
              {/* Bottom fade */}
              <div className="absolute inset-0 bg-gradient-to-t from-background/30 to-transparent" />
            </div>
          )}

          {/* Subtle radial warmth on the left */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse 60% 70% at 10% 50%, oklch(0.78 0.18 75 / 0.07) 0%, transparent 60%)",
            }}
            aria-hidden="true"
          />
          {/* Bottom blend to next section */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background pointer-events-none" aria-hidden="true" />

          <div className="relative mx-auto max-w-7xl w-full px-4 py-20 lg:py-28">
            <div className="max-w-[55%] max-lg:max-w-full">

              {/* Badge */}
              <div className="inline-flex items-center gap-2 font-mono text-xs text-primary border border-primary/30 rounded-full px-3 py-1.5 mb-8">
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                GAMECATALOG — COMMUNITY DISCOVERY
              </div>

              {/* Headline */}
              <h1 className="font-black tracking-tighter leading-[0.9] mb-6">
                <span className="block text-6xl sm:text-7xl xl:text-8xl 2xl:text-9xl">
                  DISCOVER
                </span>
                <span className="block text-6xl sm:text-7xl xl:text-8xl 2xl:text-9xl gradient-text">
                  GREAT
                </span>
                <span className="block text-6xl sm:text-7xl xl:text-8xl 2xl:text-9xl text-outline opacity-30">
                  GAMES.
                </span>
              </h1>

              <p className="max-w-sm text-base text-muted-foreground leading-relaxed mb-10">
                Browse thousands of titles, filter by genre and year, and read
                reviews from a verified community of real players.
              </p>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-3 mb-14">
                <Button
                  render={<Link href="/games" />}
                  size="lg"
                  className="gap-2 shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:scale-[1.03] active:scale-[0.98] btn-sweep"
                >
                  Browse All Games
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  render={<Link href="/signup" />}
                  size="lg"
                  className="hover:bg-primary/5 hover:border-primary/50"
                >
                  Join Free
                </Button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-0 border border-border/50 rounded-xl overflow-hidden max-w-sm">
                {[
                  { value: stats.games, suffix: "", label: "Games" },
                  { value: stats.reviews, suffix: "", label: "Reviews" },
                  { value: 100, suffix: "%", label: "Free" },
                ].map(({ value, suffix, label }, i) => (
                  <div
                    key={label}
                    className={`px-4 py-5 ${i > 0 ? "border-l border-border/50" : ""} bg-card/50 backdrop-blur-sm`}
                  >
                    <span className="block text-2xl sm:text-3xl font-black">
                      <AnimatedCounter value={value} suffix={suffix} />
                    </span>
                    <span className="text-muted-foreground text-xs uppercase tracking-wider font-medium mt-0.5 block">
                      {label}
                    </span>
                  </div>
                ))}
              </div>

            </div>
          </div>
        </section>

        {/* ── TOP RANKED ── */}
        {topGames.length > 0 && (
          <section className="py-20 px-4">
            <div className="mx-auto max-w-7xl">
              <ScrollReveal>
                <div className="flex items-end justify-between mb-10">
                  <div>
                    <p className="font-mono text-xs text-primary uppercase tracking-widest mb-2">
                      Community&apos;s Best
                    </p>
                    <h2 className="text-3xl md:text-4xl font-black tracking-tight">
                      Top Ranked Games
                    </h2>
                  </div>
                  <Button
                    variant="ghost"
                    render={<Link href="/games" />}
                    className="gap-2 text-muted-foreground hover:text-foreground group shrink-0"
                  >
                    View all
                    <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </Button>
                </div>
              </ScrollReveal>

              {/* #1 Hero card */}
              {hero && (
                <Link href={`/games/${hero.slug}`} className="group block mb-8">
                  <div className="relative overflow-hidden rounded-2xl neon-card hover:shadow-2xl hover:shadow-primary/15 transition-all duration-300">
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
                      <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/60 to-black/10" />
                    </div>

                    <div className="absolute inset-0 flex flex-col justify-end md:justify-center p-6 md:p-12 md:max-w-xl">
                      <div className="flex items-center gap-2 mb-4">
                        <span className="font-mono text-xs text-primary border border-primary/50 rounded-full px-2.5 py-0.5">
                          #1 RANKED
                        </span>
                        {hero.qualityTier && (
                          <span className="font-mono text-xs text-white/50 border border-white/20 rounded-full px-2.5 py-0.5">
                            {hero.qualityTier.toUpperCase()}
                          </span>
                        )}
                      </div>
                      <h2 className="text-white text-3xl md:text-5xl font-black tracking-tight leading-none mb-4">
                        {hero.title}
                      </h2>
                      <div className="flex items-center gap-5 mb-4">
                        <StarDisplay rating={hero.avgRating} size="md" showValue />
                        <span className="text-white/40 text-sm">{hero.reviewCount} reviews</span>
                        <span className="text-white/40 text-sm">{hero.releaseYear}</span>
                      </div>
                      {hero.gameGenres.length > 0 && (
                        <div className="flex gap-2 flex-wrap">
                          {hero.gameGenres.slice(0, 3).map(({ genre }) => (
                            <span key={genre.id} className="text-xs text-white/60 border border-white/15 rounded-full px-3 py-1">
                              {genre.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="absolute bottom-6 right-6 md:bottom-auto md:right-10 md:top-1/2 md:-translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-3 group-hover:translate-x-0">
                      <div className="flex items-center gap-2 text-white/80 text-sm font-medium bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
                        View Game <ArrowRight className="h-3.5 w-3.5" />
                      </div>
                    </div>
                  </div>
                </Link>
              )}

              {/* Leaderboard #2–#10 */}
              {rest.length > 0 && (
                <ScrollReveal>
                  <ol>
                    {rest.slice(0, 9).map((game, i) => {
                      const rank = i + 2;
                      const genres = game.gameGenres?.slice(0, 2).map(({ genre }) => genre.name).join(", ");
                      return (
                        <li key={game.id}>
                          <Link
                            href={`/games/${game.slug}`}
                            className="group grid grid-cols-[3rem_3rem_1fr_auto] sm:grid-cols-[4rem_3.5rem_1fr_auto_auto] items-center gap-4 sm:gap-6 py-4 hover:bg-primary/[0.04] transition-colors duration-150 -mx-4 px-4 rounded-lg"
                          >
                            {/* Rank */}
                            <span className="font-mono text-4xl sm:text-5xl font-black text-muted-foreground/15 leading-none tabular-nums text-right select-none">
                              {rank}
                            </span>

                            {/* Thumbnail */}
                            <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-md overflow-hidden bg-muted shrink-0">
                              {game.coverImageUrl ? (
                                <Image
                                  src={game.coverImageUrl}
                                  alt={game.title}
                                  fill
                                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                                  sizes="56px"
                                />
                              ) : (
                                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5" />
                              )}
                            </div>

                            {/* Title + genres */}
                            <div className="min-w-0">
                              <p className="font-bold text-sm leading-tight line-clamp-1 group-hover:text-primary transition-colors duration-200">
                                {game.title}
                              </p>
                              {genres && (
                                <p className="text-xs text-muted-foreground/60 mt-0.5 line-clamp-1">{genres}</p>
                              )}
                            </div>

                            {/* Year — hidden on smallest column layout */}
                            <span className="hidden sm:block text-sm text-muted-foreground/50 tabular-nums font-medium shrink-0">
                              {game.releaseYear}
                            </span>

                            {/* Rating */}
                            <div className="flex items-center gap-1.5 shrink-0">
                              <StarDisplay rating={game.avgRating} size="sm" />
                              <span className="text-xs font-semibold tabular-nums text-muted-foreground hidden sm:block">
                                {game.avgRating.toFixed(1)}
                              </span>
                            </div>
                          </Link>
                          {i < rest.slice(0, 9).length - 1 && (
                            <div className="h-px bg-border/40" aria-hidden="true" />
                          )}
                        </li>
                      );
                    })}
                  </ol>
                </ScrollReveal>
              )}
            </div>
          </section>
        )}

        {/* ── FEATURES ── */}
        <section className="py-20 px-4 border-t">
          <div className="mx-auto max-w-7xl">
            <ScrollReveal>
              <div className="mb-12">
                <p className="font-mono text-xs text-primary uppercase tracking-widest mb-2">
                  Why GameCatalog
                </p>
                <h2 className="text-3xl md:text-4xl font-black tracking-tight">
                  Built for gamers,<br />
                  <span className="gradient-text">by gamers.</span>
                </h2>
              </div>
            </ScrollReveal>

            <div className="flex flex-col">
              {features.map(({ id, icon: Icon, title, desc, accent, bg }, i) => (
                <ScrollReveal key={id} delay={i * 80}>
                  <div className={`grid grid-cols-[auto_1fr] gap-6 items-start py-8 ${i > 0 ? "border-t border-border/50" : ""}`}>
                    <div className={`flex items-center justify-center h-12 w-12 rounded-xl ${bg} shrink-0 mt-0.5`}>
                      <Icon className={`h-6 w-6 ${accent}`} />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg tracking-tight mb-1">{title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">{desc}</p>
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="relative py-24 px-4 border-t">
          <div className="absolute top-0 left-0 right-0 glow-line" aria-hidden="true" />
          <div className="relative mx-auto max-w-7xl">
            <HomeCta />
          </div>
        </section>

      </main>
      <Footer />
    </div>
  );
}
