import { useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  getPresignedUploadUrl,
  uploadAsset,
  deleteAssetByKey,
  checkR2Available,
} from "@/lib/r2-functions";

/**
 * Hook providing R2 upload/delete functions with automatic fallback.
 *
 * Returns null from uploadToR2 if R2 is not configured — callers should
 * then use their existing Supabase Storage flow as fallback.
 */
export function useR2Upload() {
  const doCheckR2 = useServerFn(checkR2Available);
  const doUploadAsset = useServerFn(uploadAsset);
  const doGetPresignedUrl = useServerFn(getPresignedUploadUrl);
  const doDelete = useServerFn(deleteAssetByKey);

  /**
   * Upload a file to R2. Returns { url, key } or null if R2 is unavailable.
   * - Small files (<10MB): uploaded via base64 through server function
   * - Large files: uploaded via presigned URL (direct client-to-R2)
   */
  const uploadToR2 = useCallback(
    async (prefix: string, file: File): Promise<{ url: string; key: string } | null> => {
      const { available } = await doCheckR2();
      if (!available) return null;

      // Large files: presigned URL (direct upload to R2, no server bandwidth)
      if (file.size > 10 * 1024 * 1024) {
        const { presignedUrl, publicUrl, key } = await doGetPresignedUrl({
          data: { prefix, filename: file.name, contentType: file.type || "application/octet-stream" },
        });

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

      // Small files: base64 through server function
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async () => {
          try {
            const base64 = reader.result as string;
            const result = await doUploadAsset({
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
    },
    [doCheckR2, doGetPresignedUrl, doUploadAsset],
  );

  /**
   * Delete a file from R2 by its storage key.
   */
  const deleteFromR2 = useCallback(
    async (key: string): Promise<boolean> => {
      try {
        await doDelete({ data: { key } });
        return true;
      } catch {
        return false;
      }
    },
    [doDelete],
  );

  return { uploadToR2, deleteFromR2 };
}
