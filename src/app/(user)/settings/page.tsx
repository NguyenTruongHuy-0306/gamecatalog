"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Eye, EyeOff, User, Lock, Mail, AtSign, FileText, CheckCircle2 } from "lucide-react";
import { AvatarUpload } from "@/components/shared/AvatarUpload";

function EyeButton({ show, onToggle }: { show: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle} tabIndex={-1}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
      aria-label={show ? "Hide password" : "Show password"}>
      {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
    </button>
  );
}

export default function SettingsPage() {
  const { data: session, update: updateSession } = useSession();

  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    fetch("/api/user/profile").then((r) => r.json()).then((data) => {
      setUsername(data.username ?? "");
      setBio(data.bio ?? "");
      setAvatarUrl(data.avatarUrl ?? null);
    }).catch(() => {});
  }, []);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError("");
    setProfileLoading(true);
    const res = await fetch("/api/user/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, bio: bio || undefined }),
    });
    const data = await res.json();
    setProfileLoading(false);
    if (!res.ok) { setProfileError(data.error ?? "Failed to update profile."); return; }
    toast.success("Profile updated successfully");
    await updateSession({ username: data.username });
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    if (newPassword !== confirm) { setPasswordError("Passwords do not match."); return; }
    if (newPassword.length < 8) { setPasswordError("New password must be at least 8 characters."); return; }
    setPasswordLoading(true);
    const res = await fetch("/api/user/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await res.json();
    setPasswordLoading(false);
    if (!res.ok) { setPasswordError(data.error ?? "Failed to change password."); return; }
    toast.success("Password updated successfully");
    setCurrentPassword(""); setNewPassword(""); setConfirm("");
  };

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your account preferences.</p>
      </div>

      {/* Profile card */}
      <div className="rounded-2xl border bg-card overflow-hidden">
        {/* Card header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b bg-muted/30">
          <div className="flex items-center justify-center h-9 w-9 rounded-xl bg-primary/10">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold">Profile Information</h2>
            <p className="text-xs text-muted-foreground">Visible to other users</p>
          </div>
        </div>

        <div className="p-6">
          {/* Avatar */}
          <div className="mb-6 pb-6 border-b flex justify-center">
            <AvatarUpload
              currentUrl={avatarUrl}
              initials={(session?.user?.username ?? session?.user?.name ?? "?").slice(0, 2).toUpperCase()}
              onSave={(url) => setAvatarUrl(url)}
            />
          </div>

          <form onSubmit={handleProfileSave} className="space-y-5">
            {/* Email (read-only) */}
            <div className="space-y-1.5">
              <Label htmlFor="email-display" className="flex items-center gap-1.5 text-sm">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" /> Email
              </Label>
              <Input id="email-display" type="email" value={session?.user?.email ?? ""}
                disabled className="bg-muted/50 text-muted-foreground" />
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-green-500" /> Email cannot be changed here.
              </p>
            </div>

            {/* Username */}
            <div className="space-y-1.5">
              <Label htmlFor="username" className="flex items-center gap-1.5 text-sm">
                <AtSign className="h-3.5 w-3.5 text-muted-foreground" /> Username
              </Label>
              <Input id="username" value={username}
                onChange={(e) => setUsername(e.target.value)}
                minLength={3} maxLength={20} pattern="[a-zA-Z0-9_]+"
                required disabled={profileLoading}
                className="focus-visible:ring-primary/50" />
              <p className="text-xs text-muted-foreground">3–20 characters, letters, numbers and underscores.</p>
            </div>

            {/* Bio */}
            <div className="space-y-1.5">
              <Label htmlFor="bio" className="flex items-center gap-1.5 text-sm">
                <FileText className="h-3.5 w-3.5 text-muted-foreground" /> Bio
              </Label>
              <Textarea id="bio" value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={300} rows={3}
                placeholder="Tell others a little about yourself…"
                disabled={profileLoading}
                className="resize-none focus-visible:ring-primary/50" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Optional — shown on your profile</span>
                <span className={bio.length > 270 ? "text-orange-500" : ""}>{bio.length}/300</span>
              </div>
            </div>

            {profileError && (
              <Alert variant="destructive" className="py-2">
                <AlertDescription>{profileError}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" disabled={profileLoading}
              className="gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all">
              {profileLoading ? "Saving…" : "Save Profile"}
            </Button>
          </form>
        </div>
      </div>

      {/* Password card */}
      <div className="rounded-2xl border bg-card overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b bg-muted/30">
          <div className="flex items-center justify-center h-9 w-9 rounded-xl bg-primary/10">
            <Lock className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold">Change Password</h2>
            <p className="text-xs text-muted-foreground">For accounts with email/password sign-in</p>
          </div>
        </div>

        <div className="p-6">
          <form onSubmit={handlePasswordChange} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="current">Current Password</Label>
              <div className="relative">
                <Input id="current" type={showCurrent ? "text" : "password"}
                  value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)}
                  required disabled={passwordLoading} className="pr-10" />
                <EyeButton show={showCurrent} onToggle={() => setShowCurrent((v) => !v)} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="new">New Password</Label>
              <div className="relative">
                <Input id="new" type={showNew ? "text" : "password"}
                  value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                  minLength={8} required disabled={passwordLoading} className="pr-10" />
                <EyeButton show={showNew} onToggle={() => setShowNew((v) => !v)} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmPwd">Confirm New Password</Label>
              <div className="relative">
                <Input id="confirmPwd" type={showConfirm ? "text" : "password"}
                  value={confirm} onChange={(e) => setConfirm(e.target.value)}
                  required disabled={passwordLoading} className="pr-10" />
                <EyeButton show={showConfirm} onToggle={() => setShowConfirm((v) => !v)} />
              </div>
            </div>

            {/* Password strength hint */}
            {newPassword.length > 0 && (
              <div className="flex gap-1">
                {[1,2,3,4].map((level) => (
                  <div key={level} className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                    newPassword.length >= level * 3
                      ? level <= 2 ? "bg-orange-400" : level === 3 ? "bg-yellow-400" : "bg-green-500"
                      : "bg-muted"
                  }`} />
                ))}
              </div>
            )}

            {passwordError && (
              <Alert variant="destructive" className="py-2">
                <AlertDescription>{passwordError}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" disabled={passwordLoading}
              className="gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all">
              {passwordLoading ? "Updating…" : "Update Password"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
