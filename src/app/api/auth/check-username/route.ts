import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const rateLimit = await checkRateLimit(`ip:${ip}`, "check-username", 20, 300);
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const username = request.nextUrl.searchParams.get("username") ?? "";
  if (!username) {
    return NextResponse.json({ error: "Missing username" }, { status: 400 });
  }

  const user = await prisma.user.findFirst({
    where: { username: { equals: username, mode: "insensitive" } },
    select: { id: true },
  });

  return NextResponse.json({ exists: !!user });
}
