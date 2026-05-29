import Link from "next/link";

interface GenreBadgeProps {
  name: string;
  slug: string;
  asLink?: boolean;
}

export function GenreBadge({ name, slug, asLink = true }: GenreBadgeProps) {
  const cls =
    "inline-flex items-center text-xs px-2.5 py-0.5 rounded-full font-medium bg-primary/10 text-primary border border-primary/15 transition-all duration-150";

  if (asLink) {
    return (
      <Link
        href={`/games?genre=${slug}`}
        className={`${cls} hover:bg-primary hover:text-primary-foreground hover:border-primary hover:scale-105`}
      >
        {name}
      </Link>
    );
  }
  return <span className={cls}>{name}</span>;
}
