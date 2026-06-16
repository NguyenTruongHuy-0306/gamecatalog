"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, ExternalLink, RotateCcw } from "lucide-react";
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
  const [lastResult, setLastResult] = useState<{ added: number; updated: number; errors: number; hasMore?: boolean } | null>(null);
  const abortRef = useRef(false);

  async function handleSync() {
    setSyncing(true);
    setLastResult(null);
    try {
      const res = await fetch("/api/admin/sync/igdb", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Sync failed");
      setLastResult({ added: data.added, updated: data.updated, errors: data.errors, hasMore: data.hasMore });
      setLastSyncedAt(Math.floor(Date.now() / 1000));
      setPending((p) => p + data.added);
      toast.success(`Sync complete — ${data.added} added, ${data.updated} updated${data.hasMore ? " (more pages remain)" : ""}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  }

  async function handleFullImport() {
    setSyncing(true);
    setLastResult(null);
    abortRef.current = false;
    let totalAdded = 0;
    let totalUpdated = 0;
    let totalErrors = 0;
    let isFirst = true;
    let page = 0;

    try {
      while (!abortRef.current) {
        const url = isFirst ? "/api/admin/sync/igdb?full=true" : "/api/admin/sync/igdb";
        isFirst = false;
        page++;

        const res = await fetch(url, { method: "POST" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Sync failed");

        totalAdded += data.added ?? 0;
        totalUpdated += data.updated ?? 0;
        totalErrors += data.errors ?? 0;

        setLastResult({ added: totalAdded, updated: totalUpdated, errors: totalErrors, hasMore: data.hasMore });
        setPending((p) => p + (data.added ?? 0));

        if (!data.hasMore) break;
      }

      setLastSyncedAt(Math.floor(Date.now() / 1000));
      if (abortRef.current) {
        toast.info(`Import paused after ${page} pages — ${totalAdded} added, ${totalUpdated} updated`);
      } else {
        toast.success(`Full import complete — ${totalAdded} added, ${totalUpdated} updated`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    } finally {
      setSyncing(false);
      abortRef.current = false;
    }
  }

  function handleStop() {
    abortRef.current = true;
  }

  async function handleRestart() {
    setSyncing(true);
    setLastResult(null);
    try {
      const res = await fetch("/api/admin/sync/igdb?full=true", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Reset failed");
      setLastResult({ added: data.added, updated: data.updated, errors: data.errors, hasMore: data.hasMore });
      setLastSyncedAt(Math.floor(Date.now() / 1000));
      setPending((p) => p + data.added);
      toast.success(`Sync restarted — ${data.added} added, ${data.updated} updated${data.hasMore ? ". Press Full Import to continue." : ""}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Restart failed");
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
        <div className="flex gap-2 shrink-0">
          {syncing ? (
            <Button size="sm" variant="outline" onClick={handleStop}>
              Stop
            </Button>
          ) : (
            <>
              <Button size="sm" onClick={handleSync} disabled={syncing}>
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                Sync Now
              </Button>
              <Button size="sm" variant="outline" onClick={handleFullImport} disabled={syncing}>
                Full Import
              </Button>
              <Button size="sm" variant="destructive" onClick={handleRestart} disabled={syncing}>
                <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                Restart
              </Button>
            </>
          )}
          {syncing && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              Importing…
            </div>
          )}
        </div>
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
          {lastResult.hasMore && !syncing && (
            <Badge variant="secondary" className="text-xs gap-1">
              More pages — press Sync Now to continue
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
