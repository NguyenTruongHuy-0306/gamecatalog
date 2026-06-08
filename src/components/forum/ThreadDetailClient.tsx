"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

export function ThreadDetailClient({ threadId }: { threadId: string }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm("Delete this thread and all its replies?")) return;
    setDeleting(true);
    const res = await fetch(`/api/forum/threads/${threadId}`, { method: "DELETE" });
    setDeleting(false);
    if (res.ok) {
      toast.success("Thread deleted");
      router.push("/forum");
      router.refresh();
    } else {
      toast.error("Failed to delete thread");
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
      onClick={handleDelete}
      disabled={deleting}
    >
      <Trash2 className="h-3.5 w-3.5" />
    </Button>
  );
}
