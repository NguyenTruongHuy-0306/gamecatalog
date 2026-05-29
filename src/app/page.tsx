import Link from "next/link";
import { prisma } from "@/lib/db";
import { GameCard } from "@/components/games/GameCard";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Gamepad2, Star, Shield, Zap, ArrowRight, TrendingUp } from "lucide-react";
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

const features = [
  {
    icon: Star,
    title: "Community Ratings",
    desc: "Honest reviews from verified players, protected by reCAPTCHA spam detection.",
    color: "text-yellow-500",
    bg: "bg-yellow-500/10",
  },
  {
    icon: Zap,
    title: "Smart Filtering",
    desc: "Filter by genre, release year, quality tier, and minimum rating to find exactly what you want.",
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    icon: Shield,
    title: "Secure & Trusted",
    desc: "Email-verified accounts and moderation tools keep the community genuine.",
    color: "text-green-500",
    bg: "bg-green-500/10",
  },
];

export default async function HomePage() {
  const topGames = await getTopRatedGames();

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main id="main-content" className="flex-1">

        {/* Hero */}
        <section className="hero-gradient pt-24 pb-20 px-4 text-center relative overflow-hidden">
          {/* Decorative orbs */}
          <div className="absolute top-10 left-1/4 w-72 h-72 rounded-full bg-primary/5 blur-3xl pointer-events-none" aria-hidden="true" />
          <div className="absolute bottom-0 right-1/4 w-96 h-64 rounded-full bg-primary/8 blur-3xl pointer-events-none" aria-hidden="true" />

          <div className="mx-auto max-w-3xl relative">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium mb-6">
              <TrendingUp className="h-3.5 w-3.5" />
              Community-powered game discovery
            </div>

            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-5 leading-tight">
              Discover Your{" "}
              <span className="gradient-text">Next Favorite</span>{" "}
              Game
            </h1>

            <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto leading-relaxed">
              Browse thousands of games, filter by genre and year, read community
              reviews, and rate what you&apos;ve played.
            </p>

            <div className="flex flex-wrap gap-3 justify-center">
              <Button
                render={<Link href="/games" />}
                size="lg"
                className="gap-2 shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:scale-[1.03] active:scale-[0.98] transition-all"
              >
                <Gamepad2 className="h-4.5 w-4.5" />
                Browse All Games
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                render={<Link href="/signup" />}
                size="lg"
                className="hover:bg-primary/5 hover:border-primary/40 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                Join the Community
              </Button>
            </div>

            {topGames.length > 0 && (
              <p className="mt-8 text-xs text-muted-foreground">
                {topGames.length}+ top-rated games and growing
              </p>
            )}
          </div>
        </section>

        {/* Features */}
        <section className="py-16 border-y bg-muted/20" aria-labelledby="features-heading">
          <div className="mx-auto max-w-5xl px-4">
            <h2 id="features-heading" className="sr-only">Features</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {features.map(({ icon: Icon, title, desc, color, bg }) => (
                <div
                  key={title}
                  className="flex flex-col items-center text-center gap-3 p-6 rounded-2xl bg-background border hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-200 group"
                >
                  <div className={`flex items-center justify-center h-12 w-12 rounded-xl ${bg} group-hover:scale-110 transition-transform duration-200`}>
                    <Icon className={`h-6 w-6 ${color}`} aria-hidden="true" />
                  </div>
                  <h3 className="font-semibold text-base">{title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Top Rated */}
        <section className="py-14 px-4">
          <div className="mx-auto max-w-7xl">
            <div className="flex items-end justify-between mb-8">
              <div>
                <div className="flex items-center gap-2 text-primary text-sm font-medium mb-1">
                  <Star className="h-4 w-4 fill-current" />
                  Community picks
                </div>
                <h2 className="text-3xl font-bold">Top Rated Games</h2>
                <p className="text-muted-foreground text-sm mt-1">Highest rated by our community</p>
              </div>
              <Button
                variant="outline"
                render={<Link href="/games?sort=rating" />}
                className="gap-1.5 hover:bg-primary/5 hover:border-primary/40 transition-all group"
              >
                View All
                <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Button>
            </div>

            {topGames.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Gamepad2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No games yet. Check back soon!</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {topGames.map((game) => (
                  <GameCard key={game.id} {...game} />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* CTA banner */}
        <section className="py-16 px-4">
          <div className="mx-auto max-w-3xl text-center bg-primary/5 border border-primary/15 rounded-3xl p-10">
            <h2 className="text-2xl font-bold mb-3">Ready to share your opinions?</h2>
            <p className="text-muted-foreground mb-6">
              Create a free account to rate games, write reviews, and build your favorites list.
            </p>
            <Button
              render={<Link href="/signup" />}
              size="lg"
              className="gap-2 shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:scale-[1.03] active:scale-[0.98] transition-all"
            >
              Create Free Account
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </section>

      </main>
      <Footer />
    </div>
  );
}
