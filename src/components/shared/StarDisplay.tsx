import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarDisplayProps {
  rating: number;
  max?: number;
  size?: "sm" | "md" | "lg";
  showValue?: boolean;
}

export function StarDisplay({ rating, max = 5, size = "md", showValue = false }: StarDisplayProps) {
  const sizeClass = { sm: "h-3 w-3", md: "h-4 w-4", lg: "h-5 w-5" }[size];
  const valueClass = { sm: "text-xs", md: "text-sm", lg: "text-base" }[size];

  return (
    <div className="flex items-center gap-1">
      <div className="flex gap-0.5">
        {Array.from({ length: max }).map((_, i) => (
          <Star
            key={i}
            className={cn(
              sizeClass,
              "transition-colors",
              i < Math.round(rating)
                ? "fill-yellow-400 text-yellow-400"
                : "fill-muted text-muted-foreground/40"
            )}
          />
        ))}
      </div>
      {showValue && (
        <span className={cn(valueClass, "font-medium tabular-nums text-muted-foreground")}>
          {rating.toFixed(1)}
        </span>
      )}
    </div>
  );
}
