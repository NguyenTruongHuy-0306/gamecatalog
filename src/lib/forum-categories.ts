export interface ForumCategory {
  slug: string;
  label: string;
  description: string;
  emoji: string;
}

export const FORUM_CATEGORIES: ForumCategory[] = [
  {
    slug: "general",
    label: "General Discussion",
    description: "Casual talk about games, the industry, and anything gaming-related.",
    emoji: "💬",
  },
  {
    slug: "tips",
    label: "Tips & Tricks",
    description: "Share strategies, builds, and pro-tips to help others level up.",
    emoji: "💡",
  },
  {
    slug: "help",
    label: "Help & Questions",
    description: "Stuck on a boss or puzzled by a mechanic? The community has your back.",
    emoji: "❓",
  },
  {
    slug: "guides",
    label: "Guides & Walkthroughs",
    description: "In-depth written guides, achievement hunts, and 100% walkthroughs.",
    emoji: "📖",
  },
  {
    slug: "news",
    label: "News & Updates",
    description: "Latest gaming news, patch notes, announcements, and release dates.",
    emoji: "📢",
  },
  {
    slug: "off-topic",
    label: "Off-Topic",
    description: "Everything else — hardware, movies, music, life.",
    emoji: "🎮",
  },
];

export function getCategoryBySlug(slug: string): ForumCategory | undefined {
  return FORUM_CATEGORIES.find((c) => c.slug === slug);
}

export const CATEGORY_SLUGS = FORUM_CATEGORIES.map((c) => c.slug);
