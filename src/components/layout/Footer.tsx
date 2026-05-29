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
    <footer className="mt-auto border-t bg-muted/20">
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="flex flex-col md:flex-row items-start justify-between gap-8">
          {/* Brand */}
          <div className="space-y-3">
            <Link href="/" className="flex items-center gap-2.5 group w-fit">
              <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary text-primary-foreground shadow-sm group-hover:shadow-primary/40 group-hover:scale-105 transition-all duration-200">
                <Gamepad2 className="h-4 w-4" aria-hidden="true" />
              </div>
              <span className="font-bold text-lg gradient-text">GameCatalog</span>
            </Link>
            <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
              Discover, rate, and review games. Community-driven ratings you can trust.
            </p>
          </div>

          {/* Nav links */}
          <nav aria-label="Footer navigation">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Explore
            </p>
            <ul className="space-y-2">
              {links.map(({ label, href }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors hover:translate-x-0.5 inline-block"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-8 pt-6 border-t flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} GameCatalog. All rights reserved.</p>
          <p className="flex items-center gap-1">
            Built with <span className="text-red-500">♥</span> for gamers
          </p>
        </div>
      </div>
    </footer>
  );
}
