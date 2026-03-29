import { getApp } from "firebase-admin/app";
import { FieldValue } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { getBucket, getDb } from "@/lib/firebaseAdmin";
import type { PersonPublic } from "@/lib/types";

export const COL_PEOPLE = "people";

/** Max file size when Firebase Storage works. */
const MAX_UPLOAD_BYTES = 1_500_000;
/**
 * Max raw image size when stored as base64 on the Firestore doc (emulator or Storage-fallback).
 * ~720KB keeps the document under Firestore’s ~1 MiB limit with headroom for other fields.
 */
const MAX_INLINE_PHOTO_BYTES = 720_000;

const ALLOWED_TYPES = new Map([
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["image/jpg", "jpg"],
  ["image/webp", "webp"]
]);

/** Browsers often send an empty `File.type`; infer from magic bytes and file name. */
export function inferImageContentType(buffer: Buffer, fileName: string, declaredType: string): string | null {
  const normalized = declaredType.trim().toLowerCase();
  if (normalized && ALLOWED_TYPES.has(normalized)) {
    return normalized === "image/jpg" ? "image/jpeg" : normalized;
  }

  if (buffer.length >= 8 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return "image/png";
  }
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }

  const lower = fileName.trim().toLowerCase();
  if (lower.endsWith(".png")) {
    return "image/png";
  }
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) {
    return "image/jpeg";
  }
  if (lower.endsWith(".webp")) {
    return "image/webp";
  }

  return null;
}

function isEmulator(): boolean {
  return Boolean(process.env.FIRESTORE_EMULATOR_HOST);
}

/**
 * Tries Firebase Storage with the configured bucket, then common alternate bucket names
 * (`.firebasestorage.app` vs `.appspot.com`) so uploads work without manual env tuning.
 */
async function tryStorageUpload(
  buffer: Buffer,
  resolvedType: string,
  storagePath: string
): Promise<{ photoUrl: string; bucketName: string }> {
  getDb();
  const app = getApp();
  const projectId = app.options.projectId;
  const configured =
    typeof app.options.storageBucket === "string" ? app.options.storageBucket : undefined;
  const envBucket = process.env.FIREBASE_STORAGE_BUCKET?.trim();

  const candidates = [
    envBucket,
    configured,
    projectId ? `${projectId}.firebasestorage.app` : undefined,
    projectId ? `${projectId}.appspot.com` : undefined
  ].filter((b): b is string => Boolean(b));

  const seen = new Set<string>();
  const uniqueBuckets = candidates.filter((b) => {
    const key = b.toLowerCase();
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });

  let lastErr: unknown;
  for (const bucketName of uniqueBuckets) {
    try {
      const bucket = getStorage(app).bucket(bucketName);
      const file = bucket.file(storagePath);
      await file.save(buffer, {
        metadata: {
          contentType: resolvedType,
          cacheControl: "public, max-age=31536000"
        }
      });
      const [signedUrl] = await file.getSignedUrl({
        action: "read",
        expires: new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000)
      });
      return { photoUrl: signedUrl, bucketName };
    } catch (err) {
      lastErr = err;
      console.warn(`[people] Storage upload failed for bucket "${bucketName}", trying next`, err);
    }
  }

  throw lastErr ?? new Error("STORAGE_NO_BUCKET");
}

export async function listPeople(): Promise<PersonPublic[]> {
  const db = getDb();
  const snap = await db.collection(COL_PEOPLE).orderBy("name").get();
  return snap.docs.map((doc) => {
    const d = doc.data();
    return {
      id: doc.id,
      name: String(d.name ?? ""),
      photoUrl: String(d.photoUrl ?? "")
    };
  });
}

export async function resolvePeopleByIds(ids: string[]): Promise<PersonPublic[]> {
  if (ids.length === 0) {
    return [];
  }
  const db = getDb();
  const refs = ids.map((id) => db.collection(COL_PEOPLE).doc(id));
  const snaps = await db.getAll(...refs);
  return snaps.map((snap, i) => {
    if (!snap.exists) {
      throw new Error(`PERSON_NOT_FOUND:${ids[i]}`);
    }
    const d = snap.data()!;
    return {
      id: snap.id,
      name: String(d.name ?? ""),
      photoUrl: String(d.photoUrl ?? "")
    };
  });
}

export async function createPerson(input: {
  name: string;
  buffer: Buffer;
  contentType: string;
  fileName?: string;
}): Promise<PersonPublic> {
  const trimmed = input.name.trim();
  if (!trimmed || trimmed.length > 80) {
    throw new Error("INVALID_NAME");
  }

  const resolvedType =
    inferImageContentType(input.buffer, input.fileName ?? "photo.png", input.contentType) ?? "";
  const ext = ALLOWED_TYPES.get(resolvedType);
  if (!ext) {
    throw new Error("INVALID_IMAGE_TYPE");
  }

  const db = getDb();
  const docRef = db.collection(COL_PEOPLE).doc();
  const id = docRef.id;

  let photoUrl: string;
  let storagePath: string | null = null;
  let storageBucket: string | null = null;

  if (isEmulator()) {
    if (input.buffer.length > MAX_INLINE_PHOTO_BYTES) {
      throw new Error("IMAGE_TOO_LARGE");
    }
    photoUrl = `data:${resolvedType};base64,${input.buffer.toString("base64")}`;
  } else {
    if (input.buffer.length > MAX_UPLOAD_BYTES) {
      throw new Error("IMAGE_TOO_LARGE");
    }
    storagePath = `people/${id}.${ext}`;
    try {
      const { photoUrl: url, bucketName } = await tryStorageUpload(
        input.buffer,
        resolvedType,
        storagePath
      );
      photoUrl = url;
      storageBucket = bucketName;
    } catch (storageErr) {
      console.error("Firebase Storage upload failed on all buckets; using inline photo fallback", storageErr);
      if (input.buffer.length > MAX_INLINE_PHOTO_BYTES) {
        throw new Error("STORAGE_FAILED_FILE_TOO_LARGE");
      }
      storagePath = null;
      storageBucket = null;
      photoUrl = `data:${resolvedType};base64,${input.buffer.toString("base64")}`;
    }
  }

  await docRef.set({
    name: trimmed,
    photoUrl,
    storagePath,
    storageBucket,
    createdAt: FieldValue.serverTimestamp()
  });

  return { id, name: trimmed, photoUrl };
}

export async function deletePerson(id: string): Promise<void> {
  const db = getDb();
  const ref = db.collection(COL_PEOPLE).doc(id);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new Error("PERSON_NOT_FOUND");
  }
  const data = snap.data()!;
  const storagePath = data.storagePath;
  const storedBucket =
    typeof data.storageBucket === "string" && data.storageBucket.length > 0
      ? data.storageBucket
      : null;

  if (!isEmulator() && typeof storagePath === "string" && storagePath.length > 0) {
    try {
      const bucket = storedBucket
        ? getStorage(getApp()).bucket(storedBucket)
        : getBucket();
      await bucket.file(storagePath).delete({ ignoreNotFound: true });
    } catch (err) {
      console.error("Failed to delete storage object", storagePath, err);
    }
  }

  await ref.delete();
}
