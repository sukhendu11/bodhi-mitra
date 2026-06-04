import { useRef, useState, type DragEvent } from "react";
import { toast } from "sonner";
import { uploadCoverImage } from "@/lib/posts";

const MAX_COVER_BYTES = 8 * 1024 * 1024; // 8 MB
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];

interface CoverUploaderProps {
  coverImage: string | null;
  onCoverChange: (url: string | null) => void;
}

export function CoverUploader({ coverImage, onCoverChange }: CoverUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [coverUrlDraft, setCoverUrlDraft] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const onFile = async (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/") || !ACCEPTED_TYPES.includes(file.type)) {
      toast.error("Please choose a JPG, PNG, WEBP, GIF, or AVIF image.");
      return;
    }
    if (file.size > MAX_COVER_BYTES) {
      toast.error("Image is too large. Max 8 MB.");
      return;
    }
    try {
      setUploading(true);
      const url = await uploadCoverImage(file);
      onCoverChange(url);
      toast.success("Cover uploaded");
    } catch (e) {
      const msg = (e as Error).message || "Upload failed";
      console.error("[cover upload]", e);
      toast.error(`Upload failed: ${msg}`);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) onFile(f);
  };

  const inputCls = "w-full border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:border-foreground/60";

  return (
    <div>
      <label className="block text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">Cover image</label>

      {coverImage ? (
        <div className="relative group border border-border">
          <img src={coverImage} alt="cover" className="w-full max-h-80 object-cover" />
          <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="px-4 py-2 text-xs uppercase tracking-[0.2em] bg-background text-foreground border border-border hover:bg-secondary disabled:opacity-50"
            >
              Replace
            </button>
            <button
              type="button"
              onClick={() => onCoverChange(null)}
              disabled={uploading}
              className="px-4 py-2 text-xs uppercase tracking-[0.2em] bg-background text-destructive border border-border hover:bg-secondary disabled:opacity-50"
            >
              Remove
            </button>
          </div>
          {uploading && (
            <div className="absolute inset-0 bg-background/70 flex items-center justify-center text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Uploading…
            </div>
          )}
        </div>
      ) : (
        <div
          onClick={() => !uploading && fileRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") fileRef.current?.click(); }}
          className={`border-2 border-dashed cursor-pointer text-center px-6 py-12 transition-colors ${
            dragOver ? "border-foreground bg-secondary/60" : "border-border hover:border-foreground/50 hover:bg-secondary/30"
          } ${uploading ? "opacity-60 pointer-events-none" : ""}`}
        >
          <p className="font-serif text-lg mb-1">
            {uploading ? "Uploading…" : "Drop an image here, or click to choose"}
          </p>
          <p className="text-xs text-muted-foreground">JPG, PNG, WEBP, GIF or AVIF — up to 8 MB</p>
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
        onChange={(e) => onFile(e.target.files?.[0] ?? null)}
        className="hidden"
      />

      <div className="mt-3 flex items-center gap-2">
        <input
          type="url"
          value={coverUrlDraft}
          onChange={(e) => setCoverUrlDraft(e.target.value)}
          placeholder="…or paste an image URL"
          className={inputCls + " flex-1"}
        />
        <button
          type="button"
          onClick={() => {
            const u = coverUrlDraft.trim();
            if (!u) return;
            try { new URL(u); } catch { toast.error("Invalid URL"); return; }
            onCoverChange(u);
            setCoverUrlDraft("");
            toast.success("Cover set from URL");
          }}
          className="px-4 py-2.5 text-xs uppercase tracking-[0.2em] border border-border hover:bg-secondary"
        >
          Use URL
        </button>
      </div>
    </div>
  );
}
