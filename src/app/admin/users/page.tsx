import Link from "next/link";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AdminUsersTable } from "@/components/admin/AdminUsersTable";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Users — Admin" };

interface PageProps {
  searchParams: Promise<Record<string, string>>;
}

export default async function AdminUsersPage({ searchParams }: PageProps) {
  const { q = "", page = "1", is_banned } = await searchParams;
  const pageNum = Math.max(1, parseInt(page, 10));
  const limit = 20;

  const session = await auth();
  const currentUserId = session?.user.id ?? "";

  const where = {
    deletedAt: null as null,
    ...(q
      ? {
          OR: [
            { email: { contains: q, mode: "insensitive" as const } },
            { username: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
    ...(is_banned !== undefined ? { isBanned: is_banned === "true" } : {}),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true, email: true, username: true, role: true,
        isBanned: true, emailVerified: true, createdAt: true,
        _count: { select: { reviews: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (pageNum - 1) * limit,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Users</h1>
        <span className="text-sm text-muted-foreground">{total} total</span>
      </div>

      {/* Filters */}
      <form method="get" className="flex gap-3 mb-6 flex-wrap items-end">
        <div className="flex flex-col gap-1">
          <label htmlFor="users-q" className="text-xs font-medium text-muted-foreground">Search</label>
          <Input id="users-q" name="q" defaultValue={q} placeholder="Search email or username…" className="max-w-xs" />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="users-status" className="text-xs font-medium text-muted-foreground">Status</label>
          <select id="users-status" name="is_banned" defaultValue={is_banned ?? ""} className="border rounded-md px-3 py-2 text-sm bg-background">
            <option value="">All Users</option>
            <option value="false">Active</option>
            <option value="true">Banned</option>
          </select>
        </div>
        <Button type="submit" variant="outline" size="sm">Filter</Button>
        <Button render={<Link href="/admin/users" />} variant="ghost" size="sm">Clear</Button>
      </form>

      <AdminUsersTable users={users} currentUserId={currentUserId} />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex gap-2 justify-center mt-6">
          {pageNum > 1 && (
            <Button render={<Link href={`/admin/users?q=${q}&page=${pageNum - 1}${is_banned !== undefined ? `&is_banned=${is_banned}` : ""}`} />} variant="outline" size="sm">
              Previous
            </Button>
          )}
          <span className="text-sm text-muted-foreground self-center">
            Page {pageNum} of {totalPages}
          </span>
          {pageNum < totalPages && (
            <Button render={<Link href={`/admin/users?q=${q}&page=${pageNum + 1}${is_banned !== undefined ? `&is_banned=${is_banned}` : ""}`} />} variant="outline" size="sm">
              Next
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
