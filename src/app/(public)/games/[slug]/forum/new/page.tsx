import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { NewThreadForm } from "@/components/forum/NewThreadForm";
import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const game = await prisma.game.findFirst({ where: { slug, isPublished: true }, select: { title: true } });
  if (!game) return { title: "Not Found" };
  return { title: `New Thread — ${game.title} Forum` };
}

export default async function NewGameThreadPage({ params }: PageProps) {
  const { slug } = await params;
  const [session, game] = await Promise.all([
    auth(),
    prisma.game.findFirst({ where: { slug, isPublished: true }, select: { id: true, title: true, slug: true } }),
  ]);

  if (!session?.user) redirect("/login");
  if (!game) notFound();

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
      <div>
        <Link href={`/games/${game.slug}/forum`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3">
          <ChevronLeft className="h-4 w-4" /> {game.title} Forum
        </Link>
        <h1 className="text-2xl font-bold">New Thread</h1>
        <p className="text-sm text-muted-foreground mt-1">Start a discussion about {game.title}.</p>
      </div>
      <NewThreadForm gameId={game.id} gameSlug={game.slug} />
    </div>
  );
}
