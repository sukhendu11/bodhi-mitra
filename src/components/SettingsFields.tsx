import { useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export function FieldRow({ children }: { children: React.ReactNode }) {
  return <div className="grid md:grid-cols-2 gap-4">{children}</div>;
}

export function Section({
  title,
  desc,
  children,
}: {
  title: string;
  desc?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border border-border rounded-md p-6 bg-card space-y-5">
      <header>
        <h3 className="font-serif text-xl">{title}</h3>
        {desc && <p className="text-xs text-muted-foreground mt-1">{desc}</p>}
      </header>
      {children}
    </section>
  );
}

export function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      <Input
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

export function TextareaField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      <Textarea value={value ?? ""} onChange={(e) => onChange(e.target.value)} rows={3} />
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function RichTextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      <Textarea
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        rows={10}
        className="font-serif"
      />
      <p className="text-[11px] text-muted-foreground">Use blank lines to separate paragraphs.</p>
    </div>
  );
}

export function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-14 rounded border border-border bg-transparent cursor-pointer"
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="font-mono uppercase"
        />
      </div>
    </div>
  );
}

export function FileUploadField({
  label,
  value,
  onUpload,
  onClear,
  onUrl,
  previewClass,
}: {
  label: string;
  value: string;
  onUpload: (f: File) => Promise<void>;
  onClear: () => void;
  onUrl?: (url: string) => void;
  previewClass: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  return (
    <div className="space-y-2">
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      <div className="flex items-start gap-4 border border-dashed border-border rounded-md p-3">
        {value ? (
          <img
            src={value}
            alt=""
            className={`${previewClass} object-contain bg-muted/40 rounded`}
          />
        ) : (
          <div
            className={`${previewClass} grid place-items-center bg-muted/40 rounded text-xs text-muted-foreground px-2`}
          >
            none
          </div>
        )}
        <div className="flex-1 flex flex-col gap-2">
          <input
            ref={ref}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              setBusy(true);
              await onUpload(f);
              setBusy(false);
              if (ref.current) ref.current.value = "";
            }}
          />
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => ref.current?.click()}
            >
              {busy ? "Uploading…" : value ? "Replace" : "Upload"}
            </Button>
            {value && (
              <Button type="button" variant="ghost" size="sm" onClick={onClear}>
                Remove
              </Button>
            )}
          </div>
          {onUrl && (
            <div className="flex gap-2 pt-1">
              <input
                type="url"
                placeholder="…or paste image URL (https://…)"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                className="flex-1 text-xs px-2 py-1.5 border border-border rounded bg-background"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!urlInput.trim()}
                onClick={() => {
                  const u = urlInput.trim();
                  if (!u) return;
                  onUrl(u);
                  setUrlInput("");
                }}
              >
                Use URL
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
