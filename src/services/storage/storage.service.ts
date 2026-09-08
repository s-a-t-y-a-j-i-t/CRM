import { deleteObject, getDownloadURL, getMetadata, ref, uploadBytes, type FullMetadata } from "firebase/storage";
import { AppError } from "@/lib/errors";
import { getClientStorage } from "@/lib/firebase/client";
import { assertCan } from "@/lib/rbac/can";
import { ALLOWED_UPLOAD_TYPES, MAX_UPLOAD_BYTES } from "@/schemas/domain";
import type { AuthenticatedUser } from "@/types/rbac";

function requireStorage() {
  const storage = getClientStorage();
  if (!storage) {
    throw new AppError("FIREBASE_UNCONFIGURED", "Firebase Storage is not configured.", 500);
  }
  return storage;
}

export function buildDocumentPath(relatedType: string, relatedId: string, fileName: string): string {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "-");
  return `documents/${relatedType}/${relatedId}/${Date.now()}-${safeName}`;
}

export async function putFile(
  path: string,
  file: File,
  user: AuthenticatedUser,
): Promise<{ path: string; contentType: string; sizeBytes: number }> {
  if (!ALLOWED_UPLOAD_TYPES.includes(file.type as (typeof ALLOWED_UPLOAD_TYPES)[number])) {
    throw new AppError("UPLOAD_REJECTED", "This file type is not allowed.", 400);
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new AppError("UPLOAD_REJECTED", "File exceeds the 15 MB limit.", 400);
  }
  const storageRef = ref(requireStorage(), path);
  await uploadBytes(storageRef, file, { contentType: file.type, customMetadata: { uploadedBy: user.uid } });
  return { path, contentType: file.type, sizeBytes: file.size };
}

export async function uploadFile(
  path: string,
  file: File,
  user: AuthenticatedUser,
): Promise<{ path: string; contentType: string; sizeBytes: number }> {
  assertCan(user, "documents.create");
  return putFile(path, file, user);
}

export async function getFileDownloadUrl(path: string, user: AuthenticatedUser): Promise<string> {
  assertCan(user, "documents.view");
  return getDownloadURL(ref(requireStorage(), path));
}

export async function getFileMetadata(path: string, user: AuthenticatedUser): Promise<FullMetadata> {
  assertCan(user, "documents.view");
  return getMetadata(ref(requireStorage(), path));
}

export async function deleteFile(path: string, user: AuthenticatedUser): Promise<void> {
  assertCan(user, "documents.delete");
  await deleteObject(ref(requireStorage(), path));
}
