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
  const ext = TYPES[file.type];
  if (!ext) throw new ApiError(400, "Only PNG, JPG or WEBP images are allowed.");
  if (file.size > 3_000_000) throw new ApiError(400, "Image is too big (max 3 MB).");
  const dir = path.join(process.cwd(), "public", "uploads", s.restaurantId);
  await mkdir(dir, { recursive: true });
  const name = `${crypto.randomUUID()}.${ext}`;
  await writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
  return ok({ url: `/uploads/${s.restaurantId}/${name}` });
});
