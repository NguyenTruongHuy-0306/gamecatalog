import { NextRequest, NextResponse } from "next/server";
import { cloudinary, isConfigured } from "@/lib/cloudinary";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/api-helpers";

const FOLDER = "gamecatalog/avatars";
const MAX_BYTES = 5_000_000;

function publicId(userId: string) {
  return `${FOLDER}/${userId}`;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!isConfigured()) {
    return NextResponse.json({ error: "Image storage not configured" }, { status: 503 });
  }

  const { error } = await requireAdmin();
  if (error) return error;

  const target = await prisma.user.findUnique({ where: { id }, select: { id: true } });
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

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
      .upload_stream(
        {
          public_id: publicId(id),
          overwrite: true,
          invalidate: true,
          transformation: [
            { width: 400, height: 400, crop: "fill", gravity: "face" },
            { quality: "auto", fetch_format: "auto" },
          ],
        },
        (err, res) => {
          if (err || !res) reject(err ?? new Error("Upload failed"));
          else resolve(res as { secure_url: string });
        }
      )
      .end(buffer);
  });

  await prisma.user.update({
    where: { id },
    data: { avatarUrl: result.secure_url },
  });

  return NextResponse.json({ url: result.secure_url });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!isConfigured()) {
    return NextResponse.json({ error: "Image storage not configured" }, { status: 503 });
  }

  const { error } = await requireAdmin();
  if (error) return error;

  const target = await prisma.user.findUnique({ where: { id }, select: { id: true } });
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

  try {
    await cloudinary.uploader.destroy(publicId(id), { invalidate: true });
  } catch {
    // ignore — image may not exist on Cloudinary
  }

  await prisma.user.update({ where: { id }, data: { avatarUrl: null } });
  return NextResponse.json({ message: "Avatar removed" });
}
