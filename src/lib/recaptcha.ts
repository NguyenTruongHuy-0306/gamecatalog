const RECAPTCHA_VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify";
const SCORE_THRESHOLD = 0.5;

export async function verifyRecaptcha(token: string): Promise<boolean> {
  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!secret) return true; // not configured in this environment, skip verification
  if (!token) return true;

  try {
    const res = await fetch(RECAPTCHA_VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token }).toString(),
    });
    if (!res.ok) return false;
    const data = await res.json();
    console.log("[recaptcha]", JSON.stringify({ success: data.success, score: data.score, action: data.action, errorCodes: data["error-codes"] }));
    if (data.success !== true) return false;
    return (data.score ?? 0) >= SCORE_THRESHOLD;
  } catch (err) {
    console.error("[recaptcha] network error:", err);
    return false;
  }
}
