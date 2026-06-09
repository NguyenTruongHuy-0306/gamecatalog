import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IgdbSyncPanel } from "@/components/admin/IgdbSyncPanel";
import { Users, Gamepad2, Star, Flag } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin Dashboard" };

async function getStats() {
  const [totalUsers, totalGames, totalReviews, flaggedReviews] = await Promise.all([
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.game.count({ where: { isPublished: true } }),
    prisma.review.count({ where: { deletedAt: null } }),
    prisma.review.count({ where: { isFlagged: true, deletedAt: null } }),
  ]);
  return { totalUsers, totalGames, totalReviews, flaggedReviews };
}

async function getIgdbStatus() {
  const [state, pending] = await Promise.all([
    prisma.igdbSyncState.findUnique({ where: { id: 1 } }),
    prisma.game.count({ where: { igdbId: { not: null }, isPublished: false } }),
  ]);
  return { lastSyncedAt: state?.lastSyncedAt ?? 0, pending };
}

export default async function AdminDashboardPage() {
  const [stats, igdb] = await Promise.all([getStats(), getIgdbStatus()]);

  const cards = [
    { title: "Total Users",     value: stats.totalUsers,    icon: Users,    color: "text-blue-500"   },
    { title: "Published Games", value: stats.totalGames,    icon: Gamepad2, color: "text-green-500"  },
    { title: "Total Reviews",   value: stats.totalReviews,  icon: Star,     color: "text-yellow-500" },
    { title: "Flagged Reviews", value: stats.flaggedReviews, icon: Flag,    color: "text-red-500"    },
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(({ title, value, icon: Icon, color }) => (
          <Card key={title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
              <Icon className={`h-5 w-5 ${color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{value.toLocaleString()}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="max-w-sm">
        <IgdbSyncPanel lastSyncedAt={igdb.lastSyncedAt} pending={igdb.pending} />
      </div>
    </div>
  );
}
