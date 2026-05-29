import Link from "next/link";
import { Gamepad2 } from "lucide-react";
import { RecaptchaProvider } from "@/components/auth/RecaptchaProvider";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <RecaptchaProvider>
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 hero-gradient relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute top-0 left-1/3 w-96 h-96 rounded-full bg-primary/5 blur-3xl pointer-events-none" aria-hidden="true" />
      <div className="absolute bottom-0 right-1/4 w-64 h-64 rounded-full bg-primary/8 blur-3xl pointer-events-none" aria-hidden="true" />

      <Link
        href="/"
        className="flex items-center gap-2.5 font-bold text-xl mb-8 group relative"
        aria-label="Back to GameCatalog"
      >
        <div className="flex items-center justify-center h-9 w-9 rounded-xl bg-primary text-primary-foreground shadow-md group-hover:shadow-primary/40 group-hover:scale-105 transition-all duration-200">
          <Gamepad2 className="h-5 w-5" aria-hidden="true" />
        </div>
        <span className="gradient-text">GameCatalog</span>
      </Link>

      <main
        id="main-content"
        className="w-full max-w-sm bg-background/80 backdrop-blur-sm rounded-2xl border shadow-xl shadow-primary/5 p-7 relative"
      >
        {children}
      </main>
    </div>
    </RecaptchaProvider>
  );
}
