import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashToken } from "@/lib/token";

const schema = z.object({
  token: z.string().min(1),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(100, "Password too long")
    .regex(/[@#$!%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, "Password must include at least one special character (@, #, $, etc.)"),
});

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const hashed = hashToken(parsed.data.token);

  const record = await prisma.verificationToken.findUnique({
    where: { token: hashed },
  });

  if (!record || record.type !== "password_reset") {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
  }

  if (record.expiresAt < new Date()) {
    await prisma.verificationToken.delete({ where: { id: record.id } });
    return NextResponse.json({ error: "Token has expired" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);

  await prisma.user.update({
    where: { id: record.userId },
    data: { passwordHash },
  });
  await prisma.verificationToken.delete({ where: { id: record.id } });

  return NextResponse.json({ message: "Password reset successfully. You can now log in." });
}
