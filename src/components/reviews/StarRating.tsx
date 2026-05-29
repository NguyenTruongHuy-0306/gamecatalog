"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  value: number;
  onChange: (rating: number) => void;
  disabled?: boolean;
}

export function StarRating({ value, onChange, disabled = false }: StarRatingProps) {
  const [hovered, setHovered] = useState(0);
  const active = hovered || value;

  return (
    <div className="flex gap-1" role="group" aria-label="Star rating">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={disabled}
          onClick={() => onChange(star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
          className={cn(
            "transition-all duration-100 hover:scale-125 focus-visible:scale-125 disabled:cursor-not-allowed disabled:opacity-50",
            active >= star && "drop-shadow-[0_0_4px_rgba(250,204,21,0.6)]"
          )}
        >
          <Star
            className={cn(
              "h-7 w-7 transition-all duration-100",
              active >= star
                ? "fill-yellow-400 text-yellow-400"
                : "fill-muted text-muted-foreground/50"
            )}
          />
        </button>
      ))}
    </div>
  );
}
