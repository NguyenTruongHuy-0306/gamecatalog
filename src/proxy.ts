import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

const AUTH_ONLY_ROUTES = ["/login", "/signup", "/forgot-password", "/reset-password", "/verify-email"];

export default auth((req) => {
  const { nextUrl, auth: session } = req;
  const { pathname } = nextUrl;

  // Logged-in Google users who haven't set a username/password yet must complete setup
  if (session?.user?.needsSetup && !pathname.startsWith("/complete-profile")) {
    return NextResponse.redirect(new URL("/complete-profile", nextUrl));
  }

  // Redirect authenticated users away from auth-only pages
  if (session?.user && AUTH_ONLY_ROUTES.some((r) => pathname.startsWith(r))) {
    return NextResponse.redirect(new URL("/", nextUrl));
  }

  // /complete-profile is only for logged-in users awaiting setup
  if (pathname.startsWith("/complete-profile")) {
    if (!session?.user) return NextResponse.redirect(new URL("/login", nextUrl));
    if (!session.user.needsSetup) return NextResponse.redirect(new URL("/", nextUrl));
    return NextResponse.next();
  }

  const isAdminRoute = pathname.startsWith("/admin");
  const isUserRoute =
    pathname.startsWith("/profile") || pathname.startsWith("/settings");

  if (isAdminRoute) {
    if (!session?.user) return NextResponse.redirect(new URL("/login", nextUrl));
    if (session.user.role !== "admin") return NextResponse.redirect(new URL("/", nextUrl));
  }

  if (isUserRoute && !session?.user) {
    return NextResponse.redirect(new URL("/login", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/complete-profile",
    "/admin/:path*",
    "/profile/:path*",
    "/settings/:path*",
    // Catch all pages (not static assets or API routes) so needsSetup redirect fires site-wide
    "/((?!api/|_next/|favicon\\.ico).*)",
  ],
};
