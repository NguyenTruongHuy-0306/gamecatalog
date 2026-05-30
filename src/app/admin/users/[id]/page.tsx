"use client";

import { useEffect, useState } from "react";
import { apiError } from "@/lib/client-error";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { StarDisplay } from "@/components/shared/StarDisplay";
import { AvatarUpload } from "@/components/shared/AvatarUpload";
import { toast } from "sonner";
import { ArrowLeft, Pencil, Check, X, Trash2, ShieldCheck } from "lucide-react";

interface UserDetail {
  id: string;
  email: string;
  username: string;
  bio?: string | null;
  avatarUrl?: string | null;
  role: string;
  isBanned: boolean;
  banReason?: string | null;
  bannedAt?: string | null;
  emailVerified?: string | null;
  createdAt: string;
  googleId?: string | null;
  _count: { reviews: number };
  reviews: Array<{
    id: string;
    rating: number;
    body?: string | null;
    createdAt: string;
    game: { id: string; title: string; slug: string };
  }>;
}

export default function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // Profile edit state
  const [editing, setEditing] = useState(false);
  const [editUsername, setEditUsername] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editVerified, setEditVerified] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState("");

  // Ban/role state
  const [banReason, setBanReason] = useState("");
  const [acting, setActing] = useState(false);

  useEffect(() => {
    fetch(`/api/users/${id}`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data: UserDetail) => {
        setUser(data);
        setEditUsername(data.username);
        setEditEmail(data.email);
        setEditBio(data.bio ?? "");
        setEditVerified(!!data.emailVerified);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  const cancelEdit = () => {
    if (!user) return;
    setEditUsername(user.username);
    setEditEmail(user.email);
    setEditBio(user.bio ?? "");
    setEditVerified(!!user.emailVerified);
    setEditError("");
    setEditing(false);
  };

  const handleSaveProfile = async () => {
    setEditError("");
    setSaving(true);
    const res = await fetch(`/api/users/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: editUsername, email: editEmail, bio: editBio || undefined, emailVerified: editVerified }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setEditError(apiError(data, "Failed to save")); return; }
    toast.success("Profile updated");
    setUser((prev) => prev ? { ...prev, ...data } : prev);
    setEditing(false);
  };

  const handleBan = async (isBanned: boolean) => {
    setActing(true);
    const res = await fetch(`/api/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isBanned, banReason: isBanned ? banReason : undefined }),
    });
    const data = await res.json();
    setActing(false);
    if (!res.ok) { toast.error(apiError(data, "Failed")); return; }
    toast.success(isBanned ? "User banned" : "User unbanned");
    setUser((prev) => prev ? { ...prev, isBanned: data.isBanned, banReason: data.banReason } : prev);
    setBanReason("");
  };

  const handleRoleChange = async (role: "user" | "admin") => {
    if (!confirm(`Are you sure you want to ${role === "admin" ? "promote to admin" : "demote to user"}?`)) return;
    setActing(true);
    const res = await fetch(`/api/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    const data = await res.json();
    setActing(false);
    if (!res.ok) { toast.error(apiError(data, "Failed")); return; }
    toast.success(role === "admin" ? "Promoted to admin" : "Demoted to user");
    setUser((prev) => prev ? { ...prev, role: data.role } : prev);
  };

  const handleDelete = async () => {
    if (!confirm("Permanently delete this user account? This cannot be undone.")) return;
    setActing(true);
    const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
    setActing(false);
    if (!res.ok) { const d = await res.json(); toast.error(d.error ?? "Failed"); return; }
    toast.success("User deleted");
    router.push("/admin/users");
  };

  if (loading) return <div className="py-12 text-center text-muted-foreground">Loading…</div>;
  if (!user) return <div className="py-12 text-center text-muted-foreground">User not found</div>;

  const initials = user.username.slice(0, 2).toUpperCase();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button render={<Link href="/admin/users" />} variant="ghost" size="sm">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        {/* Mini avatar in header */}
        <div className="h-10 w-10 rounded-full overflow-hidden ring-2 ring-primary/20 shrink-0">
          {user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.avatarUrl} alt={initials} className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-primary/60 to-primary flex items-center justify-center text-primary-foreground text-xs font-bold">
              {initials}
            </div>
          )}
        </div>
        <h1 className="text-3xl font-bold">{user.username}</h1>
        <Badge variant={user.role === "admin" ? "default" : "secondary"}>{user.role}</Badge>
        {user.isBanned && <Badge variant="destructive">Banned</Badge>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile card */}
        <div className="border rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Profile Information</h2>
            {!editing ? (
              <Button variant="ghost" size="sm" className="gap-1" onClick={() => { setEditError(""); setEditing(true); }}>
                <Pencil className="h-3.5 w-3.5" /> Edit
              </Button>
            ) : (
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" className="gap-1 text-green-600 hover:text-green-700"
                  onClick={handleSaveProfile} disabled={saving}>
                  <Check className="h-3.5 w-3.5" /> {saving ? "Saving…" : "Save"}
                </Button>
                <Button variant="ghost" size="sm" onClick={cancelEdit} disabled={saving}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>

          {/* Avatar section — always visible */}
          <div className="pb-4 border-b flex justify-center">
            <AvatarUpload
              currentUrl={user.avatarUrl ?? null}
              initials={initials}
              onSave={(url) => setUser((prev) => prev ? { ...prev, avatarUrl: url } : prev)}
              uploadUrl={`/api/admin/users/${id}/avatar`}
              deleteUrl={`/api/admin/users/${id}/avatar`}
            />
          </div>

          {/* Editable fields / read-only view */}
          {editing ? (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-username">Username</Label>
                <Input id="edit-username" value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  minLength={3} maxLength={20} disabled={saving} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-email">Email</Label>
                <Input id="edit-email" type="email" value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)} disabled={saving} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-bio">Bio</Label>
                <Textarea id="edit-bio" value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  maxLength={300} rows={2} disabled={saving} placeholder="No bio" />
              </div>
              <div className="flex items-center gap-2">
                <input id="edit-verified" type="checkbox" checked={editVerified}
                  onChange={(e) => setEditVerified(e.target.checked)}
                  className="h-4 w-4 rounded border border-input" disabled={saving} />
                <Label htmlFor="edit-verified">Email verified</Label>
              </div>
              {editError && (
                <Alert variant="destructive">
                  <AlertDescription>{editError}</AlertDescription>
                </Alert>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {[
                { label: "Username", value: user.username },
                { label: "Email", value: user.email },
                { label: "Bio", value: user.bio ?? "—" },
                { label: "Verified", value: user.emailVerified ? "Yes" : "No" },
                { label: "Google Account", value: user.googleId ? "Linked" : "No" },
                { label: "Joined", value: new Date(user.createdAt).toLocaleDateString() },
                { label: "Reviews", value: String(user._count.reviews) },
                ...(user.isBanned ? [
                  { label: "Ban Reason", value: user.banReason ?? "—" },
                  { label: "Banned At", value: user.bannedAt ? new Date(user.bannedAt).toLocaleDateString() : "—" },
                ] : []),
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-medium">{value}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Moderation card */}
        <div className="border rounded-lg p-4 space-y-4">
          <h2 className="font-semibold">Moderation</h2>

          {/* Role */}
          <div className="space-y-2">
            <p className="text-sm font-medium flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-primary" /> Role
            </p>
            <div className="flex gap-2 flex-wrap">
              <Button variant={user.role === "admin" ? "default" : "outline"} size="sm"
                onClick={() => handleRoleChange("admin")}
                disabled={acting || user.role === "admin"}>
                Promote to Admin
              </Button>
              <Button variant={user.role === "user" ? "secondary" : "outline"} size="sm"
                onClick={() => handleRoleChange("user")}
                disabled={acting || user.role === "user"}>
                Demote to User
              </Button>
            </div>
          </div>

          {/* Ban — non-admins only */}
          {user.role !== "admin" && (
            <div className="space-y-3 pt-2 border-t">
              <p className="text-sm font-medium">Ban Status</p>
              {user.isBanned ? (
                <>
                  <Alert>
                    <AlertDescription>Banned: {user.banReason ?? "No reason given"}</AlertDescription>
                  </Alert>
                  <Button variant="outline" className="w-full" onClick={() => handleBan(false)} disabled={acting}>
                    Unban User
                  </Button>
                </>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="ban-reason">Ban Reason (optional)</Label>
                    <Input id="ban-reason" value={banReason}
                      onChange={(e) => setBanReason(e.target.value)}
                      placeholder="Spam, abuse, etc." disabled={acting} />
                  </div>
                  <Button variant="destructive" className="w-full"
                    onClick={() => handleBan(true)} disabled={acting}>
                    {acting ? "Saving…" : "Ban User"}
                  </Button>
                </>
              )}
            </div>
          )}

          {/* Delete */}
          <div className="pt-2 border-t">
            <p className="text-sm font-medium mb-2">Danger Zone</p>
            <Button variant="outline" size="sm"
              className="gap-1 text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
              onClick={handleDelete} disabled={acting}>
              <Trash2 className="h-3.5 w-3.5" /> Delete Account
            </Button>
            <p className="text-xs text-muted-foreground mt-1">Permanently deletes the account and all associated data from the database. Cannot be undone.</p>
          </div>
        </div>
      </div>

      {/* Reviews */}
      {user.reviews.length > 0 && (
        <div>
          <h2 className="font-semibold mb-3">Recent Reviews</h2>
          <div className="space-y-3">
            {user.reviews.map((review) => (
              <div key={review.id} className="border rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <Link href={`/games/${review.game.slug}`} className="font-medium text-sm hover:underline">
                    {review.game.title}
                  </Link>
                  <StarDisplay rating={review.rating} size="sm" showValue />
                </div>
                {review.body && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{review.body}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
