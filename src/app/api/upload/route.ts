import { handle, ok, err } from "@/lib/api";
import { query } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { put } from "@vercel/blob";
import sharp from "sharp";
import { findMockMember, getMockStore, isMockMode, nextMockId } from "@/lib/mock-store";

export const runtime = "nodejs";

const ALLOWED_MIMES = new Set([
  "image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml",
  "video/mp4", "video/webm", "video/quicktime",
  "application/pdf",
]);
const MAX_IMAGE_MB = Number(process.env.UPLOAD_MAX_IMAGE_MB ?? "15");
const MAX_VIDEO_MB = Number(process.env.UPLOAD_MAX_VIDEO_MB ?? "100");

// Photos get resized + re-encoded as WebP to cut storage by ~10–20×.
// Animated GIFs and SVGs are passed through unchanged (sharp can't safely
// downscale animations without losing frames; SVG is already vector).
const IMAGE_MAX_DIM = Number(process.env.UPLOAD_IMAGE_MAX_DIM ?? "2000");
const IMAGE_WEBP_QUALITY = Number(process.env.UPLOAD_IMAGE_WEBP_QUALITY ?? "80");
const COMPRESSIBLE_MIMES = new Set(["image/jpeg", "image/png", "image/webp"]);

async function compressImage(input: Buffer): Promise<{ buffer: Buffer; mime: string; ext: string }> {
  const buffer = await sharp(input, { failOn: "none" })
    .rotate() // honor EXIF orientation
    .resize({ width: IMAGE_MAX_DIM, height: IMAGE_MAX_DIM, fit: "inside", withoutEnlargement: true })
    .webp({ quality: IMAGE_WEBP_QUALITY })
    .toBuffer();
  return { buffer, mime: "image/webp", ext: "webp" };
}

export const POST = handle(async (req) => {
  const s = await requireSession();
  const formData = await req.formData();
  const file = formData.get("file");
  const label = (formData.get("label") as string | null) ?? null;

  if (!(file instanceof File)) return err(400, "No file provided");
  if (!ALLOWED_MIMES.has(file.type)) return err(400, `Unsupported file type: ${file.type}`);

  const isVideo = file.type.startsWith("video/");
  const maxBytes = (isVideo ? MAX_VIDEO_MB : MAX_IMAGE_MB) * 1024 * 1024;
  if (file.size > maxBytes) {
    return err(400, `File too large (max ${isVideo ? MAX_VIDEO_MB : MAX_IMAGE_MB} MB)`);
  }

  let buffer: Buffer = Buffer.from(await file.arrayBuffer());
  let mime = file.type;
  let ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";

  if (COMPRESSIBLE_MIMES.has(mime)) {
    const out = await compressImage(buffer);
    buffer = out.buffer as Buffer;
    mime = out.mime;
    ext = out.ext;
  }

  const filename = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
  const sizeBytes = buffer.byteLength;

  // Vercel Blob in production; in mock/local dev without a token, fall back to
  // an in-memory data URL so uploads don't hard-fail when BLOB_READ_WRITE_TOKEN
  // isn't configured. Production must set BLOB_READ_WRITE_TOKEN.
  let url: string;
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(filename, buffer, {
      access: "public",
      contentType: mime,
      addRandomSuffix: false,
    });
    url = blob.url;
  } else {
    url = `data:${mime};base64,${buffer.toString("base64")}`;
  }

  if (isMockMode()) {
    const assetId = nextMockId("asset");
    getMockStore().assets.unshift({
      assetId,
      url,
      filename,
      mimeType: mime,
      sizeBytes,
      label,
      tags: [],
      createdAt: new Date().toISOString(),
      uploadedBy: s.memberId,
    });
    return ok({ assetId, url }, { status: 201 });
  }
  const { rows } = await query<{ asset_id: number }>(
    `INSERT INTO media_assets (url, filename, mime_type, size_bytes, uploaded_by, label)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING asset_id`,
    [url, filename, mime, sizeBytes, s.memberId, label],
  );
  return ok({ assetId: rows[0].asset_id, url }, { status: 201 });
});

export const GET = handle(async (req) => {
  await requireSession();
  const url = new URL(req.url);
  const mime = url.searchParams.get("mime"); // e.g. "image" → filters image/*
  const limit = Math.min(Number(url.searchParams.get("limit") ?? "60"), 200);
  const offset = Number(url.searchParams.get("offset") ?? "0");
  if (isMockMode()) {
    const rows = getMockStore().assets
      .filter((a) => !mime || a.mimeType.startsWith(`${mime}/`))
      .slice(offset, offset + limit)
      .map((a) => ({
        assetId: a.assetId,
        url: a.url,
        filename: a.filename,
        mimeType: a.mimeType,
        sizeBytes: a.sizeBytes,
        label: a.label,
        tags: a.tags,
        createdAt: a.createdAt,
        uploadedBy: a.uploadedBy ? findMockMember(a.uploadedBy)?.fullName ?? null : null,
      }));
    return ok(rows);
  }

  const params: unknown[] = [limit, offset];
  const where = mime ? `WHERE a.mime_type LIKE $3` : "";
  if (mime) params.push(`${mime}/%`);

  const { rows } = await query(
    `SELECT a.asset_id AS "assetId", a.url, a.filename, a.mime_type AS "mimeType",
            a.size_bytes AS "sizeBytes", a.label, a.tags, a.created_at AS "createdAt",
            p.full_name AS "uploadedBy"
       FROM media_assets a
       LEFT JOIN profiles p ON p.member_id = a.uploaded_by
       ${where}
      ORDER BY a.created_at DESC
      LIMIT $1 OFFSET $2`,
    params,
  );
  return ok(rows);
});
