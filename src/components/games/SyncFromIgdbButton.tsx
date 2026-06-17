"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

interface Props {
  gameId: string;
}

export function SyncFromIgdbButton({ gameId }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");

  const handleSync = async () => {
    setStatus("loading");
    const res = await fetch(`/api/admin/games/${gameId}/sync`, { method: "POST" });
    if (res.ok) {
      router.refresh();
    } else {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
    }
  };

  return (
    <button
      onClick={handleSync}
      disabled={status === "loading"}
      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
    >
      <RefreshCw className={`h-3 w-3 ${status === "loading" ? "animate-spin" : ""}`} />
      {status === "loading"
        ? "Syncing…"
        : status === "error"
          ? "Sync failed"
          : "Sync from IGDB"}
    </button>
  );
}
