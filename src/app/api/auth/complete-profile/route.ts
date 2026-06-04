import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/api-helpers";
import { verifyCaptchaToken } from "@/lib/captcha";

const schema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(20, "Username must be at most 20 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(100, "Password too long")
    .regex(/[@#$!%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, "Password must include at least one special character (@, #, $, etc.)"),
  captchaInput: z.string().min(1),
  captchaToken: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  // Only users with a pending needs_setup token may call this
  const setupToken = await prisma.verificationToken.findFirst({
    where: { userId: session!.user.id, type: "needs_setup" },
    select: { id: true },
  });
  if (!setupToken) {
    return NextResponse.json({ error: "Setup already complete." }, { status: 400 });
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

  const { username, password, captchaInput, captchaToken } = parsed.data;

  if (!verifyCaptchaToken(captchaInput, captchaToken)) {
    return NextResponse.json({ error: "Invalid security code. Please try again." }, { status: 400 });
  }

  const conflict = await prisma.user.findFirst({
    where: {
      username: { equals: username, mode: "insensitive" },
      NOT: { id: session!.user.id },
    },
  });
  if (conflict) {
    return NextResponse.json({ error: "Username already taken." }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.$transaction([
    prisma.verificationToken.delete({ where: { id: setupToken.id } }),
    prisma.user.update({
      where: { id: session!.user.id },
      data: { username, passwordHash },
    }),
  ]);

  return NextResponse.json({ message: "Profile complete." });
}
