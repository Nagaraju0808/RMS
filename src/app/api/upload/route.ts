import { NextRequest } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";
import { ApiError, handler, ok, requireSession } from "@/lib/api";

const TYPES: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };
/** Upload a menu photo or logo. Saved to public/uploads (use S3 or similar in production). */
export const POST = handler(async (req: NextRequest) => {
  const s = await requireSession("menu.manage");
  const file = (await req.formData()).get("file");
  if (!(file instanceof File)) throw new ApiError(400, "No file.");
  if (file.size > 3_000_000) throw new ApiError(400, "Image is too big (max 3 MB).");
  const buf = Buffer.from(await file.arrayBuffer());
  // Trust the file's first bytes, not the name or the type the browser claims.
  const sniff = buf.subarray(0, 4).toString("hex") === "89504e47" ? "image/png" : buf.subarray(0, 3).toString("hex") === "ffd8ff" ? "image/jpeg" : buf.subarray(0, 4).toString() === "RIFF" && buf.subarray(8, 12).toString() === "WEBP" ? "image/webp" : null;
  const ext = sniff ? TYPES[sniff] : undefined;
  if (!ext) throw new ApiError(400, "Only PNG, JPG or WEBP images are allowed.");
  const dir = path.join(process.cwd(), "public", "uploads", s.restaurantId);
  await mkdir(dir, { recursive: true });
  const name = `${crypto.randomUUID()}.${ext}`;
  await writeFile(path.join(dir, name), buf);
  return ok({ url: `/uploads/${s.restaurantId}/${name}` });
});
