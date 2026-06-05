import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  type PutObjectCommandInput,
  type DeleteObjectCommandInput,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/* ─── Types ─────────────────────────────────────────────────────── */

export interface R2Config {
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  endpoint: string;
  publicUrlBase: string;
}

export interface UploadResult {
  key: string;
  url: string;
  publicUrl: string;
  size: number;
}

export interface R2FileInfo {
  key: string;
  size: number;
  etag?: string;
  lastModified?: Date;
  contentType?: string;
}

/* ─── Configuration ────────────────────────────────────────────── */

/**
 * Get R2 config from environment variables.
 * Returns null if R2 is not configured (app falls back to Supabase Storage).
 */
export function getR2Config(): R2Config | null {
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.R2_BUCKET_NAME;
  const endpoint = process.env.R2_ENDPOINT;
  const publicUrlBase = process.env.R2_PUBLIC_URL;

  if (!accessKeyId || !secretAccessKey || !bucketName || !endpoint || !publicUrlBase) {
    return null;
  }

  return { accessKeyId, secretAccessKey, bucketName, endpoint, publicUrlBase };
}

/* ─── Client creation (lazy) ────────────────────────────────────── */

let _client: S3Client | null = null;

function getClient(config: R2Config): S3Client {
  if (!_client) {
    _client = new S3Client({
      region: "auto",
      endpoint: config.endpoint,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      requestHandler: {
        // Ensure compatibility with Workers runtime via nodejs_compat
      },
    });
  }
  return _client;
}

/** Reset the client (useful if config changes between requests). */
export function resetR2Client(): void {
  _client = null;
}

/* ─── File operations ───────────────────────────────────────────── */

/**
 * Upload a file to R2.
 * @param key - The storage key/path (e.g. "books/covers/my-book.jpg")
 * @param body - File contents as Buffer, Uint8Array, Blob, or ReadableStream
 * @param contentType - MIME type
 * @returns UploadResult with key, public URL, and size
 */
export async function uploadFile(
  key: string,
  body: Buffer | Uint8Array | Blob | ReadableStream,
  contentType: string,
): Promise<UploadResult> {
  const config = getR2Config();
  if (!config) throw new Error("R2 is not configured. Set R2_* environment variables.");

  const client = getClient(config);

  const input: PutObjectCommandInput = {
    Bucket: config.bucketName,
    Key: key,
    Body: body,
    ContentType: contentType,
  };

  await client.send(new PutObjectCommand(input));

  return {
    key,
    url: `${config.publicUrlBase}/${key}`,
    publicUrl: `${config.publicUrlBase}/${key}`,
    size: body instanceof Blob ? body.size : body instanceof Buffer ? body.length : 0,
  };
}

/**
 * Delete a file from R2.
 * @param key - The storage key/path to delete
 */
export async function deleteFile(key: string): Promise<void> {
  const config = getR2Config();
  if (!config) throw new Error("R2 is not configured.");

  const client = getClient(config);

  const input: DeleteObjectCommandInput = {
    Bucket: config.bucketName,
    Key: key,
  };

  await client.send(new DeleteObjectCommand(input));
}

/**
 * Get file metadata from R2.
 * @param key - The storage key/path
 * @returns R2FileInfo or null if not found
 */
export async function getFileInfo(key: string): Promise<R2FileInfo | null> {
  const config = getR2Config();
  if (!config) return null;

  const client = getClient(config);

  try {
    const result = await client.send(
      new HeadObjectCommand({ Bucket: config.bucketName, Key: key }),
    );
    return {
      key,
      size: result.ContentLength ?? 0,
      etag: result.ETag,
      lastModified: result.LastModified,
      contentType: result.ContentType,
    };
  } catch (e: any) {
    if (e.name === "NotFound") return null;
    throw e;
  }
}

/**
 * Generate a presigned upload URL for direct client-to-R2 uploads.
 * @param key - The storage key/path
 * @param contentType - MIME type
 * @param expiresInSeconds - URL expiry (default 3600 = 1 hour)
 * @returns Presigned URL string
 */
export async function createPresignedUploadUrl(
  key: string,
  contentType: string,
  expiresInSeconds = 3600,
): Promise<string> {
  const config = getR2Config();
  if (!config) throw new Error("R2 is not configured.");

  const client = getClient(config);

  const command = new PutObjectCommand({
    Bucket: config.bucketName,
    Key: key,
    ContentType: contentType,
  });

  return getSignedUrl(client, command, { expiresIn: expiresInSeconds });
}

/**
 * Generate a presigned download URL for private files.
 * @param key - The storage key/path
 * @param expiresInSeconds - URL expiry (default 3600)
 * @returns Presigned URL string
 */
export async function createPresignedDownloadUrl(
  key: string,
  expiresInSeconds = 3600,
): Promise<string> {
  const config = getR2Config();
  if (!config) throw new Error("R2 is not configured.");

  const client = getClient(config);

  const command = new GetObjectCommand({
    Bucket: config.bucketName,
    Key: key,
  });

  return getSignedUrl(client, command, { expiresIn: expiresInSeconds });
}

/**
 * List all files with a given prefix.
 * @param prefix - Key prefix (e.g. "books/covers/")
 * @returns Array of R2FileInfo
 */
export async function listFiles(prefix: string): Promise<R2FileInfo[]> {
  const config = getR2Config();
  if (!config) return [];

  const client = getClient(config);

  const result = await client.send(
    new ListObjectsV2Command({
      Bucket: config.bucketName,
      Prefix: prefix,
    }),
  );

  return (result.Contents ?? []).map((obj) => ({
    key: obj.Key ?? "",
    size: obj.Size ?? 0,
    etag: obj.ETag,
    lastModified: obj.LastModified,
  })).filter((f) => f.key.length > 0);
}

/**
 * Check if R2 is configured and accessible.
 */
export async function isR2Available(): Promise<boolean> {
  const config = getR2Config();
  return config !== null;
}
