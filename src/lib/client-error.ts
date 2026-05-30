export function apiError(data: unknown, fallback: string): string {
  if (!data || typeof data !== "object") return fallback;
  const err = (data as Record<string, unknown>).error;
  if (typeof err === "string") return err || fallback;
  if (err && typeof err === "object") {
    const msg = (err as Record<string, unknown>).message;
    if (typeof msg === "string") return msg || fallback;
  }
  return fallback;
}
