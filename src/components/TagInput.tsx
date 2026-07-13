import { useState, type KeyboardEvent } from "react";

interface TagInputProps {
  tags: string[];
  onTagsChange: (tags: string[]) => void;
}

export function TagInput({ tags, onTagsChange }: TagInputProps) {
  const [draft, setDraft] = useState("");

  const addTag = (raw: string) => {
    const t = raw.trim().replace(/^#/, "");
    if (!t) return;
    if (tags.some((x) => x.toLowerCase() === t.toLowerCase())) {
      setDraft("");
      return;
    }
    onTagsChange([...tags, t]);
    setDraft("");
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(draft);
    } else if (e.key === "Backspace" && !draft && tags.length) {
      onTagsChange(tags.slice(0, -1));
    }
  };

  const removeTag = (t: string) => onTagsChange(tags.filter((x) => x !== t));

  return (
    <div>
      <label className="block text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">
        Tags
      </label>
      <div className="border border-border bg-background px-3 py-2.5 flex flex-wrap items-center gap-2">
        {tags.map((t) => (
          <span
            key={t}
            className="inline-flex items-center gap-1.5 bg-secondary text-secondary-foreground text-xs px-2.5 py-1 rounded-sm"
          >
            {t}
            <button
              type="button"
              onClick={() => removeTag(t)}
              className="text-muted-foreground hover:text-foreground"
              aria-label={`Remove ${t}`}
            >
              ×
            </button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => draft && addTag(draft)}
          placeholder={tags.length ? "" : "Type a tag and press Enter…"}
          className="flex-1 min-w-[140px] bg-transparent text-sm focus:outline-none"
        />
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        Press Enter or comma to add. Backspace removes the last tag.
      </p>
    </div>
  );
}
