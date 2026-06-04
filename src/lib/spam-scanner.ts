const URL_REGEX = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi;

export function extractUrls(text: string): string[] {
  return [...new Set(text.match(URL_REGEX) ?? [])];
}

/**
 * Checks extracted URLs against Google Safe Browsing API.
 * Returns true if any URL is flagged as malware, phishing, or unwanted software.
 * Fails open (returns false) when the API key is missing or the API is unavailable
 * so legitimate reviews are never silently dropped due to an outage.
 */
export async function containsMaliciousLinks(text: string): Promise<boolean> {
  const urls = extractUrls(text);
  if (!urls.length) return false;

  const apiKey = process.env.GOOGLE_SAFE_BROWSING_API_KEY;
  if (!apiKey) return false;

  try {
    const res = await fetch(
      `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client: { clientId: "gamecatalog", clientVersion: "1.0" },
          threatInfo: {
            threatTypes: [
              "MALWARE",
              "SOCIAL_ENGINEERING",
              "UNWANTED_SOFTWARE",
              "POTENTIALLY_HARMFUL_APPLICATION",
            ],
            platformTypes: ["ANY_PLATFORM"],
            threatEntryTypes: ["URL"],
            threatEntries: urls.map((url) => ({ url })),
          },
        }),
        signal: AbortSignal.timeout(5000),
      }
    );

    if (!res.ok) return false;
    const data = (await res.json()) as { matches?: unknown[] };
    return Array.isArray(data.matches) && data.matches.length > 0;
  } catch {
    return false;
  }
}
