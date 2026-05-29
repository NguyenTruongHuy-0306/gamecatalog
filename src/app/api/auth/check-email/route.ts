import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/api-helpers";

const emailSchema = z.string().email();

export async function hasMxRecord(domain: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(
      `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=MX`,
      { signal: controller.signal }
    );
    clearTimeout(id);
    if (!res.ok) return false;
    const data = await res.json() as { Status: number; Answer?: unknown[] };
    // Status 0 = NOERROR; Answer present with entries = domain has MX records
    return data.Status === 0 && Array.isArray(data.Answer) && data.Answer.length > 0;
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const rateLimit = await checkRateLimit(`ip:${ip}`, "check-email", 30, 60);
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const email = request.nextUrl.searchParams.get("email") ?? "";
  const parsed = emailSchema.safeParse(email);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  const domain = parsed.data.toLowerCase().split("@")[1];
  const valid = await hasMxRecord(domain);
  return NextResponse.json({ valid });
}
