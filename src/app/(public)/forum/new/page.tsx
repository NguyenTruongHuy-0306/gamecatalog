import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { NewThreadForm } from "@/components/forum/NewThreadForm";
import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "New Thread — Forum" };

interface PageProps {
  searchParams: Promise<Record<string, string>>;
}

export default async function NewThreadPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const sp = await searchParams;
  const defaultCategory = sp.category;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
      <div>
        <Link href="/forum" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3">
          <ChevronLeft className="h-4 w-4" /> Back to Forum
        </Link>
        <h1 className="text-2xl font-bold">New Thread</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Share your knowledge, question, or start a discussion with the community.
        </p>
      </div>
      <NewThreadForm defaultCategory={defaultCategory} />
    </div>
  );
}
