import { NextResponse } from "next/server";
import { auth } from "@/auth";

export function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function requireAuth() {
  const session = await auth();
  if (!session?.user) return { session: null, error: jsonError("Unauthorized", 401) };
  if (session.user.isBanned) return { session: null, error: jsonError("Account is banned", 403) };
  return { session, error: null };
}

export async function requireAdmin() {
  const session = await auth();
  if (!session?.user) return { session: null, error: jsonError("Unauthorized", 401) };
  if (session.user.isBanned) return { session: null, error: jsonError("Account is banned", 403) };
  if (session.user.role !== "admin") return { session: null, error: jsonError("Forbidden", 403) };
  return { session, error: null };
}

export async function requireVerifiedAuth() {
  const { session, error } = await requireAuth();
  if (error) return { session: null, error };
  if (!session!.user.emailVerified)
    return { session: null, error: jsonError("Email not verified", 403) };
  return { session, error: null };
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0].trim() ?? "unknown";
}
