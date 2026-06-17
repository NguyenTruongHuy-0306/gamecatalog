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
        <div className="grid md:grid-cols-[1fr_auto] gap-10 md:gap-16 items-center">
          <div>
            <p className="font-mono text-xs text-primary uppercase tracking-widest mb-4">
              Welcome back{session.user.username ? `, ${session.user.username}` : ""}
            </p>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight leading-tight mb-4">
              What will you<br />
              <span className="gradient-text">play next?</span>
            </h2>
            <p className="text-muted-foreground leading-relaxed text-base max-w-lg">
              Explore the catalog, discover something new, or share your thoughts on a game you&apos;ve played.
            </p>
          </div>
          <div className="flex flex-col gap-3 shrink-0 md:items-end">
            <Button
              render={<Link href="/games" />}
              size="lg"
              className="gap-2 shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:scale-[1.03] active:scale-[0.98] btn-sweep w-full md:w-auto"
            >
              Browse Games
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              render={<Link href="/games" />}
              size="lg"
              className="gap-2 hover:bg-primary/5 hover:border-primary/50 w-full md:w-auto"
            >
              <PenLine className="h-4 w-4" />
              Write a Review
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid md:grid-cols-[1fr_auto] gap-10 md:gap-16 items-center">
          <div>
            <p className="font-mono text-xs text-primary uppercase tracking-widest mb-4">
              Ready to start?
            </p>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight leading-tight mb-4">
              Rate games.<br />
              <span className="gradient-text">Share your takes.</span>
            </h2>
            <p className="text-muted-foreground leading-relaxed text-base max-w-lg">
              Create a free account to write reviews, track your favorites,
              and make your voice part of the community.
            </p>
          </div>
          <div className="flex flex-col gap-3 shrink-0 md:items-end">
            <Button
              render={<Link href="/signup" />}
              size="lg"
              className="gap-2 shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:scale-[1.03] active:scale-[0.98] btn-sweep w-full md:w-auto"
            >
              Create Free Account
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              render={<Link href="/games" />}
              size="lg"
              className="hover:bg-primary/5 hover:border-primary/50 w-full md:w-auto"
            >
              Browse First
            </Button>
          </div>
        </div>
      )}
    </ScrollReveal>
  );
}
