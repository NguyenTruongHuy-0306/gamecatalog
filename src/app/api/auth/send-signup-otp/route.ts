import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { generateOtp, hashToken, getTokenExpiryDate } from "@/lib/token";
import { sendSignupOtpEmail } from "@/lib/email";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/api-helpers";
import { hasMxRecord } from "@/app/api/auth/check-email/route";

const schema = z.object({
  email: z.string().email("Invalid email address"),
});

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rateLimit = await checkRateLimit(`ip:${ip}`, "send-signup-otp", 5, 3600);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please wait before trying again." },
      { status: 429 }
    );
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

  const email = parsed.data.email.toLowerCase();

  const domainOk = await hasMxRecord(email.split("@")[1]);
  if (!domainOk) {
    return NextResponse.json(
      { error: "This email address doesn't appear to be reachable." },
      { status: 400 }
    );
  }

  // Reject already-registered emails
  const existing = await prisma.user.findFirst({
    where: { email, deletedAt: null, NOT: { emailVerified: null, passwordHash: null } },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json({ error: "Email is already registered." }, { status: 409 });
  }

  // Create (or reuse) a pending user row so the OTP token has a valid userId FK.
  // Pending users have no passwordHash and no emailVerified — they're completed in /api/auth/signup.
  let pendingUser = await prisma.user.findFirst({
    where: { email, emailVerified: null, passwordHash: null },
    select: { id: true },
  });

  if (!pendingUser) {
    const tempUsername = `pending_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    pendingUser = await prisma.user.create({
      data: { email, username: tempUsername, role: "user" },
      select: { id: true },
    });
  }

  // Replace any existing OTP for this pending user
  await prisma.verificationToken.deleteMany({
    where: { userId: pendingUser.id, type: "signup_otp" },
  });

  const otp = generateOtp();
  await prisma.verificationToken.create({
    data: {
      userId: pendingUser.id,
      token: hashToken(otp),
      type: "signup_otp",
      expiresAt: getTokenExpiryDate(0.25), // 15 minutes
    },
  });

  try {
    await sendSignupOtpEmail(email, otp);
  } catch (err) {
    console.error("Failed to send signup OTP:", err);
    return NextResponse.json(
      { error: "Failed to send verification email. Please try again." },
      { status: 500 }
    );
  }

  return NextResponse.json({ message: "Verification code sent." });
}
