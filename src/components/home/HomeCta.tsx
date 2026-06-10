"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { ScrollReveal } from "@/components/home/ScrollReveal";
import { ArrowRight, PenLine } from "lucide-react";

export function HomeCta() {
  const { data: session } = useSession();

  return (
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
  );
}
