const RECAPTCHA_VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify";
const SCORE_THRESHOLD = 0.5;

export async function verifyRecaptcha(token: string): Promise<boolean> {
  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!secret) return true; // skip when not configured

  try {
    const res = await fetch(RECAPTCHA_VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token }).toString(),
    });
    if (!res.ok) return false;
    const data = await res.json();
    if (data.success !== true) return false;
    return (data.score ?? 0) >= SCORE_THRESHOLD;
  } catch {
    // Network error reaching Google — fail closed to prevent bypass during outages
    return false;
  }
}
