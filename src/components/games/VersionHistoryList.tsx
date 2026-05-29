import { Badge } from "@/components/ui/badge";

interface GameVersion {
  id: string;
  versionLabel: string;
  releaseDate: Date | string;
  notes?: string | null;
}

export function VersionHistoryList({ versions }: { versions: GameVersion[] }) {
  if (versions.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-2">No version history available.</p>;
  }

  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-[7px] top-3 bottom-3 w-px bg-border" />

      <div className="space-y-4">
        {versions.map((v, i) => (
          <div key={v.id} className="flex gap-3 relative">
            {/* Dot */}
            <div className={`relative z-10 mt-1 h-3.5 w-3.5 rounded-full border-2 shrink-0 ${
              i === 0
                ? "bg-primary border-primary shadow-sm shadow-primary/40"
                : "bg-background border-border"
            }`} />

            <div className="flex-1 min-w-0 pb-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={i === 0 ? "default" : "secondary"} className="font-mono text-xs">
                  {v.versionLabel}
                </Badge>
                {i === 0 && (
                  <span className="text-xs font-medium text-primary">Latest</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {new Date(v.releaseDate).toLocaleDateString("en-US", {
                  year: "numeric", month: "short", day: "numeric",
                })}
              </p>
              {v.notes && (
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed whitespace-pre-line">
                  {v.notes}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
