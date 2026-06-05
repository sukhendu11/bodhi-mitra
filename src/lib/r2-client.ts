import { useServerFn } from "@tanstack/react-start";
import {
  getPresignedUploadUrl,
  uploadAsset,
  deleteAssetByKey,
  checkR2Available,
} from "@/lib/r2-functions";

/**
 * Upload a file via R2 (using presigned URL) with automatic fallback.
 * Returns the public URL of the uploaded file.
 *
 * Flow:
 * 1. Check if R2 is available
 * 2. If R2: get presigned URL from server → upload file directly to R2 → return public URL
 * 3. If fallback: return null (caller should use existing Supabase Storage flow)
 */
export async function uploadToR2(
  prefix: string,
  file: File,
): Promise<{ url: string; key: string } | null> {
  // Check if R2 is configured
  const r2Available = await checkR2Available();
  if (!r2Available.available) return null;

  // For files > 10MB, use presigned URL (direct client upload)
  if (file.size > 10 * 1024 * 1024) {
    return uploadViaPresignedUrl(prefix, file);
  }

  // For small files, use base64 via server function
  return uploadViaBase64(prefix, file);
}

/**
 * Upload a small file via base64 (server function handles the upload).
 */
async function uploadViaBase64(
  prefix: string,
  file: File,
): Promise<{ url: string; key: string } | null> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = reader.result as string;
        const doUpload = useServerFn(uploadAsset);
        const result = await doUpload({
          data: {
            prefix,
            filename: file.name,
            contentType: file.type || "application/octet-stream",
            base64,
          },
        });
        resolve({ url: result.publicUrl, key: result.key });
      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/**
 * Upload a large file via presigned URL (direct client-to-R2 upload).
 */
async function uploadViaPresignedUrl(
  prefix: string,
  file: File,
): Promise<{ url: string; key: string } | null> {
  const doGetUrl = useServerFn(getPresignedUploadUrl);
  const { presignedUrl, publicUrl, key } = await doGetUrl({
    data: { prefix, filename: file.name, contentType: file.type || "application/octet-stream" },
  });

  // Upload directly to R2 via the presigned URL
  const response = await fetch(presignedUrl, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": file.type || "application/octet-stream" },
  });

  if (!response.ok) {
    throw new Error(`R2 upload failed: ${response.status} ${response.statusText}`);
  }

  return { url: publicUrl, key };
}

/**
 * Delete a file from R2 by its storage key.
 */
export async function deleteFromR2(key: string): Promise<boolean> {
  try {
    const doDelete = useServerFn(deleteAssetByKey);
    await doDelete({ data: { key } });
    return true;
  } catch {
    return false;
  }
}
