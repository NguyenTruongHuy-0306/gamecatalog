import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/db";
import { GameCard } from "@/components/games/GameCard";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { StarDisplay } from "@/components/shared/StarDisplay";
import { ScrollReveal } from "@/components/home/ScrollReveal";
import { AnimatedCounter } from "@/components/home/AnimatedCounter";
import { ArrowRight, Star, Zap, Shield, Infinity, PenLine } from "lucide-react";
import { auth } from "@/auth";
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
    id: "ratings",
    icon: Star,
    label: "01",
    title: "Community Ratings",
    desc: "Honest scores from verified players. No bots, no paid placements — just real opinions.",
    accent: "text-yellow-500",
    bg: "bg-yellow-500/8",
    span: "md:col-span-2",
  },
  {
    id: "filtering",
    icon: Zap,
    label: "02",
    title: "Smart Filtering",
    desc: "Drill down by genre, release year, quality tier, and rating. Find exactly what you want.",
    accent: "text-primary",
    bg: "bg-primary/8",
    span: "md:row-span-2",
  },
  {
    id: "trusted",
    icon: Shield,
    label: "03",
    title: "Trusted & Moderated",
    desc: "Email-verified accounts and active moderation keep the community genuine.",
    accent: "text-emerald-500",
    bg: "bg-emerald-500/8",
    span: "",
  },
  {
    id: "free",
    icon: Infinity,
    label: "04",
    title: "Free Forever",
    desc: "No subscriptions. No paywalls. GameCatalog is and always will be completely free.",
    accent: "text-violet-500",
    bg: "bg-violet-500/8",
    span: "",
  },
];

const MOSAIC_DELAYS = ["0s", "0.6s", "1.2s", "0.3s", "0.9s", "0.5s"];
const MOSAIC_FLOATS = [
  "animate-float-a",
  "animate-float-b",
  "animate-float-c",
  "animate-float-b",
  "animate-float-a",
  "animate-float-c",
];

