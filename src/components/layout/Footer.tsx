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
    <footer className="mt-auto border-t bg-muted/10 bg-grid relative overflow-hidden">
      {/* Fade overlay over grid */}
      <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-background/20 pointer-events-none" aria-hidden="true" />

      <div className="relative mx-auto max-w-7xl px-4 py-12">
        <div className="flex flex-col md:flex-row items-start justify-between gap-10">

          {/* Brand + tagline */}
          <div className="space-y-4 max-w-xs">
            <Link href="/" className="flex items-center gap-2.5 group w-fit">
              <div className="flex items-center justify-center h-9 w-9 rounded-xl bg-primary text-primary-foreground shadow-sm group-hover:shadow-primary/40 group-hover:scale-105 transition-all duration-200">
                <Gamepad2 className="h-4.5 w-4.5" aria-hidden="true" />
              </div>
              <span className="font-black text-xl gradient-text tracking-tight">GameCatalog</span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Community-powered game discovery. Honest ratings from real players.
            </p>
            <p className="font-mono text-xs text-muted-foreground/50 uppercase tracking-widest">
              v2.0 — Free forever
            </p>
          </div>

          {/* Nav */}
          <nav aria-label="Footer navigation">
            <p className="font-mono text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">
              Explore
            </p>
            <ul className="grid grid-cols-2 gap-x-8 gap-y-2">
              {links.map(({ label, href }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-sm text-muted-foreground hover:text-foreground hover:translate-x-0.5 inline-flex items-center transition-all duration-150"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 pt-6 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} GameCatalog. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            Built with <span className="text-red-500">♥</span> for gamers
          </p>
        </div>
      </div>
    </footer>
  );
}
