import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { PageTransition } from "@/components/shared/PageTransition";

export default async function UserLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main id="main-content" className="flex-1 mx-auto max-w-4xl px-4 py-8 w-full">
        <PageTransition>{children}</PageTransition>
      </main>
      <Footer />
    </div>
  );
}
