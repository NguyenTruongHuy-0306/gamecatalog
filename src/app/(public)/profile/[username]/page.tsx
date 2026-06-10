import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { StarDisplay } from "@/components/shared/StarDisplay";
import Link from "next/link";
import { Heart, Star, MessageSquare, Calendar, ShieldCheck, Gamepad2, Users } from "lucide-react";
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username } = await params;
  return { title: `${decodeURIComponent(username)}'s Profile` };
}

export default async function PublicProfilePage({ params }: PageProps) {
  const { username } = await params;

  const user = await prisma.user.findFirst({
    where: { username: { equals: decodeURIComponent(username), mode: "insensitive" }, deletedAt: null },
    select: {
      id: true,
      username: true,
      bio: true,
      avatarUrl: true,
      role: true,
      createdAt: true,
      reviews: {
        where: { deletedAt: null },
        include: { game: { select: { id: true, title: true, slug: true, coverImageUrl: true, avgRating: true } } },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });

  if (!user) notFound();

  const [forumThreads] = await Promise.all([
    prisma.forumThread.findMany({
      where: {
        deletedAt: null,
        OR: [
          { authorId: user.id },
          { posts: { some: { authorId: user.id, deletedAt: null } } },
        ],
      },
      select: {
        id: true,
        title: true,
        lastPostAt: true,
        authorId: true,
        game: { select: { title: true, slug: true } },
        _count: { select: { posts: { where: { deletedAt: null } } } },
      },
      orderBy: { lastPostAt: "desc" },
      take: 20,
    }),
  ]);

  const initials = user.username.slice(0, 2).toUpperCase();
  const avgReviewRating = user.reviews.length
    ? (user.reviews.reduce((s, r) => s + r.rating, 0) / user.reviews.length).toFixed(1)
    : null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-0">
      {/* Hero banner */}
      <div className="relative hero-gradient rounded-2xl overflow-hidden mb-8">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5 pointer-events-none" />
        <div className="relative px-6 py-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-5">
            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="h-20 w-20 rounded-2xl overflow-hidden ring-4 ring-primary/20 shadow-lg shadow-primary/15">
                {user.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.avatarUrl} alt={initials} className="h-full w-full object-cover" />
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
                <h1 className="text-2xl font-bold">{user.username}</h1>
                <Badge variant={user.role === "admin" ? "default" : "secondary"} className="text-xs">
                  {user.role}
                </Badge>
              </div>
              {user.bio ? (
                <p className="text-sm text-muted-foreground max-w-md leading-relaxed">{user.bio}</p>
              ) : (
                <p className="text-sm text-muted-foreground italic">No bio.</p>
              )}
              <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  Joined {new Date(user.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                </span>
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3 mt-6">
            {[
              { icon: MessageSquare, label: "Reviews", value: user.reviews.length, color: "text-blue-500" },
              { icon: Users, label: "Threads", value: forumThreads.length, color: "text-violet-500" },
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

      {/* Forum Activity */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-violet-500/10">
            <Users className="h-4 w-4 text-violet-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold leading-none">Forum Activity</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{forumThreads.length} thread{forumThreads.length !== 1 ? "s" : ""}</p>
          </div>
        </div>

        {forumThreads.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-8 text-center">
            <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No forum activity yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {forumThreads.map((thread) => (
              <Link key={thread.id} href={`/forum/thread/${thread.id}`}
                className="group flex gap-3 p-4 rounded-xl border bg-card hover:border-primary/40 hover:shadow-md hover:shadow-primary/5 transition-all duration-200">
                <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-violet-500/10 shrink-0">
                  <Users className="h-4 w-4 text-violet-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-sm group-hover:text-primary transition-colors leading-tight line-clamp-1">
                      {thread.title}
                    </p>
                    <Badge variant="secondary" className="text-xs shrink-0">
                      {thread.authorId === user.id ? "Started" : "Replied"}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted-foreground">
                    {thread.game && (
                      <span className="flex items-center gap-1 text-primary/70">
                        <Gamepad2 className="h-3 w-3" />
                        {thread.game.title}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      {thread._count.posts} {thread._count.posts === 1 ? "reply" : "replies"}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(thread.lastPostAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                  </div>
                </div>
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
            <h2 className="text-lg font-semibold leading-none">Reviews</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{user.reviews.length} review{user.reviews.length !== 1 ? "s" : ""}</p>
          </div>
        </div>

        {user.reviews.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-8 text-center">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No reviews yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {user.reviews.map((review) => (
              <Link key={review.id} href={`/games/${review.game.slug}`}
                className="group flex gap-3 p-4 rounded-xl border bg-card hover:border-primary/40 hover:shadow-md hover:shadow-primary/5 transition-all duration-200">
                <div className="h-14 w-10 rounded-lg bg-muted shrink-0 overflow-hidden">
                  {review.game.coverImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={review.game.coverImageUrl} alt={review.game.title} className="h-full w-full object-cover" />
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
