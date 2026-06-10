import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashToken } from "@/lib/token";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/api-helpers";

const schema = z.object({ token: z.string().min(1) });

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rateLimit = await checkRateLimit(`ip:${ip}`, "verify_email", 10, 3600);
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }

  const hashed = hashToken(parsed.data.token);

  const record = await prisma.verificationToken.findUnique({
    where: { token: hashed },
    include: { user: true },
  });

  if (!record || record.type !== "email_verification") {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
  }

  if (record.expiresAt < new Date()) {
    await prisma.verificationToken.delete({ where: { id: record.id } });
    return NextResponse.json({ error: "Token has expired" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: record.userId },
    data: { emailVerified: new Date() },
  });
  await prisma.verificationToken.delete({ where: { id: record.id } });

  return NextResponse.json({ message: "Email verified successfully" });
}
