"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Gamepad2, Menu, X, User, Settings, LayoutDashboard, LogOut, Search } from "lucide-react";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function Navbar() {
  const { data: session } = useSession();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    setMobileOpen(false);
    router.push(`/search?q=${encodeURIComponent(q)}`);
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [mobileOpen]);

  const initials = (session?.user?.username ?? session?.user?.name ?? "?")
    .slice(0, 2)
    .toUpperCase();

  const { data: profile } = useSWR<{ avatarUrl: string | null }>(
    session?.user ? "/api/user/profile" : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "border-b border-border/60 bg-background/90 backdrop-blur-md shadow-md shadow-primary/5"
          : "bg-background/40 backdrop-blur-sm"
      }`}
    >
      <div className="mx-auto max-w-7xl px-4 flex h-16 items-center justify-between gap-4">

        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2.5 font-bold text-xl shrink-0 group"
          aria-label="GameCatalog home"
        >
          <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary text-primary-foreground shadow-sm group-hover:shadow-primary/40 group-hover:scale-105 transition-all duration-200">
            <Gamepad2 className="h-4.5 w-4.5" aria-hidden="true" />
          </div>
          <span className="gradient-text hidden sm:inline">GameCatalog</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-2 text-sm font-medium flex-1 justify-center">
          <Link
            href="/games"
            className="relative px-3 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-all duration-150 group shrink-0"
          >
            Browse
            <span className="absolute bottom-0.5 left-3 right-3 h-0.5 rounded-full bg-primary scale-x-0 group-hover:scale-x-100 transition-transform duration-200 origin-left" />
          </Link>

          <form onSubmit={handleSearch} className="relative flex items-center">
            <Search className="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" aria-hidden="true" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search games…"
              aria-label="Search games"
              className="pl-8 h-8 w-44 focus-visible:w-60 transition-[width] duration-200 text-sm"
            />
          </form>

          {session?.user.role === "admin" && (
            <Link
              href="/admin/dashboard"
              className="px-3 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-all duration-150 shrink-0"
            >
              Admin
            </Link>
          )}
        </nav>

        {/* Auth area */}
        <div className="hidden md:flex items-center gap-1 shrink-0">
          <ThemeToggle />
          {session?.user ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    className="relative h-9 w-9 rounded-full p-0 hover:ring-2 hover:ring-primary/40 transition-all"
                  >
                    <Avatar className="h-9 w-9 border-2 border-transparent hover:border-primary/30 transition-all">
                      {profile?.avatarUrl && (
                        <Image src={profile.avatarUrl} alt={initials} width={36} height={36} className="h-full w-full object-cover rounded-full" />
                      )}
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                }
              />
              <DropdownMenuContent align="end" className="w-52">
                <div className="px-3 py-2 border-b mb-1">
                  <p className="font-semibold text-sm">{session.user.username ?? session.user.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{session.user.email}</p>
                </div>
                <DropdownMenuItem render={<Link href="/profile" />} className="gap-2 cursor-pointer">
                  <User className="h-4 w-4" /> My Profile
                </DropdownMenuItem>
                <DropdownMenuItem render={<Link href="/settings" />} className="gap-2 cursor-pointer">
                  <Settings className="h-4 w-4" /> Settings
                </DropdownMenuItem>
                {session.user.role === "admin" && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem render={<Link href="/admin/dashboard" />} className="gap-2 cursor-pointer">
                      <LayoutDashboard className="h-4 w-4" /> Admin Panel
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="gap-2 text-destructive focus:text-destructive cursor-pointer"
                  onClick={() => signOut({ callbackUrl: "/" })}
                >
                  <LogOut className="h-4 w-4" /> Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" render={<Link href="/login" />} size="sm"
                className="text-muted-foreground hover:text-foreground">
                Sign In
              </Button>
              <Button render={<Link href="/signup" />} size="sm"
                className="shadow-sm hover:shadow-primary/30 hover:scale-[1.02] active:scale-[0.98]">
                Get Started
              </Button>
            </div>
          )}
        </div>

        {/* Mobile theme toggle */}
        <div className="md:hidden">
          <ThemeToggle />
        </div>

        {/* Mobile menu toggle */}
        <button
          className="md:hidden p-2 rounded-md hover:bg-accent transition-colors"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
          aria-expanded={mobileOpen}
          aria-controls="mobile-menu"
        >
          {mobileOpen
            ? <X className="h-5 w-5" aria-hidden="true" />
            : <Menu className="h-5 w-5" aria-hidden="true" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div
          id="mobile-menu"
          className="md:hidden border-t bg-background/95 backdrop-blur-md px-4 py-4 flex flex-col gap-1 animate-in slide-in-from-top-2 duration-200"
        >
          <form onSubmit={handleSearch} className="relative flex items-center mb-1">
            <Search className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" aria-hidden="true" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search games…"
              aria-label="Search games"
              className="pl-9 text-sm"
            />
          </form>

          <Link
            href="/games"
            className="px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-accent transition-colors"
            onClick={() => setMobileOpen(false)}
          >
            Browse Games
          </Link>
          {session?.user ? (
            <>
              <div className="my-1 border-t" />
              <Link href="/profile" className="px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-accent transition-colors flex items-center gap-2"
                onClick={() => setMobileOpen(false)}>
                <User className="h-4 w-4" /> Profile
              </Link>
              <Link href="/settings" className="px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-accent transition-colors flex items-center gap-2"
                onClick={() => setMobileOpen(false)}>
                <Settings className="h-4 w-4" /> Settings
              </Link>
              {session.user.role === "admin" && (
                <Link href="/admin/dashboard" className="px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-accent transition-colors flex items-center gap-2"
                  onClick={() => setMobileOpen(false)}>
                  <LayoutDashboard className="h-4 w-4" /> Admin Panel
                </Link>
              )}
              <div className="my-1 border-t" />
              <button
                className="px-3 py-2.5 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors text-left flex items-center gap-2"
                onClick={() => { setMobileOpen(false); signOut({ callbackUrl: "/" }); }}
              >
                <LogOut className="h-4 w-4" /> Sign Out
              </button>
            </>
          ) : (
            <>
              <div className="my-1 border-t" />
              <div className="flex gap-2 px-1">
                <Button variant="outline" render={<Link href="/login" onClick={() => setMobileOpen(false)} />}
                  size="sm" className="flex-1">Sign In</Button>
                <Button render={<Link href="/signup" onClick={() => setMobileOpen(false)} />}
                  size="sm" className="flex-1">Get Started</Button>
              </div>
            </>
          )}
        </div>
      )}
    </header>
  );
}
