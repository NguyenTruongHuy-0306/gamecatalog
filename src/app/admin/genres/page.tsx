"use client";

import { useEffect, useState, useMemo } from "react";
import { apiError } from "@/lib/client-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Check, X, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";

const BulkBar = ({
  count, onDelete, onClear, disabled,
}: { count: number; onDelete: () => void; onClear: () => void; disabled: boolean }) => (
  <div className="flex items-center gap-3 mb-4 px-4 py-2.5 bg-muted/60 border rounded-lg">
    <span className="text-sm font-medium">{count} selected</span>
    <div className="flex gap-2 ml-auto">
      <button
        className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
        onClick={onDelete} disabled={disabled}
      >
        <Trash2 className="h-3.5 w-3.5" /> Delete
      </button>
      <button
        className="inline-flex items-center rounded-md px-2 py-1.5 text-sm hover:bg-accent disabled:opacity-50"
        onClick={onClear} disabled={disabled}
        aria-label="Clear selection"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  </div>
);

interface Genre {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
}

type GenreSortKey = "name" | "slug";

function slugify(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export default function AdminGenresPage() {
  const [genres, setGenres] = useState<Genre[]>([]);
  const [sortKey, setSortKey] = useState<GenreSortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [loading, setLoading] = useState(true);

  // Create form state
  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [saving, setSaving] = useState(false);

  // Delete state
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Bulk selection
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const sorted = useMemo(() => {
    return [...genres].sort((a, b) => {
      const cmp = a[sortKey].localeCompare(b[sortKey]);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [genres, sortKey, sortDir]);

  const handleGenreSort = (key: GenreSortKey) => {
    if (sortKey === key) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const selectableIds = sorted.filter((g) => g.id !== editingId).map((g) => g.id);
  const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selected.has(id));
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(selectableIds));

  const toggleOne = (id: string) =>
    setSelected((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  useEffect(() => {
    fetch("/api/genres")
      .then((r) => r.json())
      .then((data) => { setGenres(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");
    setCreating(true);

    const res = await fetch("/api/genres", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName, slug: newSlug }),
    });
    const data = await res.json();
    setCreating(false);

    if (!res.ok) {
      setCreateError(apiError(data, "Failed to create genre"));
      return;
    }

    toast.success(`Genre "${newName}" created`);
    setGenres((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    setNewName("");
    setNewSlug("");
  };

  const startEdit = (g: Genre) => {
    setEditingId(g.id);
    setEditName(g.name);
    setEditSlug(g.slug);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditSlug("");
  };

  const handleSave = async (id: string) => {
    setSaving(true);
    const res = await fetch(`/api/genres/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName, slug: editSlug }),
    });
    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      toast.error(apiError(data, "Failed to update genre"));
      return;
    }

    toast.success("Genre updated");
    setGenres((prev) =>
      prev.map((g) => (g.id === id ? { ...g, name: editName, slug: editSlug } : g))
        .sort((a, b) => a.name.localeCompare(b.name))
    );
    cancelEdit();
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete genre "${name}"? Games with this genre will lose the tag.`)) return;
    setDeletingId(id);
    const res = await fetch(`/api/genres/${id}`, { method: "DELETE" });
    setDeletingId(null);

    if (!res.ok) {
      const data = await res.json();
      toast.error(apiError(data, "Failed to delete genre"));
      return;
    }

    toast.success(`Genre "${name}" deleted`);
    setGenres((prev) => prev.filter((g) => g.id !== id));
    setSelected((prev) => { const n = new Set(prev); n.delete(id); return n; });
  };

  const handleBulkDelete = async () => {
    const ids = [...selected];
    if (!confirm(`Delete ${ids.length} genre${ids.length > 1 ? "s" : ""}? Games will lose these tags.`)) return;
    setBulkDeleting(true);
    const results = await Promise.allSettled(ids.map((id) => fetch(`/api/genres/${id}`, { method: "DELETE" })));
    setBulkDeleting(false);
    const failed = results.filter((r) => r.status === "rejected" || (r.status === "fulfilled" && !r.value.ok)).length;
    const succeeded = ids.length - failed;
    if (succeeded > 0) {
      toast.success(`${succeeded} genre${succeeded > 1 ? "s" : ""} deleted.`);
      setGenres((prev) => prev.filter((g) => !ids.includes(g.id)));
    }
    if (failed > 0) toast.error(`${failed} deletion${failed > 1 ? "s" : ""} failed.`);
    setSelected(new Set());
  };

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Genres</h1>

      {/* Create new genre */}
      <div className="border rounded-lg p-5">
        <h2 className="font-semibold mb-4">Add New Genre</h2>
        <form onSubmit={handleCreate} className="flex flex-wrap gap-3 items-end">
          <div className="space-y-1">
            <label className="text-sm font-medium">Name</label>
            <Input
              value={newName}
              onChange={(e) => {
                setNewName(e.target.value);
                setNewSlug(slugify(e.target.value));
              }}
              placeholder="e.g. Action"
              className="w-48"
              required
              disabled={creating}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Slug</label>
            <Input
              value={newSlug}
              onChange={(e) => setNewSlug(e.target.value)}
              placeholder="e.g. action"
              pattern="[a-z0-9-]+"
              className="w-48"
              required
              disabled={creating}
            />
          </div>
          <Button type="submit" disabled={creating} className="gap-1">
            <Plus className="h-4 w-4" />
            {creating ? "Creating…" : "Create Genre"}
          </Button>
        </form>
        {createError && (
          <Alert variant="destructive" className="mt-3">
            <AlertDescription>{createError}</AlertDescription>
          </Alert>
        )}
      </div>

      {/* Genres table */}
      {selected.size > 0 && (
        <BulkBar count={selected.size} onDelete={handleBulkDelete} onClear={() => setSelected(new Set())} disabled={bulkDeleting} />
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
                <button type="button" onClick={() => handleGenreSort("name")}
                  className={`inline-flex items-center gap-1 text-xs font-medium transition-colors hover:text-foreground ${sortKey === "name" ? "text-foreground" : "text-muted-foreground"}`}>
                  Name
                  {sortKey === "name" ? (sortDir === "asc" ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />) : <ChevronsUpDown className="h-3.5 w-3.5 opacity-40" />}
                </button>
              </TableHead>
              <TableHead>
                <button type="button" onClick={() => handleGenreSort("slug")}
                  className={`inline-flex items-center gap-1 text-xs font-medium transition-colors hover:text-foreground ${sortKey === "slug" ? "text-foreground" : "text-muted-foreground"}`}>
                  Slug
                  {sortKey === "slug" ? (sortDir === "asc" ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />) : <ChevronsUpDown className="h-3.5 w-3.5 opacity-40" />}
                </button>
              </TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">Loading…</TableCell>
              </TableRow>
            ) : genres.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">No genres yet</TableCell>
              </TableRow>
            ) : sorted.map((genre) => (
              <TableRow
                key={genre.id}
                data-state={selected.has(genre.id) ? "selected" : undefined}
                className={selected.has(genre.id) ? "bg-muted/40" : undefined}
              >
                <TableCell>
                  {editingId === genre.id ? (
                    <span className="block h-4 w-4" aria-hidden="true" />
                  ) : (
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border border-input"
                      checked={selected.has(genre.id)}
                      onChange={() => toggleOne(genre.id)}
                      aria-label={`Select ${genre.name}`}
                    />
                  )}
                </TableCell>
                <TableCell>
                  {editingId === genre.id ? (
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="h-8 w-40"
                      disabled={saving}
                    />
                  ) : (
                    <span className="font-medium">{genre.name}</span>
                  )}
                </TableCell>
                <TableCell>
                  {editingId === genre.id ? (
                    <Input
                      value={editSlug}
                      onChange={(e) => setEditSlug(e.target.value)}
                      pattern="[a-z0-9-]+"
                      className="h-8 w-40"
                      disabled={saving}
                    />
                  ) : (
                    <Badge variant="outline" className="font-mono text-xs">{genre.slug}</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1 justify-end">
                    {editingId === genre.id ? (
                      <>
                        <Button
                          variant="ghost" size="sm"
                          className="gap-1 text-green-600 hover:text-green-700"
                          onClick={() => handleSave(genre.id)}
                          disabled={saving}
                        >
                          <Check className="h-3.5 w-3.5" />
                          Save
                        </Button>
                        <Button variant="ghost" size="sm" onClick={cancelEdit} disabled={saving}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button variant="ghost" size="sm" className="gap-1" onClick={() => startEdit(genre)}>
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </Button>
                        <Button
                          variant="ghost" size="sm"
                          className="gap-1 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(genre.id, genre.name)}
                          disabled={deletingId === genre.id}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground">
        Deleting a genre removes it from all games that use it.
      </p>
    </div>
  );
}
