import { useState, useRef } from "react";
import { toast } from "sonner";
import { Image } from "lucide-react";
import { MediaPicker } from "@/components/admin/media-engine";
import type { MediaPickerResult, MediaPickerOptions } from "@/components/admin/media-engine";

interface CoverUploaderProps {
  coverImage: string | null;
  onCoverChange: (url: string | null) => void;
}

export function CoverUploader({ coverImage, onCoverChange }: CoverUploaderProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [coverUrlDraft, setCoverUrlDraft] = useState("");
  const pickerOptionsRef = useRef<MediaPickerOptions | null>(null);

  const openPicker = (title: string) => {
    pickerOptionsRef.current = {
      title,
      bucket: "blog-images",
      allowedFileTypes: ["image/*"],
      onSelect: (result: MediaPickerResult) => {
        onCoverChange(result.url);
        setPickerOpen(false);
        pickerOptionsRef.current = null;
      },
      onClose: () => {
        setPickerOpen(false);
        pickerOptionsRef.current = null;
      },
    };
    setPickerOpen(true);
  };

  const handlePickerClose = () => {
    pickerOptionsRef.current?.onClose?.();
    setPickerOpen(false);
    pickerOptionsRef.current = null;
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
              onClick={() => openPicker("Replace Cover Image")}
              className="px-4 py-2 text-xs uppercase tracking-[0.2em] bg-background text-foreground border border-border hover:bg-secondary"
            >
              Replace
            </button>
            <button
              type="button"
              onClick={() => onCoverChange(null)}
              className="px-4 py-2 text-xs uppercase tracking-[0.2em] bg-background text-destructive border border-border hover:bg-secondary"
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => openPicker("Select Cover Image")}
          className="border-2 border-dashed cursor-pointer text-center px-6 py-12 transition-colors border-border hover:border-foreground/50 hover:bg-secondary/30"
        >
          <Image className="h-8 w-8 mx-auto text-muted-foreground/30 mb-3" />
          <p className="font-serif text-lg mb-1">
            Click to browse or upload
          </p>
          <p className="text-xs text-muted-foreground">JPG, PNG, WEBP, GIF or AVIF</p>
        </div>
      )}

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

      {pickerOpen && pickerOptionsRef.current && (
        <MediaPicker
          open={true}
          options={pickerOptionsRef.current}
          onSelect={(result) => {
            pickerOptionsRef.current?.onSelect?.(result);
          }}
          onClose={handlePickerClose}
        />
      )}
    </div>
  );
}
