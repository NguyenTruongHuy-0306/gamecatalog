import type { NextAuthConfig } from "next-auth";

// Lightweight auth config with no database imports — safe to use in Edge Runtime (proxy.ts).
// The full auth config (with Prisma) lives in src/auth.ts.
export const authConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login", error: "/login" },
  providers: [],
  callbacks: {
    jwt({ token }) {
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id as string;
      session.user.role = token.role as string;
      session.user.emailVerified = token.emailVerified as Date | null;
      session.user.isBanned = token.isBanned as boolean;
      session.user.username = token.username as string | null;
      session.user.needsSetup = (token.needsSetup as boolean) ?? false;
      return session;
    },
  },
} satisfies NextAuthConfig;