export default async function HomePage() {
  const [topGames, stats, session] = await Promise.all([getTopRatedGames(), getStats(), auth()]);
  const [hero, ...rest] = topGames;
  const mosaicGames = topGames.slice(0, 6);
  const marqueeItems = topGames.length
    ? [...topGames, ...topGames].map((g) => g.title)
    : ["Elden Ring", "The Witcher 3", "Hades", "Celeste", "Portal 2", "Sekiro", "Disco Elysium",
       "Elden Ring", "The Witcher 3", "Hades", "Celeste", "Portal 2", "Sekiro", "Disco Elysium"];

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main id="main-content" className="flex-1">

        {/* ── HERO ── */}
        <section className="relative overflow-hidden min-h-[calc(100vh-4rem)] flex items-center">
          {/* Layered background */}
          <div className="absolute inset-0 bg-grid" aria-hidden="true" />
          <div
            className="absolute inset-0 animate-gradient-shift"
            style={{
              background:
                "radial-gradient(ellipse 70% 60% at 20% 50%, oklch(0.52 0.22 285 / 0.12) 0%, transparent 60%), radial-gradient(ellipse 50% 50% at 80% 30%, oklch(0.65 0.22 240 / 0.08) 0%, transparent 55%), radial-gradient(ellipse 40% 40% at 60% 80%, oklch(0.6 0.2 300 / 0.06) 0%, transparent 50%)",
            }}
            aria-hidden="true"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background pointer-events-none" aria-hidden="true" />

          <div className="relative mx-auto max-w-7xl w-full px-4 py-20 grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
            {/* Left: Text + CTAs */}
            <div>
              {/* Badge */}
              <div className="inline-flex items-center gap-2 font-mono text-xs text-primary border border-primary/30 rounded-full px-3 py-1.5 mb-8 animate-neon-pulse">
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                GAMECATALOG — COMMUNITY DISCOVERY
              </div>

              {/* Headline */}
              <h1 className="font-black tracking-tighter leading-[0.9] mb-6">
                <span
                  className="block text-6xl sm:text-7xl xl:text-8xl 2xl:text-9xl"
                  style={{ animationDelay: "0.1s" }}
                >
                  DISCOVER
                </span>
                <span
                  className="block text-6xl sm:text-7xl xl:text-8xl 2xl:text-9xl gradient-text"
                  style={{ animationDelay: "0.2s" }}
                >
                  GREAT
                </span>
                <span
                  className="block text-6xl sm:text-7xl xl:text-8xl 2xl:text-9xl text-outline opacity-30"
                  style={{ animationDelay: "0.3s" }}
                >
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
                  className="gap-2 shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:scale-[1.03] active:scale-[0.98] btn-glow"
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
              <div className="grid grid-cols-3 gap-0 border border-border/50 rounded-2xl overflow-hidden">
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

            {/* Right: Cover mosaic */}
            {mosaicGames.length > 0 && (
              <div className="hidden lg:flex items-center justify-center">
                <div className="relative w-full max-w-md xl:max-w-lg">
                  {/* Glow behind mosaic */}
                  <div
                    className="absolute inset-0 rounded-3xl blur-3xl opacity-30 animate-gradient-shift"
                    style={{
                      background:
                        "radial-gradient(ellipse at center, oklch(0.72 0.2 285 / 0.5), oklch(0.65 0.22 240 / 0.3), transparent 70%)",
                      backgroundSize: "200% 200%",
                    }}
                    aria-hidden="true"
                  />

                  <div className="relative grid grid-cols-3 gap-3 p-4">
                    {/* Column 1 */}
                    <div className="flex flex-col gap-3">
                      {[mosaicGames[0], mosaicGames[1]].map((game, i) =>
                        game ? (
                          <Link
                            key={game.id}
                            href={`/games/${game.slug}`}
                            className={`block rounded-xl overflow-hidden neon-card shadow-lg ${MOSAIC_FLOATS[i]}`}
                            style={{ animationDelay: MOSAIC_DELAYS[i], aspectRatio: i === 0 ? "3/4" : "3/3" }}
                          >
                            {game.coverImageUrl ? (
                              <Image
                                src={game.coverImageUrl}
                                alt={game.title}
                                width={200}
                                height={i === 0 ? 267 : 200}
                                priority={i === 0}
                                sizes="200px"
                                className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-2xl">
                                🎮
                              </div>
                            )}
                          </Link>
                        ) : null
                      )}
                    </div>

                    {/* Column 2 — shifted down */}
                    <div className="flex flex-col gap-3 translate-y-6">
                      {[mosaicGames[2], mosaicGames[3]].map((game, i) =>
                        game ? (
                          <Link
                            key={game.id}
                            href={`/games/${game.slug}`}
                            className={`block rounded-xl overflow-hidden neon-card shadow-lg ${MOSAIC_FLOATS[i + 2]}`}
                            style={{ animationDelay: MOSAIC_DELAYS[i + 2], aspectRatio: i === 0 ? "3/3" : "3/4" }}
                          >
                            {game.coverImageUrl ? (
                              <Image
                                src={game.coverImageUrl}
                                alt={game.title}
                                width={200}
                                height={i === 0 ? 200 : 267}
                                sizes="200px"
                                className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-2xl">
                                🎮
                              </div>
                            )}
                          </Link>
                        ) : null
                      )}
                    </div>

                    {/* Column 3 — shifted up */}
                    <div className="flex flex-col gap-3 -translate-y-4">
                      {[mosaicGames[4], mosaicGames[5]].map((game, i) =>
                        game ? (
                          <Link
                            key={game.id}
                            href={`/games/${game.slug}`}
                            className={`block rounded-xl overflow-hidden neon-card shadow-lg ${MOSAIC_FLOATS[i + 4]}`}
                            style={{ animationDelay: MOSAIC_DELAYS[i + 4], aspectRatio: "3/4" }}
                          >
                            {game.coverImageUrl ? (
                              <Image
                                src={game.coverImageUrl}
                                alt={game.title}
                                width={200}
                                height={267}
                                sizes="200px"
                                className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-2xl">
                                🎮
                              </div>
                            )}
                          </Link>
                        ) : null
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ── MARQUEE STRIP ── */}
        {topGames.length > 0 && (
          <div className="border-y border-border/60 overflow-hidden py-3.5 select-none bg-muted/20" aria-hidden="true">
            <div className="flex animate-marquee whitespace-nowrap gap-0">
              {marqueeItems.map((title, i) => (
                <span key={i} className="inline-flex items-center gap-5 px-5 text-sm font-semibold text-muted-foreground/60 tracking-wide uppercase">
                  {title}
                  <span className="text-primary/50 text-xs">◆</span>
                </span>
              ))}
            </div>
          </div>
        )}

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
                <ScrollReveal delay={100}>
                  <Link href={`/games/${hero.slug}`} className="group block mb-8">
                    <div className="relative overflow-hidden rounded-2xl neon-card hover:shadow-2xl hover:shadow-primary/15 transition-all duration-300 scanlines">
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
                          <span className="font-mono text-xs text-primary border border-primary/50 rounded-full px-2.5 py-0.5 animate-neon-pulse">
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
                </ScrollReveal>
              )}

              {/* Grid */}
              {rest.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {rest.map((game, i) => (
                    <ScrollReveal key={game.id} delay={i * 60}>
                      <GameCard {...game} rank={i + 2} />
                    </ScrollReveal>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── FEATURES BENTO ── */}
        <section className="py-20 px-4 border-t bg-muted/10">
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

            <div className="grid md:grid-cols-3 grid-rows-auto gap-4 auto-rows-fr">
              {features.map(({ id, icon: Icon, label, title, desc, accent, bg, span }, i) => (
                <ScrollReveal key={id} delay={i * 80} className={span}>
                  <div className={`h-full rounded-2xl border border-border/60 bg-card p-8 flex flex-col gap-4 group hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 neon-card ${id === "filtering" ? "md:row-span-2" : ""}`}>
                    <div className="flex items-start justify-between">
                      <div className={`flex items-center justify-center h-12 w-12 rounded-2xl ${bg} group-hover:scale-110 transition-transform duration-300`}>
                        <Icon className={`h-6 w-6 ${accent}`} />
                      </div>
                      <span className="font-mono text-xs text-muted-foreground/30 font-bold text-right">{label}</span>
                    </div>
                    <div className="mt-auto">
                      <h3 className="font-bold text-lg mb-2 tracking-tight">{title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="relative overflow-hidden py-28 px-4">
          {/* Animated gradient background */}
          <div
            className="absolute inset-0 animate-gradient-shift"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.52 0.22 285 / 0.12), oklch(0.65 0.22 240 / 0.08), oklch(0.6 0.2 300 / 0.1), oklch(0.52 0.22 285 / 0.12))",
              backgroundSize: "300% 300%",
            }}
            aria-hidden="true"
          />
          <div className="absolute inset-0 bg-grid opacity-40" aria-hidden="true" />

          {/* Top glow line */}
          <div className="absolute top-0 left-0 right-0 glow-line" aria-hidden="true" />
          <div className="absolute bottom-0 left-0 right-0 glow-line" aria-hidden="true" />

          <div className="relative mx-auto max-w-3xl text-center">
            <ScrollReveal>
              {session?.user ? (
                <>
                  <p className="font-mono text-xs text-primary uppercase tracking-widest mb-4">
                    Welcome back{session.user.username ? `, ${session.user.username}` : ""}
                  </p>
                  <h2 className="text-4xl md:text-6xl font-black tracking-tight leading-tight mb-5">
                    What will you<br />
                    <span className="gradient-text">play next?</span>
                  </h2>
                  <p className="text-muted-foreground mb-10 leading-relaxed text-lg max-w-xl mx-auto">
                    Explore the catalog, discover something new, or share your thoughts on a game you&apos;ve played.
                  </p>
                  <div className="flex flex-wrap gap-4 justify-center">
                    <Button
                      render={<Link href="/games" />}
                      size="lg"
                      className="gap-2 shadow-xl shadow-primary/30 hover:shadow-primary/50 hover:scale-[1.04] active:scale-[0.98] btn-glow px-8"
                    >
                      Browse Games
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      render={<Link href="/games" />}
                      size="lg"
                      className="gap-2 hover:bg-primary/5 hover:border-primary/50 px-8"
                    >
                      <PenLine className="h-4 w-4" />
                      Write a Review
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <p className="font-mono text-xs text-primary uppercase tracking-widest mb-4">
                    Ready to start?
                  </p>
                  <h2 className="text-4xl md:text-6xl font-black tracking-tight leading-tight mb-5">
                    Rate games.<br />
                    <span className="gradient-text">Share your takes.</span>
                  </h2>
                  <p className="text-muted-foreground mb-10 leading-relaxed text-lg max-w-xl mx-auto">
                    Create a free account to write reviews, track your favorites,
                    and make your voice part of the community.
                  </p>
                  <div className="flex flex-wrap gap-4 justify-center">
                    <Button
                      render={<Link href="/signup" />}
                      size="lg"
                      className="gap-2 shadow-xl shadow-primary/30 hover:shadow-primary/50 hover:scale-[1.04] active:scale-[0.98] btn-glow px-8"
                    >
                      Create Free Account
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      render={<Link href="/games" />}
                      size="lg"
                      className="hover:bg-primary/5 hover:border-primary/50 px-8"
                    >
                      Browse First
                    </Button>
                  </div>
                </>
              )}
            </ScrollReveal>
          </div>
        </section>

      </main>
      <Footer />
    </div>
  );
}
