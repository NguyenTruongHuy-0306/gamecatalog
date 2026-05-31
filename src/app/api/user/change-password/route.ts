import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAuth, getClientIp } from "@/lib/api-helpers";
import { checkRateLimit } from "@/lib/rate-limit";
import { verifyCaptchaToken } from "@/lib/captcha";

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(100),
  captchaInput: z.string().min(1),
  captchaToken: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const ip = getClientIp(request);
  const rateLimit = await checkRateLimit(`ip:${ip}:${session!.user.id}`, "change-password", 5, 3600);
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Too many attempts. Please wait an hour." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  if (!verifyCaptchaToken(parsed.data.captchaInput, parsed.data.captchaToken)) {
    return NextResponse.json({ error: "Invalid security code. Please try again." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session!.user.id },
    select: { passwordHash: true },
  });

  if (!user?.passwordHash) {
    return NextResponse.json(
      { error: "This account uses Google sign-in and doesn't have a password." },
      { status: 400 }
    );
  }

  const valid = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });
  }

  const newHash = await bcrypt.hash(parsed.data.newPassword, 12);
  await prisma.user.update({
    where: { id: session!.user.id },
    data: { passwordHash: newHash },
  });

  return NextResponse.json({ message: "Password updated successfully" });
}
