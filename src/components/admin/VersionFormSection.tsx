"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Pencil, Trash2, Check, X } from "lucide-react";
import { apiError } from "@/lib/client-error";

interface Version {
  id: string;
  versionLabel: string;
  releaseDate: Date | string;
  notes?: string | null;
}

interface VersionFormSectionProps {
  gameId: string;
  versions: Version[];
}

function toDateInput(d: Date | string) {
  return new Date(d).toISOString().slice(0, 10);
}

export function VersionFormSection({ gameId, versions: initialVersions }: VersionFormSectionProps) {
  const [versions, setVersions] = useState(initialVersions);

  // Add form
  const [label, setLabel] = useState("");
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");
  const [adding, setAdding] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // Delete state
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    const res = await fetch(`/api/games/${gameId}/versions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ versionLabel: label, releaseDate: date, notes: notes || undefined }),
    });
    const data = await res.json();
    setAdding(false);
    if (!res.ok) { toast.error(apiError(data, "Failed to add version")); return; }
    toast.success("Version added");
    setVersions((prev) => [data, ...prev]);
    setLabel(""); setDate(""); setNotes("");
  };

  const startEdit = (v: Version) => {
    setEditingId(v.id);
    setEditLabel(v.versionLabel);
    setEditDate(toDateInput(v.releaseDate));
    setEditNotes(v.notes ?? "");
  };

  const cancelEdit = () => { setEditingId(null); };

  const handleSave = async (id: string) => {
    setSaving(true);
    const res = await fetch(`/api/games/${gameId}/versions/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ versionLabel: editLabel, releaseDate: editDate, notes: editNotes || null }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { toast.error(apiError(data, "Failed to update")); return; }
    toast.success("Version updated");
    setVersions((prev) =>
      prev.map((v) =>
        v.id === id ? { ...v, versionLabel: editLabel, releaseDate: editDate, notes: editNotes || null } : v
      )
    );
    setEditingId(null);
  };

  const handleDelete = async (id: string, versionLabel: string) => {
    if (!confirm(`Delete version "${versionLabel}"?`)) return;
    setDeletingId(id);
    const res = await fetch(`/api/games/${gameId}/versions/${id}`, { method: "DELETE" });
    setDeletingId(null);
    if (!res.ok) { toast.error("Failed to delete version"); return; }
    toast.success("Version deleted");
    setVersions((prev) => prev.filter((v) => v.id !== id));
  };

  return (
    <div className="space-y-6">
      {/* Add form */}
      <form onSubmit={handleAdd} className="border rounded-lg p-4 space-y-4 max-w-lg">
        <h3 className="font-medium">Add Version</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="vlabel">Version Label *</Label>
            <Input id="vlabel" value={label} onChange={(e) => setLabel(e.target.value)}
              placeholder="v2.1.0" required disabled={adding} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="vdate">Release Date *</Label>
            <Input id="vdate" type="date" value={date} onChange={(e) => setDate(e.target.value)}
              required disabled={adding} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="vnotes">Patch Notes</Label>
          <Textarea id="vnotes" value={notes} onChange={(e) => setNotes(e.target.value)}
            rows={3} disabled={adding} />
        </div>
        <Button type="submit" size="sm" disabled={adding}>
          {adding ? "Adding…" : "Add Version"}
        </Button>
      </form>

      {/* Version list */}
      {versions.length > 0 && (
        <div className="space-y-2">
          {versions.map((v, i) => (
            <div key={v.id} className="border rounded-lg p-3">
              {editingId === v.id ? (
                /* Inline edit form */
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Version Label</Label>
                      <Input value={editLabel} onChange={(e) => setEditLabel(e.target.value)}
                        className="h-8" disabled={saving} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Release Date</Label>
                      <Input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)}
                        className="h-8" disabled={saving} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Patch Notes</Label>
                    <Textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)}
                      rows={2} disabled={saving} />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" className="gap-1 text-green-600 hover:text-green-700"
                      onClick={() => handleSave(v.id)} disabled={saving}>
                      <Check className="h-3.5 w-3.5" /> {saving ? "Saving…" : "Save"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={cancelEdit} disabled={saving}>
                      <X className="h-3.5 w-3.5" /> Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                /* Read view */
                <div className="flex items-start gap-3">
                  <Badge variant={i === 0 ? "default" : "secondary"} className="shrink-0 mt-0.5">
                    {v.versionLabel}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-muted-foreground">
                      {new Date(v.releaseDate).toLocaleDateString()}
                    </div>
                    {v.notes && <p className="text-sm text-muted-foreground mt-0.5">{v.notes}</p>}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="sm" className="h-7 px-2 gap-1" onClick={() => startEdit(v)}>
                      <Pencil className="h-3 w-3" /> Edit
                    </Button>
                    <Button variant="ghost" size="sm"
                      className="h-7 px-2 gap-1 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(v.id, v.versionLabel)}
                      disabled={deletingId === v.id}>
                      <Trash2 className="h-3 w-3" /> Delete
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
