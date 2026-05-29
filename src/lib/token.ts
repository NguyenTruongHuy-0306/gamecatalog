import crypto from "crypto";

export function generateRawToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function getTokenExpiryDate(hours = 24): Date {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

export function generateOtp(): string {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
}
