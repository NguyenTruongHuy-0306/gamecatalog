"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface FavoriteButtonProps {
  gameId: string;
  initialFavorited: boolean;
}

export function FavoriteButton({ gameId, initialFavorited }: FavoriteButtonProps) {
  const { data: session, status } = useSession();
  const [favorited, setFavorited] = useState(initialFavorited);
  const [loading, setLoading] = useState(false);
  const [animating, setAnimating] = useState(false);

  if (status === "loading") return null;

  if (!session?.user) {
    return (
      <Button variant="outline" size="sm" className="gap-2 hover:border-red-300 hover:text-red-500 transition-all"
        render={<Link href="/login" />}>
        <Heart className="h-4 w-4" />
        Add to Favorites
      </Button>
    );
  }

  const toggle = async () => {
    setLoading(true);
    setAnimating(true);
    setTimeout(() => setAnimating(false), 300);
    try {
      if (favorited) {
        const res = await fetch(`/api/user/favorites/${gameId}`, { method: "DELETE" });
        if (res.ok) { setFavorited(false); toast.success("Removed from favorites"); }
      } else {
        const res = await fetch("/api/user/favorites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ gameId }),
        });
        if (res.ok) { setFavorited(true); toast.success("Added to favorites ❤️"); }
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant={favorited ? "default" : "outline"}
      size="sm"
      onClick={toggle}
      disabled={loading}
      className={`gap-2 transition-all duration-200 hover:scale-105 active:scale-95 ${
        favorited
          ? "bg-red-500 hover:bg-red-600 border-red-500 text-white shadow-md shadow-red-500/25"
          : "hover:border-red-300 hover:text-red-500"
      }`}
    >
      <Heart
        className={`h-4 w-4 transition-all duration-200 ${
          favorited ? "fill-current" : ""
        } ${animating ? "scale-125" : "scale-100"}`}
      />
      {favorited ? "Favorited" : "Add to Favorites"}
    </Button>
  );
}
