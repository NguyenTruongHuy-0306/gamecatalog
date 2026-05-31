import { NextRequest, NextResponse } from "next/server";
import { cloudinary, isConfigured } from "@/lib/cloudinary";
import { requireAdmin } from "@/lib/api-helpers";

function isSafeImageUrl(urlStr: string): boolean {
  let url: URL;
  try {
    url = new URL(urlStr);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  const h = url.hostname;
  if (h === "localhost" || h === "127.0.0.1" || h === "::1") return false;
  const ipv4 = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const [a, b] = [Number(ipv4[1]), Number(ipv4[2])];
    if (a === 10) return false;
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && b === 168) return false;
    if (a === 169 && b === 254) return false;
    if (a === 0) return false;
  }
  return true;
}

const FOLDER = "gamecatalog/covers";
const MAX_BYTES = 5_000_000;
const UPLOAD_OPTIONS = {
  folder: FOLDER,
  transformation: [
    { width: 1200, crop: "limit" },
    { quality: "auto", fetch_format: "auto" },
  ],
};

export async function POST(request: NextRequest) {
  if (!isConfigured()) {
    return NextResponse.json({ error: "Image storage not configured" }, { status: 503 });
  }

  const { error } = await requireAdmin();
  if (error) return error;

  const contentType = request.headers.get("content-type") ?? "";

  // URL mode: fetch a remote image and re-upload to Cloudinary
  if (contentType.includes("application/json")) {
    let body: { url?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    if (!body.url || typeof body.url !== "string") {
      return NextResponse.json({ error: "url is required" }, { status: 400 });
    }
    if (!isSafeImageUrl(body.url)) {
      return NextResponse.json({ error: "Invalid or disallowed URL" }, { status: 400 });
    }
    try {
      const result = await cloudinary.uploader.upload(body.url, UPLOAD_OPTIONS);
      return NextResponse.json({ url: result.secure_url });
    } catch {
      return NextResponse.json({ error: "Failed to fetch image from URL" }, { status: 422 });
    }
  }

  // File mode: upload a local file
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("image") as File | null;
  if (!file) return NextResponse.json({ error: "No image provided" }, { status: 400 });
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "File must be an image" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File must be under 5 MB" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(UPLOAD_OPTIONS, (err, res) => {
        if (err || !res) reject(err ?? new Error("Upload failed"));
        else resolve(res as { secure_url: string });
      })
      .end(buffer);
  });

  return NextResponse.json({ url: result.secure_url });
}
