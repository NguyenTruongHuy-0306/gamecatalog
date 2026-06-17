import Link from "next/link";
import { Gamepad2 } from "lucide-react";

const links = [
  { label: "Browse Games", href: "/games" },
  { label: "Search", href: "/search" },
  { label: "Sign Up", href: "/signup" },
  { label: "Sign In", href: "/login" },
];

export function Footer() {
  return (
    <footer className="relative overflow-hidden border-t bg-card">
      {/* Grid background */}
      <div className="absolute inset-0 bg-grid opacity-15" aria-hidden="true" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-card/80" aria-hidden="true" />

      {/* Top glow accent */}
      <div className="absolute top-0 left-0 right-0 glow-line" aria-hidden="true" />

      <div className="relative mx-auto max-w-7xl px-4 pt-16 pb-10">
        <div className="grid md:grid-cols-3 gap-12 mb-14">

          {/* Brand */}
          <div className="md:col-span-2 space-y-5">
            <Link href="/" className="flex items-center gap-3 group w-fit">
              <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-primary text-primary-foreground shadow-md group-hover:shadow-primary/50 group-hover:scale-105 transition-all duration-300">
                <Gamepad2 className="h-5 w-5" aria-hidden="true" />
              </div>
              <span className="font-black text-2xl gradient-text tracking-tight">GameCatalog</span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">
              Community-powered game discovery. Honest ratings from real players.
              No paywalls, no paid placements — ever.
            </p>
            <div className="flex items-center gap-3">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-mono text-xs text-muted-foreground/60 uppercase tracking-widest">
                Free forever · v2.0
              </span>
            </div>
          </div>

          {/* Links */}
          <div>
            <p className="font-mono text-xs font-semibold text-muted-foreground/60 uppercase tracking-widest mb-5">
              Explore
            </p>
            <ul className="space-y-2.5">
              {links.map(({ label, href }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-sm text-muted-foreground hover:text-foreground hover:translate-x-1 inline-flex items-center gap-2 transition-all duration-150 group"
                  >
                    <span className="h-px w-3 bg-primary/0 group-hover:bg-primary/60 group-hover:w-4 transition-all duration-200" />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-border/50 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground/60">
            © {new Date().getFullYear()} GameCatalog. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground/60 flex items-center gap-1.5">
            Built with <span className="text-red-500">♥</span> for gamers
          </p>
        </div>
      </div>
    </footer>
  );
}
