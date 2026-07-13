interface LetterAvatarProps {
  name: string;
  src?: string | null;
  size?: number;
  className?: string;
}

// Soft, minimalist palette — deterministic by name
const PALETTE = [
  { bg: "#F5E6D3", fg: "#8B5E34" }, // sand / warm brown
  { bg: "#E8E4DD", fg: "#3a3a3a" }, // paper / ink
  { bg: "#DCE5D4", fg: "#4A6741" }, // sage
  { bg: "#E0EAF1", fg: "#2E6B8A" }, // sky blue
  { bg: "#F0E1E8", fg: "#9b5c7a" }, // blush
  { bg: "#EDE4F0", fg: "#6b5b8a" }, // lavender
  { bg: "#FDE9DA", fg: "#b4612d" }, // peach
  { bg: "#E2EDE6", fg: "#3d6b52" }, // mint
];

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function LetterAvatar({ name, src, size = 36, className = "" }: LetterAvatarProps) {
  const trimmed = (name ?? "").trim();
  const letter = (trimmed[0] ?? "?").toUpperCase();
  const { bg, fg } = PALETTE[hashCode(trimmed || "?") % PALETTE.length];
  const style = {
    width: size,
    height: size,
    fontSize: Math.round(size * 0.42),
  };

  if (src) {
    return (
      <img
        src={src}
        alt={trimmed || "avatar"}
        loading="lazy"
        className={`rounded-full object-cover border border-border/60 ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <span
      aria-hidden
      className={`inline-flex items-center justify-center rounded-full font-serif font-medium select-none ${className}`}
      style={{ ...style, backgroundColor: bg, color: fg }}
    >
      {letter}
    </span>
  );
}
