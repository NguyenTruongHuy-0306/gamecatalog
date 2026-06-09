"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface IgdbSyncPanelProps {
  lastSyncedAt: number;
  pending: number;
}

function formatSyncTime(unix: number): string {
  if (unix === 0) return "Never";
  return new Date(unix * 1000).toLocaleString();
}

export function IgdbSyncPanel({ lastSyncedAt: initial, pending: initialPending }: IgdbSyncPanelProps) {
  const [syncing, setSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState(initial);
  const [pending, setPending] = useState(initialPending);
  const [lastResult, setLastResult] = useState<{ added: number; updated: number; errors: number } | null>(null);

  async function handleSync() {
    setSyncing(true);
    setLastResult(null);
    try {
      const res = await fetch("/api/admin/sync/igdb", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Sync failed");
      setLastResult({ added: data.added, updated: data.updated, errors: data.errors });
      setLastSyncedAt(Math.floor(Date.now() / 1000));
      setPending((p) => p + data.added);
      toast.success(`Sync complete — ${data.added} added, ${data.updated} updated`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="rounded-xl border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="font-semibold text-sm">IGDB Auto-Sync</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Last run: {formatSyncTime(lastSyncedAt)}
          </p>
        </div>
        <Button size="sm" onClick={handleSync} disabled={syncing} className="shrink-0">
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Syncing…" : "Sync Now"}
        </Button>
      </div>

      {pending > 0 && (
        <div className="flex items-center justify-between text-sm bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 rounded-lg px-3 py-2">
          <span>{pending} game{pending !== 1 ? "s" : ""} pending review</span>
          <Link
            href="/admin/games?filter=pending"
            className="flex items-center gap-1 text-xs font-medium hover:underline"
          >
            Review <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      )}

      {lastResult && (
        <div className="flex gap-2 flex-wrap">
          <Badge variant="outline" className="text-xs gap-1">
            +{lastResult.added} added
          </Badge>
          <Badge variant="outline" className="text-xs gap-1">
            {lastResult.updated} updated
          </Badge>
          {lastResult.errors > 0 && (
            <Badge variant="destructive" className="text-xs gap-1">
              {lastResult.errors} errors
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
