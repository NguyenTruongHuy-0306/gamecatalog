import { redirect } from "next/navigation";
import { auth } from "@/auth";
import Link from "next/link";
import { Users, Gamepad2, Flag, LayoutDashboard, ChevronLeft, Tag, MessageSquare } from "lucide-react";
import { PageTransition } from "@/components/shared/PageTransition";

const navItems = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/games", label: "Games", icon: Gamepad2 },
  { href: "/admin/genres", label: "Genres", icon: Tag },
  { href: "/admin/reviews", label: "Review Queue", icon: Flag },
  { href: "/admin/forum", label: "Forum", icon: MessageSquare },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") redirect("/");

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 border-r bg-muted/30 flex flex-col shrink-0">
        <div className="p-4 border-b">
          <Link href="/" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="h-3.5 w-3.5" />
            Back to site
          </Link>
          <h2 className="font-bold text-lg mt-2">Admin</h2>
        </div>
        <nav aria-label="Admin navigation" className="flex-1 p-2 space-y-1">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t text-xs text-muted-foreground">
          Logged in as <strong>{session.user.username ?? session.user.name}</strong>
        </div>
      </aside>
      <main id="main-content" className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <PageTransition>{children}</PageTransition>
        </div>
      </main>
    </div>
  );
}
