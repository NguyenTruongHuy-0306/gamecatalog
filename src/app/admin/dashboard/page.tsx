import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Gamepad2, Star, Flag } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin Dashboard" };

async function getStats() {
  const [totalUsers, totalGames, totalReviews, flaggedReviews] =
    await Promise.all([
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.game.count({ where: { isPublished: true } }),
      prisma.review.count({ where: { deletedAt: null } }),
      prisma.review.count({ where: { isFlagged: true, deletedAt: null } }),
    ]);
  return { totalUsers, totalGames, totalReviews, flaggedReviews };
}

export default async function AdminDashboardPage() {
  const stats = await getStats();

  const cards = [
    { title: "Total Users", value: stats.totalUsers, icon: Users, color: "text-blue-500" },
    { title: "Published Games", value: stats.totalGames, icon: Gamepad2, color: "text-green-500" },
    { title: "Total Reviews", value: stats.totalReviews, icon: Star, color: "text-yellow-500" },
    { title: "Flagged Reviews", value: stats.flaggedReviews, icon: Flag, color: "text-red-500" },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>
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
    </div>
  );
}
