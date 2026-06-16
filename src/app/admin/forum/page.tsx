"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { RefreshCw, Trash2, Pin, Lock, X, ChevronUp, ChevronDown, ChevronsUpDown, ExternalLink, MessageSquare } from "lucide-react";
import { FORUM_CATEGORIES } from "@/lib/forum-categories";

interface Thread {
  id: string;
  title: string;
  category: string;
  isPinned: boolean;
  isLocked: boolean;
  lastPostAt: string;
  createdAt: string;
  author: { id: string; username: string };
  game: { id: string; title: string; slug: string } | null;
  _count: { posts: number };
}

type FilterTab = "all" | "pinned" | "locked";
type SortKey = "date" | "title" | "replies" | "category";

function SortBtn({ label, sortKey, current, dir, onSort }: { label: string; sortKey: SortKey; current: SortKey; dir: "asc" | "desc"; onSort: (k: SortKey) => void }) {
  const active = current === sortKey;
  return (
    <button type="button" onClick={() => onSort(sortKey)}
      className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded transition-colors ${active ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
      {label}
      {active ? (dir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />) : <ChevronsUpDown className="h-3 w-3 opacity-40" />}
    </button>
  );
}

export default function AdminForumPage() {
  const [tab, setTab] = useState<FilterTab>("all");
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [threads, setThreads] = useState<Thread[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const toggleOne = (id: string) =>
    setSelected((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const toggleAll = () =>
    setSelected((prev) => prev.size === threads.length ? new Set() : new Set(threads.map((t) => t.id)));

  const fetchThreads = useCallback(async (filter: FilterTab, search: string, cat: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ filter, q: search, category: cat });
      const res = await fetch(`/api/admin/forum/threads?${params}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setThreads(data.threads ?? []);
      setTotal(data.total ?? 0);
    } catch {
      toast.error("Failed to load threads");
    } finally {
      setLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
  useEffect(() => { fetchThreads(tab, q, category); }, [tab, category]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchThreads(tab, q, category);
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  const sorted = [...threads].sort((a, b) => {
    let cmp = 0;
    if (sortKey === "date") cmp = new Date(a.lastPostAt).getTime() - new Date(b.lastPostAt).getTime();
    else if (sortKey === "title") cmp = a.title.localeCompare(b.title);
    else if (sortKey === "replies") cmp = a._count.posts - b._count.posts;
    else if (sortKey === "category") cmp = a.category.localeCompare(b.category);
    return sortDir === "asc" ? cmp : -cmp;
  });

  const patchThread = async (id: string, action: "pin" | "unpin" | "lock" | "unlock" | "delete") => {
    const res = await fetch(`/api/admin/forum/threads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (!res.ok) { toast.error("Action failed"); return false; }
    return true;
  };

  const handleAction = async (id: string, action: "pin" | "unpin" | "lock" | "unlock" | "delete") => {
    if (action === "delete" && !confirm("Delete this thread and all its posts? This cannot be undone.")) return;
    const ok = await patchThread(id, action);
    if (!ok) return;
    if (action === "delete") {
      setThreads((prev) => prev.filter((t) => t.id !== id));
      setTotal((n) => n - 1);
      toast.success("Thread deleted");
    } else {
      setThreads((prev) => prev.map((t) => {
        if (t.id !== id) return t;
        if (action === "pin") return { ...t, isPinned: true };
        if (action === "unpin") return { ...t, isPinned: false };
        if (action === "lock") return { ...t, isLocked: true };
        if (action === "unlock") return { ...t, isLocked: false };
        return t;
      }));
      toast.success(action.charAt(0).toUpperCase() + action.slice(1) + "ned");
    }
  };

  const handleBulkDelete = async () => {
    const ids = [...selected];
    if (!confirm(`Delete ${ids.length} thread${ids.length > 1 ? "s" : ""}? This cannot be undone.`)) return;
    setBulkDeleting(true);
    const results = await Promise.allSettled(ids.map((id) => patchThread(id, "delete")));
    setBulkDeleting(false);
    const failed = results.filter((r) => r.status === "rejected" || (r.status === "fulfilled" && !r.value)).length;
    const succeeded = ids.length - failed;
    if (succeeded > 0) {
      setThreads((prev) => prev.filter((t) => !ids.includes(t.id)));
      setTotal((n) => n - succeeded);
      toast.success(`${succeeded} thread${succeeded > 1 ? "s" : ""} deleted`);
    }
    if (failed > 0) toast.error(`${failed} deletion${failed > 1 ? "s" : ""} failed`);
    setSelected(new Set());
  };

  const categoryLabel = (slug: string) =>
    FORUM_CATEGORIES.find((c) => c.slug === slug)?.label ?? slug;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Forum</h1>
          <p className="text-sm text-muted-foreground mt-1">{total} thread{total !== 1 ? "s" : ""}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchThreads(tab, q, category)} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Tabs + search */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex border rounded-lg overflow-hidden">
          {(["all", "pinned", "locked"] as FilterTab[]).map((f, i) => (
            <button key={f}
              className={`px-4 py-1.5 text-sm font-medium capitalize transition-colors ${i > 0 ? "border-l" : ""} ${tab === f ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
              onClick={() => setTab(f)}>
              {f === "all" ? "All Threads" : f === "pinned" ? "📌 Pinned" : "🔒 Locked"}
            </button>
          ))}
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="text-sm border rounded-md px-3 py-1.5 bg-background"
        >
          <option value="">All Categories</option>
          {FORUM_CATEGORIES.map((c) => (
            <option key={c.slug} value={c.slug}>{c.label}</option>
          ))}
        </select>
        <form onSubmit={handleSearch} className="flex gap-2">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search title, author, game…"
            className="w-64"
          />
          <Button type="submit" variant="outline" size="sm">Search</Button>
        </form>
      </div>

      {/* Sort bar */}
      {threads.length > 0 && (
        <div className="flex items-center gap-1 flex-wrap">
          <span className="text-xs text-muted-foreground mr-1">Sort:</span>
          <SortBtn label="Last Post" sortKey="date" current={sortKey} dir={sortDir} onSort={handleSort} />
          <SortBtn label="Title" sortKey="title" current={sortKey} dir={sortDir} onSort={handleSort} />
          <SortBtn label="Replies" sortKey="replies" current={sortKey} dir={sortDir} onSort={handleSort} />
          <SortBtn label="Category" sortKey="category" current={sortKey} dir={sortDir} onSort={handleSort} />
        </div>
      )}

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-muted/60 border rounded-lg">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <div className="flex gap-2 ml-auto">
            <button
              className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
              onClick={handleBulkDelete} disabled={bulkDeleting}>
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </button>
            <button
              className="inline-flex items-center rounded-md px-2 py-1.5 text-sm hover:bg-accent"
              onClick={() => setSelected(new Set())} disabled={bulkDeleting}>
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Thread list */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading…</div>
      ) : threads.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-30" />
          No threads found.
        </div>
      ) : (
        <div className="space-y-2">
          {/* Select all */}
          <div className="flex items-center gap-2 px-1 pb-1 border-b">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border border-input"
              checked={selected.size === threads.length && threads.length > 0}
              onChange={toggleAll}
              aria-label="Select all"
            />
            <span className="text-xs text-muted-foreground">Select all</span>
          </div>

          {sorted.map((thread) => (
            <div key={thread.id}
              className={`border rounded-lg p-4 space-y-2 ${selected.has(thread.id) ? "bg-muted/40" : ""}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  <input
                    type="checkbox"
                    className="h-4 w-4 mt-0.5 shrink-0 rounded border border-input"
                    checked={selected.has(thread.id)}
                    onChange={() => toggleOne(thread.id)}
                    aria-label={`Select ${thread.title}`}
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link href={`/admin/forum/${thread.id}`} className="font-medium text-sm hover:underline truncate">
                        {thread.title}
                      </Link>
                      {thread.isPinned && <Badge variant="secondary" className="text-xs gap-1"><Pin className="h-3 w-3" />Pinned</Badge>}
                      {thread.isLocked && <Badge variant="outline" className="text-xs gap-1"><Lock className="h-3 w-3" />Locked</Badge>}
                    </div>
                    <div className="flex items-center gap-3 mt-1 flex-wrap text-xs text-muted-foreground">
                      <span>
                        <Link href={`/admin/users/${thread.author.id}`} className="hover:underline font-medium text-foreground/70">
                          {thread.author.username}
                        </Link>
                      </span>
                      <Badge variant="outline" className="text-xs font-normal">{categoryLabel(thread.category)}</Badge>
                      {thread.game && (
                        <Link href={`/games/${thread.game.slug}`} className="hover:underline text-primary/70">
                          {thread.game.title}
                        </Link>
                      )}
                      <span className="flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" /> {thread._count.posts} {thread._count.posts === 1 ? "reply" : "replies"}
                      </span>
                      <span>{new Date(thread.lastPostAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0 flex-wrap">
                  <Link href={`/games/${thread.game?.slug ?? ""}/forum/${thread.id}`} target="_blank">
                    <Button variant="ghost" size="sm" className="gap-1 px-2" title="View thread">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                  <Button variant="ghost" size="sm" className="gap-1 px-2"
                    title={thread.isPinned ? "Unpin" : "Pin"}
                    onClick={() => handleAction(thread.id, thread.isPinned ? "unpin" : "pin")}>
                    <Pin className={`h-3.5 w-3.5 ${thread.isPinned ? "text-primary" : ""}`} />
                  </Button>
                  <Button variant="ghost" size="sm" className="gap-1 px-2"
                    title={thread.isLocked ? "Unlock" : "Lock"}
                    onClick={() => handleAction(thread.id, thread.isLocked ? "unlock" : "lock")}>
                    <Lock className={`h-3.5 w-3.5 ${thread.isLocked ? "text-amber-500" : ""}`} />
                  </Button>
                  <Button variant="destructive" size="sm" className="gap-1 px-2"
                    onClick={() => handleAction(thread.id, "delete")}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
