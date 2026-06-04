"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { StarDisplay } from "@/components/shared/StarDisplay";
import { StarRating } from "@/components/reviews/StarRating";
import { toast } from "sonner";
import { CheckCircle, Trash2, RefreshCw, Pencil, Check, X, Flag, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";

interface Review {
  id: string;
  rating: number;
  body?: string | null;
  isFlagged: boolean;
  flagReason?: string | null;
  createdAt: string;
  user: { id: string; username: string; email: string };
  game: { id: string; title: string; slug: string };
  flaggedBy?: { id: string; username: string } | null;
}

type FilterTab = "flagged" | "all";
type ReviewSortKey = "date" | "rating" | "user" | "game";

function SortBtn({ label, sortKey, current, dir, onSort }: { label: string; sortKey: ReviewSortKey; current: ReviewSortKey; dir: "asc" | "desc"; onSort: (k: ReviewSortKey) => void }) {
  const active = current === sortKey;
  return (
    <button type="button" onClick={() => onSort(sortKey)}
      className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded transition-colors ${active ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
      {label}
      {active ? (dir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />) : <ChevronsUpDown className="h-3 w-3 opacity-40" />}
    </button>
  );
}

export default function AdminReviewsPage() {
  const [tab, setTab] = useState<FilterTab>("flagged");
  const [q, setQ] = useState("");
  const [reviews, setReviews] = useState<Review[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<ReviewSortKey>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRating, setEditRating] = useState(0);
  const [editBody, setEditBody] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  // Bulk selection
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const toggleOne = (id: string) =>
    setSelected((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const handleBulkDelete = async () => {
    const ids = [...selected];
    if (!confirm(`Delete ${ids.length} review${ids.length > 1 ? "s" : ""}? This cannot be undone.`)) return;
    setBulkDeleting(true);
    const results = await Promise.allSettled(
      ids.map((id) => fetch(`/api/admin/reviews/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete" }),
      }))
    );
    setBulkDeleting(false);
    const failed = results.filter((r) => r.status === "rejected" || (r.status === "fulfilled" && !r.value.ok)).length;
    const succeeded = ids.length - failed;
    if (succeeded > 0) {
      toast.success(`${succeeded} review${succeeded > 1 ? "s" : ""} deleted.`);
      setReviews((prev) => prev.filter((r) => !ids.includes(r.id)));
      setTotal((t) => t - succeeded);
    }
    if (failed > 0) toast.error(`${failed} deletion${failed > 1 ? "s" : ""} failed.`);
    setSelected(new Set());
  };

  const fetchReviews = useCallback(async (filter: FilterTab, search: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ filter, q: search });
      const res = await fetch(`/api/admin/reviews?${params}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setReviews(data.reviews ?? []);
      setTotal(data.total ?? 0);
    } catch {
      // leave data in place on failure
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchReviews(tab, q); }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchReviews(tab, q);
  };

  const handleSort = (key: ReviewSortKey) => {
    if (sortKey === key) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  const sorted = useMemo(() => {
    return [...reviews].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "date") cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      else if (sortKey === "rating") cmp = a.rating - b.rating;
      else if (sortKey === "user") cmp = a.user.username.localeCompare(b.user.username);
      else if (sortKey === "game") cmp = a.game.title.localeCompare(b.game.title);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [reviews, sortKey, sortDir]);

  const handleAction = async (id: string, action: "unflag" | "delete") => {
    const res = await fetch(`/api/admin/reviews/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (!res.ok) { toast.error("Action failed"); return; }
    toast.success(action === "delete" ? "Review deleted" : "Review cleared");
    setReviews((prev) => prev.filter((r) => r.id !== id));
    setTotal((t) => t - 1);
  };

  const startEdit = (review: Review) => {
    setEditingId(review.id);
    setEditRating(review.rating);
    setEditBody(review.body ?? "");
  };

  const cancelEdit = () => { setEditingId(null); };

  const handleSaveEdit = async (id: string) => {
    setEditSaving(true);
    const res = await fetch(`/api/admin/reviews/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "edit", rating: editRating, body: editBody }),
    });
    setEditSaving(false);
    if (!res.ok) { toast.error("Failed to save"); return; }
    toast.success("Review updated");
    setReviews((prev) =>
      prev.map((r) => r.id === id ? { ...r, rating: editRating, body: editBody || null } : r)
    );
    setEditingId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reviews</h1>
          <p className="text-sm text-muted-foreground mt-1">{total} review{total !== 1 ? "s" : ""}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchReviews(tab, q)} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Tabs + search */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex border rounded-lg overflow-hidden">
          <button
            className={`px-4 py-1.5 text-sm font-medium transition-colors ${tab === "flagged" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
            onClick={() => setTab("flagged")}
          >
            <Flag className="h-3.5 w-3.5 inline mr-1.5" />
            Flagged
          </button>
          <button
            className={`px-4 py-1.5 text-sm font-medium transition-colors border-l ${tab === "all" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
            onClick={() => setTab("all")}
          >
            All Reviews
          </button>
        </div>
        <form onSubmit={handleSearch} className="flex gap-2">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search user, game, or content…"
            className="w-64"
          />
          <Button type="submit" variant="outline" size="sm">Search</Button>
        </form>
      </div>

      {/* Sort bar */}
      {reviews.length > 0 && (
        <div className="flex items-center gap-1 flex-wrap">
          <span className="text-xs text-muted-foreground mr-1">Sort:</span>
          <SortBtn label="Date" sortKey="date" current={sortKey} dir={sortDir} onSort={handleSort} />
          <SortBtn label="Rating" sortKey="rating" current={sortKey} dir={sortDir} onSort={handleSort} />
          <SortBtn label="User" sortKey="user" current={sortKey} dir={sortDir} onSort={handleSort} />
          <SortBtn label="Game" sortKey="game" current={sortKey} dir={sortDir} onSort={handleSort} />
        </div>
      )}

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-muted/60 border rounded-lg">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <div className="flex gap-2 ml-auto">
            <button
              className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
              onClick={handleBulkDelete} disabled={bulkDeleting}
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </button>
            <button
              className="inline-flex items-center rounded-md px-2 py-1.5 text-sm hover:bg-accent"
              onClick={() => setSelected(new Set())} disabled={bulkDeleting}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Review list */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading…</div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <CheckCircle className="h-10 w-10 mx-auto mb-3 text-green-500" />
          {tab === "flagged" ? "No flagged reviews. Moderation queue is clear." : "No reviews found."}
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((review) => (
            <div
              key={review.id}
              className={`border rounded-lg p-4 space-y-3 ${selected.has(review.id) ? "bg-muted/40" : ""}`}
            >
              {/* Header row */}
              <div className="flex items-start justify-between gap-4">
                {editingId !== review.id && (
                  <input
                    type="checkbox"
                    className="h-4 w-4 mt-0.5 shrink-0 rounded border border-input"
                    checked={selected.has(review.id)}
                    onChange={() => toggleOne(review.id)}
                    aria-label={`Select review by ${review.user.username}`}
                  />
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link href={`/admin/users/${review.user.id}`} className="font-medium text-sm hover:underline">
                      {review.user.username}
                    </Link>
                    <span className="text-xs text-muted-foreground">{review.user.email}</span>
                    {review.isFlagged && <Badge variant="destructive" className="text-xs">Flagged</Badge>}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <Link href={`/games/${review.game.slug}`} className="text-sm text-primary hover:underline">
                      {review.game.title}
                    </Link>
                    {editingId !== review.id && <StarDisplay rating={review.rating} size="sm" />}
                    <span className="text-xs text-muted-foreground">
                      {new Date(review.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0 flex-wrap">
                  {editingId === review.id ? (
                    <>
                      <Button variant="ghost" size="sm" className="gap-1 text-green-600 hover:text-green-700"
                        onClick={() => handleSaveEdit(review.id)} disabled={editSaving}>
                        <Check className="h-3.5 w-3.5" /> {editSaving ? "Saving…" : "Save"}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={cancelEdit} disabled={editSaving}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button variant="ghost" size="sm" className="gap-1" onClick={() => startEdit(review)}>
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </Button>
                      {review.isFlagged && (
                        <Button variant="outline" size="sm" className="gap-1"
                          onClick={() => handleAction(review.id, "unflag")}>
                          <CheckCircle className="h-3.5 w-3.5 text-green-500" /> Approve
                        </Button>
                      )}
                      <Button variant="destructive" size="sm" className="gap-1"
                        onClick={() => handleAction(review.id, "delete")}>
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Inline editor */}
              {editingId === review.id ? (
                <div className="space-y-3 pt-1">
                  <div>
                    <p className="text-xs font-medium mb-1.5">Rating</p>
                    <StarRating value={editRating} onChange={setEditRating} disabled={editSaving} />
                  </div>
                  <div>
                    <p className="text-xs font-medium mb-1.5">Review Text</p>
                    <Textarea value={editBody} onChange={(e) => setEditBody(e.target.value)}
                      maxLength={2000} rows={3} disabled={editSaving}
                      placeholder="(empty)" />
                    <p className="text-xs text-muted-foreground mt-0.5">{editBody.length}/2000</p>
                  </div>
                </div>
              ) : (
                review.body && (
                  <p className="text-sm text-muted-foreground border-l-2 pl-3">{review.body}</p>
                )
              )}

              {/* Flag info */}
              {review.isFlagged && review.flagReason && (
                <div className="flex items-center gap-2">
                  <Badge variant="destructive" className="text-xs">Flag reason:</Badge>
                  <span className="text-xs text-muted-foreground">{review.flagReason}</span>
                </div>
              )}
              {review.isFlagged && review.flaggedBy && (
                <p className="text-xs text-muted-foreground">Flagged by: {review.flaggedBy.username}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
