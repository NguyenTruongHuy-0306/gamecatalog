import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashToken } from "@/lib/token";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/api-helpers";
import { verifyRecaptcha } from "@/lib/recaptcha";

const signupSchema = z.object({
  email: z.string().email("Invalid email address"),
  otp: z.string().length(6, "Verification code must be 6 digits").regex(/^\d{6}$/, "Verification code must be 6 digits"),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(20, "Username must be at most 20 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(100, "Password too long"),
  recaptchaToken: z.string().min(1, "Bot verification token missing"),
});

const MIN_RESPONSE_MS = 400;

export async function POST(request: NextRequest) {
  const start = Date.now();
  const ip = getClientIp(request);
  const rateLimit = await checkRateLimit(`ip:${ip}`, "signup", 10, 3600);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many signup attempts. Please try again later." },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { email, otp, username, password, recaptchaToken } = parsed.data;

  const recaptchaOk = await verifyRecaptcha(recaptchaToken);
  if (!recaptchaOk) {
    return NextResponse.json(
      { error: "Bot verification failed. Please try again." },
      { status: 400 }
    );
  }

  const normalizedEmail = email.toLowerCase();

  // Find the pending user created during OTP send
  const pendingUser = await prisma.user.findFirst({
    where: { email: normalizedEmail, emailVerified: null, passwordHash: null },
    select: { id: true },
  });
  if (!pendingUser) {
    return NextResponse.json(
      { error: "No verification code found for this email. Please request a new one." },
      { status: 400 }
    );
  }

  // Verify OTP
  const tokenRow = await prisma.verificationToken.findFirst({
    where: {
      userId: pendingUser.id,
      type: "signup_otp",
      token: hashToken(otp),
      expiresAt: { gt: new Date() },
    },
  });
  if (!tokenRow) {
    const elapsed = Date.now() - start;
    if (elapsed < MIN_RESPONSE_MS) await new Promise((r) => setTimeout(r, MIN_RESPONSE_MS - elapsed));
    return NextResponse.json(
      { error: "Invalid or expired verification code." },
      { status: 400 }
    );
  }

  // Check username isn't taken by a real account
  const usernameTaken = await prisma.user.findFirst({
    where: {
      username: { equals: username, mode: "insensitive" },
      NOT: { id: pendingUser.id },
      deletedAt: null,
    },
    select: { id: true },
  });
  if (usernameTaken) {
    return NextResponse.json({ error: "Username already taken." }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  // Complete the pending user: set real username, password, and mark email verified
  await prisma.$transaction([
    prisma.verificationToken.delete({ where: { id: tokenRow.id } }),
    prisma.user.update({
      where: { id: pendingUser.id },
      data: { username, passwordHash, emailVerified: new Date() },
    }),
  ]);

  return NextResponse.json(
    { message: "Account created successfully." },
    { status: 201 }
  );
}
