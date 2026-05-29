import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StarDisplay } from "@/components/shared/StarDisplay";
import Link from "next/link";
import { Settings, Heart, Star, MessageSquare, Calendar, CheckCircle2, ShieldCheck, Gamepad2, ArrowRight } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "My Profile" };

export default async function ProfilePage() {
  const session = await auth();
  const userId = session!.user.id;

  const [userRecord, reviews, favorites] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { username: true, bio: true, avatarUrl: true, createdAt: true },
    }),
    prisma.review.findMany({
      where: { userId, deletedAt: null },
      include: { game: { select: { id: true, title: true, slug: true, coverImageUrl: true, avgRating: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.favorite.findMany({
      where: { userId },
      include: {
        game: {
          include: { gameGenres: { include: { genre: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const user = session!.user;
  const initials = (user.username ?? user.name ?? "?").slice(0, 2).toUpperCase();

  const avgReviewRating = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  return (
    <div className="space-y-0">
      {/* Hero banner */}
      <div className="relative hero-gradient rounded-2xl overflow-hidden mb-8">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5 pointer-events-none" />
        <div className="relative px-6 py-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="h-20 w-20 rounded-2xl overflow-hidden ring-4 ring-primary/20 shadow-lg shadow-primary/15">
                {userRecord?.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={userRecord.avatarUrl} alt={initials} className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full bg-gradient-to-br from-primary/60 to-primary flex items-center justify-center text-primary-foreground text-2xl font-bold">
                    {initials}
                  </div>
                )}
              </div>
              {user.role === "admin" && (
                <div className="absolute -bottom-1.5 -right-1.5 bg-primary text-primary-foreground rounded-full p-1">
                  <ShieldCheck className="h-3.5 w-3.5" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-2xl font-bold">{user.username ?? user.name}</h1>
                <Badge variant={user.role === "admin" ? "default" : "secondary"} className="text-xs">
                  {user.role}
                </Badge>
              </div>
              {userRecord?.bio ? (
                <p className="text-sm text-muted-foreground max-w-md leading-relaxed">{userRecord.bio}</p>
              ) : (
                <p className="text-sm text-muted-foreground italic">No bio yet.</p>
              )}
              <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
                {user.emailVerified ? (
                  <span className="flex items-center gap-1 text-green-600 font-medium">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Email verified
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-orange-500 font-medium">
                    Email not verified
                  </span>
                )}
                {userRecord?.createdAt && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    Joined {new Date(userRecord.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                  </span>
                )}
              </div>
            </div>

            <Button variant="outline" size="sm" render={<Link href="/settings" />}
              className="gap-2 shrink-0 hover:bg-primary/10 hover:border-primary/40 transition-all">
              <Settings className="h-4 w-4" /> Edit Profile
            </Button>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3 mt-6">
            {[
              { icon: MessageSquare, label: "Reviews", value: reviews.length, color: "text-blue-500" },
              { icon: Heart, label: "Favorites", value: favorites.length, color: "text-red-500" },
              { icon: Star, label: "Avg Rating", value: avgReviewRating ?? "—", color: "text-yellow-500" },
            ].map(({ icon: Icon, label, value, color }) => (
              <div key={label} className="bg-background/60 backdrop-blur-sm rounded-xl p-3 text-center border border-border/50">
                <Icon className={`h-4 w-4 mx-auto mb-1 ${color}`} />
                <div className="text-xl font-bold">{value}</div>
                <div className="text-xs text-muted-foreground">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Favorite Games */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-red-500/10">
              <Heart className="h-4 w-4 text-red-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold leading-none">Favorite Games</h2>
              <p className="text-xs text-muted-foreground mt-0.5">{favorites.length} game{favorites.length !== 1 ? "s" : ""}</p>
            </div>
          </div>
          {favorites.length > 0 && (
            <Button variant="ghost" size="sm" render={<Link href="/games" />} className="gap-1 text-xs">
              Browse more <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        {favorites.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-10 text-center">
            <Gamepad2 className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
            <p className="font-medium text-sm mb-1">No favorites yet</p>
            <p className="text-xs text-muted-foreground mb-4">Browse games and click the heart button to save them here.</p>
            <Button size="sm" render={<Link href="/games" />} className="gap-2">
              <Gamepad2 className="h-4 w-4" /> Browse Games
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {favorites.map(({ game }) => (
              <Link key={game.id} href={`/games/${game.slug}`}
                className="group flex gap-3 p-3 rounded-xl border bg-card hover:border-primary/40 hover:shadow-md hover:shadow-primary/5 transition-all duration-200">
                {/* Cover thumbnail */}
                <div className="h-16 w-12 rounded-lg bg-muted shrink-0 overflow-hidden relative">
                  {game.coverImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={game.coverImageUrl} alt={game.title}
                      className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-300" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-xl">🎮</div>
                  )}
                </div>
                <div className="flex-1 min-w-0 py-0.5">
                  <p className="font-medium text-sm leading-tight line-clamp-1 group-hover:text-primary transition-colors">{game.title}</p>
                  <StarDisplay rating={game.avgRating} size="sm" showValue />
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {game.gameGenres.slice(0, 2).map(({ genre }) => (
                      <span key={genre.id} className="text-xs px-1.5 py-0.5 rounded-full bg-primary/8 text-primary font-medium">
                        {genre.name}
                      </span>
                    ))}
                  </div>
                </div>
                <Heart className="h-4 w-4 text-red-500 fill-red-500 shrink-0 mt-1 opacity-60 group-hover:opacity-100 transition-opacity" />
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Reviews */}
      <section className="space-y-4 pt-6">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-yellow-500/10">
            <Star className="h-4 w-4 text-yellow-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold leading-none">My Reviews</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{reviews.length} review{reviews.length !== 1 ? "s" : ""}</p>
          </div>
        </div>

        {reviews.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-10 text-center">
            <MessageSquare className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
            <p className="font-medium text-sm mb-1">No reviews yet</p>
            <p className="text-xs text-muted-foreground mb-4">Share your thoughts on games you&apos;ve played.</p>
            <Button size="sm" render={<Link href="/games" />} className="gap-2">
              Browse Games
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {reviews.map((review) => (
              <Link key={review.id} href={`/games/${review.game.slug}`}
                className="group flex gap-3 p-4 rounded-xl border bg-card hover:border-primary/40 hover:shadow-md hover:shadow-primary/5 transition-all duration-200">
                <div className="h-14 w-10 rounded-lg bg-muted shrink-0 overflow-hidden">
                  {review.game.coverImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={review.game.coverImageUrl} alt={review.game.title}
                      className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-lg">🎮</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-sm group-hover:text-primary transition-colors leading-tight">
                      {review.game.title}
                    </p>
                    <StarDisplay rating={review.rating} size="sm" showValue />
                  </div>
                  {review.body && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">{review.body}</p>
                  )}
                  <p className="text-xs text-muted-foreground/60 mt-1.5 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(review.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
