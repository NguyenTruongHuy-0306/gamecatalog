import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function GameNotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4 text-center">
      <span className="text-6xl">🎮</span>
      <h1 className="text-3xl font-bold">Game Not Found</h1>
      <p className="text-muted-foreground max-w-sm">
        This game doesn&apos;t exist or may have been removed from the catalog.
      </p>
      <Button render={<Link href="/games" />}>Browse All Games</Button>
    </div>
  );
}
