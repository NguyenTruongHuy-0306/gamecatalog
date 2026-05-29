"use client";

import { useState } from "react";
import Image from "next/image";
import { Play } from "lucide-react";

interface YouTubeEmbedProps {
  videoId: string;
  title?: string;
}

export function YouTubeEmbed({ videoId, title = "Game Trailer" }: YouTubeEmbedProps) {
  const [active, setActive] = useState(false);
  const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
  const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;

  if (active) {
    return (
      <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-black">
        <iframe
          src={embedUrl}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 w-full h-full"
        />
      </div>
    );
  }

  return (
    <button
      className="relative w-full aspect-video rounded-lg overflow-hidden group bg-black cursor-pointer"
      onClick={() => setActive(true)}
      aria-label={`Play ${title}`}
    >
      <Image
        src={thumbnailUrl}
        alt={title}
        fill
        className="object-cover opacity-80 group-hover:opacity-70 transition-opacity"
        sizes="(max-width: 1024px) 100vw, 768px"
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="bg-red-600 rounded-full p-4 shadow-xl group-hover:scale-110 transition-transform">
          <Play className="h-8 w-8 fill-white text-white" />
        </div>
      </div>
    </button>
  );
}
