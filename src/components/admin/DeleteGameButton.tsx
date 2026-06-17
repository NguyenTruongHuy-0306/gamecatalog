"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DeleteGameButton({ gameId, gameTitle }: { gameId: string; gameTitle: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmed, setConfirmed] = useState(false);

  const handleDelete = () => {
    if (!confirmed) {
      setConfirmed(true);
      return;
    }
    startTransition(async () => {
      const res = await fetch(`/api/games/${gameId}`, { method: "DELETE" });
      if (res.ok) {
        toast.success(`"${gameTitle}" has been deleted.`);
        router.push("/admin/games");
      } else {
        toast.error("Failed to delete game.");
        setConfirmed(false);
      }
    });
  };

  return (
    <div className="border border-destructive/30 rounded-lg p-6 space-y-4">
      <div>
        <h3 className="font-semibold text-destructive">Danger Zone</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Permanently delete this game along with all its reviews, versions, and favorites. This
          cannot be undone.
        </p>
      </div>
      <Button
        variant="destructive"
        onClick={handleDelete}
        disabled={isPending}
        className="gap-2"
      >
        <Trash2 className="h-4 w-4" />
        {confirmed ? (isPending ? "Deleting…" : "Click again to confirm") : "Delete Game"}
      </Button>
      {confirmed && !isPending && (
        <p className="text-xs text-destructive">
          Click the button again to permanently delete &ldquo;{gameTitle}&rdquo;.
        </p>
      )}
    </div>
  );
}
