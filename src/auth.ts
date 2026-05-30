import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { verifyRecaptcha } from "@/lib/recaptcha";
import { generateRawToken } from "@/lib/token";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  recaptchaToken: z.string().optional(),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        recaptchaToken: { label: "reCAPTCHA", type: "text" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) {
          console.error("[authorize] schema invalid", parsed.error.issues);
          return null;
        }

        if (parsed.data.recaptchaToken) {
          const recaptchaOk = await verifyRecaptcha(parsed.data.recaptchaToken);
          if (!recaptchaOk) {
            console.error("[authorize] recaptcha failed for", parsed.data.email);
            return null;
          }
        }

        const email = parsed.data.email.toLowerCase();
        const user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
          console.error("[authorize] user not found:", email);
          return null;
        }
        if (!user.passwordHash) {
          console.error("[authorize] no password hash (google-only account?):", email);
          return null;
        }
        if (user.isBanned) {
          console.error("[authorize] account banned:", email);
          return null;
        }
        if (user.deletedAt) {
          console.error("[authorize] account deleted:", email);
          return null;
        }

        const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!valid) {
          console.error("[authorize] wrong password for:", email);
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.username,
          role: user.role,
          emailVerified: user.emailVerified,
          isBanned: user.isBanned,
          username: user.username,
        };
      },
    }),
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [Google({
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        })]
      : []),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        try {
          const existing = await prisma.user.findFirst({
            where: {
              OR: [
                { email: user.email! },
                { googleId: account.providerAccountId },
              ],
            },
          });

          if (existing) {
            if (existing.isBanned || existing.deletedAt) return false;
            if (!existing.googleId) {
              await prisma.user.update({
                where: { id: existing.id },
                data: { googleId: account.providerAccountId },
              });
            }
            // Existing user — no setup token created; needsSetup stays false
          } else {
            // Brand-new Google user — create account + setup token in one transaction
            const base = (user.email ?? "user")
              .split("@")[0]
              .replace(/[^a-zA-Z0-9_]/g, "")
              .slice(0, 18) || "user";
            let suffix = 0;
            let created = false;
            while (!created) {
              const username = suffix === 0 ? base : `${base}${suffix}`;
              try {
                const newUser = await prisma.user.create({
                  data: {
                    email: user.email!,
                    username,
                    emailVerified: new Date(),
                    googleId: account.providerAccountId,
                    role: "user",
                  },
                });
                // Mark this account as needing setup (choose username + password)
                await prisma.verificationToken.create({
                  data: {
                    userId: newUser.id,
                    token: generateRawToken(),
                    type: "needs_setup",
                    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
                  },
                });
                created = true;
              } catch (createErr: unknown) {
                const isUniqueViolation =
                  typeof createErr === "object" &&
                  createErr !== null &&
                  "code" in createErr &&
                  (createErr as { code: string }).code === "P2002";
                if (!isUniqueViolation) throw createErr;
                suffix++;
              }
            }
          }
        } catch {
          return false;
        }
      }
      return true;
    },

    async jwt({ token, user, account }) {
      if (user && account) {
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email! },
          select: {
            id: true,
            role: true,
            emailVerified: true,
            isBanned: true,
            username: true,
            verificationTokens: {
              where: { type: "needs_setup" },
              select: { id: true },
              take: 1,
            },
          },
        });
        if (dbUser) {
          token.id = dbUser.id;
          token.role = dbUser.role;
          token.emailVerified = dbUser.emailVerified;
          token.isBanned = dbUser.isBanned;
          token.username = dbUser.username;
          token.needsSetup = dbUser.verificationTokens.length > 0;
        }
      } else if (token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id },
          select: {
            isBanned: true,
            role: true,
            emailVerified: true,
            deletedAt: true,
            verificationTokens: {
              where: { type: "needs_setup" },
              select: { id: true },
              take: 1,
            },
          },
        });
        if (!dbUser || dbUser.deletedAt) return null as never;
        token.isBanned = dbUser.isBanned;
        token.role = dbUser.role;
        token.emailVerified = dbUser.emailVerified;
        token.needsSetup = dbUser.verificationTokens.length > 0;
      }
      return token;
    },

    async session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      session.user.emailVerified = token.emailVerified;
      session.user.isBanned = token.isBanned;
      session.user.username = token.username;
      session.user.needsSetup = token.needsSetup;
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
});
