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

const MIN_RESPONSE_MS = 400;

export async function POST(request: NextRequest) {
  const start = Date.now();

  const ip = getClientIp(request);
  const rateLimit = await checkRateLimit(`ip:${ip}`, "forgot_password", 5, 3600);
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    // fall through — schema parse will fail and we return generic response
    body = null;
  }

  const parsed = schema.safeParse(body);

  const reply = async () => {
    const elapsed = Date.now() - start;
    if (elapsed < MIN_RESPONSE_MS) {
      await new Promise((r) => setTimeout(r, MIN_RESPONSE_MS - elapsed));
    }
    return NextResponse.json(GENERIC_RESPONSE);
  };

  if (!parsed.success) return reply();

  try {
    const user = await prisma.user.findUnique({
      where: { email: parsed.data.email.toLowerCase() },
    });

    // Return the same message whether or not the user exists (prevent enumeration)
    if (!user || user.deletedAt || !user.passwordHash) return reply();

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
  } catch (err) {
    console.error("[forgot-password] Unhandled error:", err);
    return reply();
  }

  return reply();
}
