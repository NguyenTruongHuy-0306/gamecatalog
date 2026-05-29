import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { generateRawToken, hashToken, getTokenExpiryDate } from "@/lib/token";
import { sendPasswordResetEmail } from "@/lib/email";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/api-helpers";

const schema = z.object({ email: z.string().email() });

const GENERIC_RESPONSE = {
  message: "If an account with that email exists, a reset link has been sent.",
};

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rateLimit = await checkRateLimit(`ip:${ip}`, "forgot_password", 5, 3600);
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(GENERIC_RESPONSE);
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email.toLowerCase() },
  });

  // Return the same message whether or not the user exists (prevent enumeration)
  if (!user || user.deletedAt || !user.passwordHash) {
    return NextResponse.json(GENERIC_RESPONSE);
  }

  // Invalidate any existing reset tokens
  await prisma.verificationToken.deleteMany({
    where: { userId: user.id, type: "password_reset" },
  });

  const rawToken = generateRawToken();
  const hashedToken = hashToken(rawToken);

  await prisma.verificationToken.create({
    data: {
      userId: user.id,
      token: hashedToken,
      type: "password_reset",
      expiresAt: getTokenExpiryDate(1),
    },
  });

  try {
    await sendPasswordResetEmail(user.email, rawToken);
  } catch (err) {
    console.error("Failed to send password reset email:", err);
  }

  return NextResponse.json(GENERIC_RESPONSE);
}
