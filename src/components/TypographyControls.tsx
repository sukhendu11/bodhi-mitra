import { useState, useEffect } from "react";
import { ChevronDown, Type, ArrowUpDown } from "lucide-react";

type FontSize = "sm" | "md" | "lg" | "xl";
type LineHeight = "tight" | "normal" | "relaxed";

const STORAGE_KEY = "bodhi-mitra-typo";

interface TypoSettings {
  fontSize: FontSize;
  lineHeight: LineHeight;
}

const defaults: TypoSettings = { fontSize: "md", lineHeight: "normal" };

const fontSizes: { key: FontSize; label: string; px: number }[] = [
  { key: "sm", label: "S", px: 14 },
  { key: "md", label: "M", px: 16 },
  { key: "lg", label: "L", px: 18 },
  { key: "xl", label: "XL", px: 20 },
];

const lineHeights: { key: LineHeight; label: string }[] = [
  { key: "tight", label: "Tight" },
  { key: "normal", label: "Normal" },
  { key: "relaxed", label: "Relaxed" },
];

function loadSettings(): TypoSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return { ...defaults, ...JSON.parse(stored) };
  } catch { /* noop */ }
  return defaults;
}

const fontSizeMap: Record<FontSize, string> = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg",
  xl: "text-xl",
};

const lineHeightMap: Record<LineHeight, string> = {
  tight: "leading-tight",
  normal: "leading-normal",
  relaxed: "leading-relaxed",
};

export function useTypography() {
  const [settings, setSettings] = useState<TypoSettings>(loadSettings);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch { /* noop */ }
  }, [settings]);

  const typoClass = `${fontSizeMap[settings.fontSize]} ${lineHeightMap[settings.lineHeight]}`;

  return { settings, setSettings, typoClass };
}

interface TypographyControlsProps {
  settings: TypoSettings;
  onChange: (s: TypoSettings) => void;
}

export function TypographyControls({ settings, onChange }: TypographyControlsProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.12em] text-muted-foreground hover:text-foreground transition-colors"
        title="Typography settings"
      >
        <Type className="h-3.5 w-3.5" />
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 z-50 w-64 border border-border/60 bg-background shadow-lg">
            <div className="p-4 space-y-4">
              {/* Font Size */}
              <div>
                <p className="text-[0.6rem] uppercase tracking-[0.15em] font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Type className="h-3 w-3" /> Font Size
                </p>
                <div className="flex gap-1">
                  {fontSizes.map((fs) => (
                    <button
                      key={fs.key}
                      onClick={() => onChange({ ...settings, fontSize: fs.key })}
                      className={`flex-1 py-1.5 text-xs font-medium border transition-colors ${
                        settings.fontSize === fs.key
                          ? "border-foreground text-foreground bg-foreground/5"
                          : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/40"
                      }`}
                    >
                      {fs.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Line Height */}
              <div>
                <p className="text-[0.6rem] uppercase tracking-[0.15em] font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                  <ArrowUpDown className="h-3 w-3" /> Line Height
                </p>
                <div className="flex gap-1">
                  {lineHeights.map((lh) => (
                    <button
                      key={lh.key}
                      onClick={() => onChange({ ...settings, lineHeight: lh.key })}
                      className={`flex-1 py-1.5 text-xs font-medium border transition-colors ${
                        settings.lineHeight === lh.key
                          ? "border-foreground text-foreground bg-foreground/5"
                          : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/40"
                      }`}
                    >
                      {lh.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
