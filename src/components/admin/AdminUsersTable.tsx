"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { SortableHead } from "@/components/admin/SortableHead";
import { Trash2, ShieldOff, X } from "lucide-react";

interface User {
  id: string;
  email: string;
  username: string;
  role: string;
  isBanned: boolean;
  emailVerified: Date | null;
  createdAt: Date;
  _count: { reviews: number };
}

interface Props {
  users: User[];
  currentUserId: string;
}

export function AdminUsersTable({ users, currentUserId }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  const currentSort = searchParams.get("sort") ?? "createdAt";
  const currentDir = (searchParams.get("dir") ?? "desc") as "asc" | "desc";

  const handleSort = (key: string) => {
    const newDir = currentSort === key && currentDir === "asc" ? "desc" : "asc";
    const params = new URLSearchParams(searchParams);
    params.set("sort", key);
    params.set("dir", newDir);
    params.set("page", "1");
    router.push(`${pathname}?${params}`);
  };

  const selectableIds = users
    .filter((u) => u.id !== currentUserId && u.role !== "admin")
    .map((u) => u.id);

  const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selected.has(id));
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(selectableIds));
  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const runBulk = (action: "ban" | "delete") => {
    const ids = [...selected];
    if (ids.length === 0) return;
    const label = action === "ban" ? "Ban" : "Delete";
    if (!confirm(`${label} ${ids.length} user${ids.length > 1 ? "s" : ""}? This cannot be undone.`)) return;

    startTransition(async () => {
      const results = await Promise.allSettled(
        ids.map((id) =>
          action === "delete"
            ? fetch(`/api/users/${id}`, { method: "DELETE" })
            : fetch(`/api/users/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isBanned: true }),
              })
        )
      );
      const failed = results.filter((r) => r.status === "rejected" || (r.status === "fulfilled" && !r.value.ok)).length;
      const succeeded = ids.length - failed;
      if (succeeded > 0) toast.success(`${succeeded} user${succeeded > 1 ? "s" : ""} ${action === "ban" ? "banned" : "deleted"}.`);
      if (failed > 0) toast.error(`${failed} action${failed > 1 ? "s" : ""} failed.`);
      setSelected(new Set());
      router.refresh();
    });
  };

  return (
    <div>
      {selected.size > 0 && (
        <div className="flex items-center gap-3 mb-4 px-4 py-2.5 bg-muted/60 border rounded-lg">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" size="sm" className="gap-1.5 text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
              onClick={() => runBulk("ban")} disabled={isPending}>
              <ShieldOff className="h-3.5 w-3.5" /> Ban
            </Button>
            <Button variant="destructive" size="sm" className="gap-1.5"
              onClick={() => runBulk("delete")} disabled={isPending}>
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())} disabled={isPending}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border border-input"
                  checked={allSelected}
                  onChange={toggleAll}
                  aria-label="Select all"
                  disabled={selectableIds.length === 0}
                />
              </TableHead>
              <TableHead>
                <SortableHead label="User" sortKey="username" currentSort={currentSort} currentDir={currentDir} onSort={handleSort} />
              </TableHead>
              <TableHead>
                <SortableHead label="Role" sortKey="role" currentSort={currentSort} currentDir={currentDir} onSort={handleSort} />
              </TableHead>
              <TableHead>Verified</TableHead>
              <TableHead>
                <SortableHead label="Reviews" sortKey="reviews" currentSort={currentSort} currentDir={currentDir} onSort={handleSort} />
              </TableHead>
              <TableHead>
                <SortableHead label="Status" sortKey="isBanned" currentSort={currentSort} currentDir={currentDir} onSort={handleSort} />
              </TableHead>
              <TableHead>
                <SortableHead label="Joined" sortKey="createdAt" currentSort={currentSort} currentDir={currentDir} onSort={handleSort} />
              </TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">No users found</TableCell>
              </TableRow>
            ) : (
              users.map((user) => {
                const isSelectable = user.id !== currentUserId && user.role !== "admin";
                const isChecked = selected.has(user.id);
                return (
                  <TableRow
                    key={user.id}
                    data-state={isChecked ? "selected" : undefined}
                    className={isChecked ? "bg-muted/40" : undefined}
                  >
                    <TableCell>
                      {isSelectable ? (
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border border-input"
                          checked={isChecked}
                          onChange={() => toggle(user.id)}
                          aria-label={`Select ${user.username}`}
                        />
                      ) : (
                        <span className="block h-4 w-4" aria-hidden="true" />
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{user.username}</div>
                      <div className="text-xs text-muted-foreground">{user.email}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.role === "admin" ? "default" : "secondary"}>{user.role}</Badge>
                    </TableCell>
                    <TableCell>
                      {user.emailVerified
                        ? <span className="text-green-600 text-xs font-medium">Yes</span>
                        : <span className="text-muted-foreground text-xs">No</span>}
                    </TableCell>
                    <TableCell className="text-sm">{user._count.reviews}</TableCell>
                    <TableCell>
                      {user.isBanned
                        ? <Badge variant="destructive">Banned</Badge>
                        : <Badge variant="outline" className="text-green-600 border-green-600">Active</Badge>}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button render={<Link href={`/admin/users/${user.id}`} />} variant="ghost" size="sm">
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
