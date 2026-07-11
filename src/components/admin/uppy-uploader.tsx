import { useEffect, useRef, useCallback } from "react";
import Uppy from "@uppy/core";
import Dashboard from "@uppy/dashboard";
import "@uppy/dashboard/css/style.min.css";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface UploadResult {
  path: string;
  url: string;
  name: string;
  size: number;
  type: string;
  bucket: string;
}

interface UppyUploaderProps {
  bucket: string;
  pathPrefix: string;
  onUploadComplete: (result: UploadResult) => void;
  maxFiles?: number;
  maxFileSize?: number;
  allowedFileTypes?: string[];
  onUploadStart?: () => void;
  onUploadEnd?: () => void;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function UppyUploader({
  bucket,
  pathPrefix,
  onUploadComplete,
  maxFiles = 10,
  maxFileSize,
  allowedFileTypes,
  onUploadStart,
  onUploadEnd,
}: UppyUploaderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const uploadCountRef = useRef(0);

  const uploadFile = useCallback(
    async (file: any) => {
      const ext = file.name?.split(".").pop() || "bin";
      const path = `${pathPrefix}/${generateId()}.${ext}`;
      try {
        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(path, file.data, {
            cacheControl: "3600",
            upsert: false,
            contentType: file.type || undefined,
          });
        if (uploadError) throw uploadError;
        const { data: pubData } = supabase.storage.from(bucket).getPublicUrl(path);
        uploadCountRef.current++;
        onUploadComplete({
          path,
          url: pubData.publicUrl,
          name: file.name,
          size: file.size,
          type: file.type,
          bucket,
        });
        return true;
      } catch (err: any) {
        toast.error(`Upload failed: ${file.name} — ${err.message}`);
        return false;
      }
    },
    [bucket, pathPrefix, onUploadComplete],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const uppy = new Uppy({
      autoProceed: true,
      restrictions: {
        maxNumberOfFiles: maxFiles,
        maxFileSize: maxFileSize,
        allowedFileTypes: allowedFileTypes,
      },
    });

    uppy.use(Dashboard, {
      target: container,
      inline: true,
      height: 300,
      proudlyDisplayPoweredByUppy: false,
      hideUploadButton: true,
      hideRetryButton: false,
      hidePauseResumeButton: true,
      hideCancelButton: false,
    });

    uppy.on("files-added", () => {
      onUploadStart?.();
      uploadCountRef.current = 0;

      const files = uppy.getFiles();
      files.forEach((f) => {
        const size = f.size ?? 0;
        uppy.setFileState(f.id, {
          progress: { uploadStarted: Date.now(), uploadComplete: false, percentage: 0, bytesTotal: size, bytesUploaded: 0 },
        });
      });

      Promise.all(
        files.map(async (file) => {
          const success = await uploadFile(file);
          const size = file.size ?? 0;
          uppy.setFileState(file.id, {
            progress: { uploadStarted: Date.now(), uploadComplete: success, percentage: success ? 100 : 0, bytesTotal: size, bytesUploaded: success ? size : 0 },
          });
        }),
      ).then(() => {
        onUploadEnd?.();
        if (uploadCountRef.current > 0) {
          toast.success(`${uploadCountRef.current} file${uploadCountRef.current > 1 ? "s" : ""} uploaded`);
        }
      });
    });

    return () => {
      uppy.cancelAll();
    };
  }, [bucket, pathPrefix, maxFiles, maxFileSize, allowedFileTypes, uploadFile]);

  return <div ref={containerRef} />;
}
