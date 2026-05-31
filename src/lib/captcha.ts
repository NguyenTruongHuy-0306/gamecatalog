import { createHmac, timingSafeEqual } from "crypto";

const EXPIRY_MS = 10 * 60 * 1000;
// No 0/O or 1/I/l to avoid visual confusion
const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function secret() {
  return process.env.NEXTAUTH_SECRET ?? "dev-captcha-secret";
}

function sign(code: string, expires: number): string {
  return createHmac("sha256", secret())
    .update(`${code.toUpperCase()}|${expires}`)
    .digest("hex");
}

export function generateCaptcha(): { code: string; token: string } {
  const code = Array.from(
    { length: 5 },
    () => CHARS[Math.floor(Math.random() * CHARS.length)]
  ).join("");
  const expires = Date.now() + EXPIRY_MS;
  return { code, token: `${expires}.${sign(code, expires)}` };
}

export function verifyCaptchaToken(input: string, token: string): boolean {
  try {
    const dot = token.indexOf(".");
    if (dot === -1) return false;
    const expires = parseInt(token.slice(0, dot), 10);
    if (isNaN(expires) || Date.now() > expires) return false;
    const received = Buffer.from(token.slice(dot + 1), "hex");
    const expected = Buffer.from(sign(input, expires), "hex");
    if (received.length !== expected.length) return false;
    return timingSafeEqual(received, expected);
  } catch {
    return false;
  }
}
