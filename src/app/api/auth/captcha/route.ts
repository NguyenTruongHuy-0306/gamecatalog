import { NextResponse } from "next/server";
import { generateCaptcha } from "@/lib/captcha";

export async function GET() {
  const { code, token } = generateCaptcha();
  return NextResponse.json({ code, token });
}
