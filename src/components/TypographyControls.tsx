import { useState, useEffect, useRef, useCallback, type CSSProperties } from "react";
import { ChevronDown, Type, ArrowUpDown } from "lucide-react";
import { useLang } from "@/lib/i18n";
import { cn, ACTION_PILL_CLS } from "@/lib/utils";

export type FontSize = "sm" | "md" | "lg" | "xl";
export type LineHeight = "tight" | "normal" | "relaxed" | "wide";

export interface TypoSettings {
  fontSize: FontSize;
  lineHeight: LineHeight;
}

const STORAGE_KEY = "sabbe-satta-typo";

const defaults: TypoSettings = { fontSize: "md", lineHeight: "normal" };

const fontSizes: { key: FontSize; label: string; label_bn: string; px: number }[] = [
  { key: "sm", label: "S", label_bn: "ছোট", px: 14 },
  { key: "md", label: "M", label_bn: "মাঝারি", px: 16 },
  { key: "lg", label: "L", label_bn: "বড়", px: 18 },
  { key: "xl", label: "XL", label_bn: "অতি বড়", px: 20 },
];

const lineHeights: { key: LineHeight; label: string; label_bn: string }[] = [
  { key: "tight", label: "Tight", label_bn: "আঁট" },
  { key: "normal", label: "Normal", label_bn: "স্বাভাবিক" },
  { key: "relaxed", label: "Relaxed", label_bn: "প্রশস্ত" },
  { key: "wide", label: "Wide", label_bn: "বিস্তৃত" },
];

/**
 * Map the profile reading preferences (settings page) onto this control's
 * values so saved preferences actually affect article reading. Returns
 * undefined when the preferences are absent/invalid.
 */
export function mapReadingPrefs(prefs?: {
  font_size?: "sm" | "md" | "lg";
  line_spacing?: "normal" | "relaxed" | "wide";
}): Partial<TypoSettings> | undefined {
  if (!prefs) return undefined;
  const seed: Partial<TypoSettings> = {};
  if (prefs.font_size === "sm" || prefs.font_size === "md" || prefs.font_size === "lg") {
    seed.fontSize = prefs.font_size;
  }
  if (
    prefs.line_spacing === "normal" ||
    prefs.line_spacing === "relaxed" ||
    prefs.line_spacing === "wide"
  ) {
    seed.lineHeight = prefs.line_spacing;
  }
  return Object.keys(seed).length > 0 ? seed : undefined;
}

/** stored (per-article manual choice) always wins over the user-preference seed. */
function loadSettings(userSeed?: Partial<TypoSettings>): TypoSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return { ...defaults, ...userSeed, ...JSON.parse(stored) };
  } catch {
    /* noop */
  }
  return { ...defaults, ...userSeed };
}

/* Article typography is applied via CSS custom properties that `.prose-mitra`
   reads (--article-font-size / --article-line-height). Tailwind text/leading
   utilities on a wrapper do NOT work here: `.prose-mitra` sets explicit
   font-size/line-height, which always beats inherited wrapper styles. */
const fontSizeVar: Record<FontSize, string> = {
  sm: "0.95rem",
  md: "1.18rem",
  lg: "1.4rem",
  xl: "1.6rem",
};

const lineHeightVar: Record<LineHeight, string> = {
  tight: "1.6",
  normal: "1.85",
  relaxed: "2.05",
  wide: "2.25",
};

/**
 * CSS custom properties consumed by `.prose-mitra` for article typography.
 * Shared between the article reader (useTypography) and the live reading
 * preview on /settings so both surfaces render identically.
 */
export function typoCssVars(
  settings: Pick<TypoSettings, "fontSize" | "lineHeight">,
): CSSProperties {
  return {
    "--article-font-size": fontSizeVar[settings.fontSize],
    "--article-line-height": lineHeightVar[settings.lineHeight],
  } as CSSProperties;
}

/**
 * Article typography with an optional user-preference seed (from the
 * profile's saved reading preferences). The seed applies until the reader
 * makes an explicit per-article choice (localStorage override or a manual
 * adjustment), which then wins.
 */
export function useTypography(userSeed?: Partial<TypoSettings>) {
  const [settings, setSettings] = useState<TypoSettings>(() => loadSettings(userSeed));
  const manualOverride = useRef(false);

  // A stored override or a manual adjustment freezes the seed out.
  useEffect(() => {
    try {
      manualOverride.current = !!localStorage.getItem(STORAGE_KEY);
    } catch {
      /* noop */
    }
  }, []);

  // Apply the preference seed whenever it loads/changes — but never fight
  // an explicit per-article choice made via the controls.
  useEffect(() => {
    if (userSeed && !manualOverride.current) {
      setSettings((s) => ({ ...s, ...userSeed }));
    }
  }, [userSeed]);

  // Persist ONLY explicit per-article choices. Seed-applied settings must NOT
  // be written to localStorage — otherwise the next mount would treat them as
  // an override and future preference changes on /settings would be ignored.
  const setSettingsWithOverride = useCallback((next: TypoSettings) => {
    manualOverride.current = true;
    setSettings(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* noop */
    }
  }, []);

  const typoStyle = typoCssVars(settings);

  return { settings, setSettings: setSettingsWithOverride, typoStyle };
}

interface TypographyControlsProps {
  settings: TypoSettings;
  onChange: (s: TypoSettings) => void;
}

export function TypographyControls({ settings, onChange }: TypographyControlsProps) {
  const { lang } = useLang();
  const bn = lang === "bn";
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleClickOutside = useCallback((e: PointerEvent) => {
    if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
      setOpen(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      document.addEventListener("pointerdown", handleClickOutside);
      return () => document.removeEventListener("pointerdown", handleClickOutside);
    }
  }, [open, handleClickOutside]);

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          ACTION_PILL_CLS,
          open ? "text-foreground border-foreground/40 bg-secondary/70 shadow-sm" : "",
        )}
        title={bn ? "টাইপোগ্রাফি সেটিংস" : "Typography settings"}
      >
        <Type className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">{bn ? "লেখা" : "Text"}</span>
        <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 w-64 rounded-xl border border-border/80 bg-popover text-popover-foreground shadow-2xl ring-1 ring-foreground/5 animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="p-4 space-y-4">
              {/* Font Size */}
              <div>
                <p className="text-xs uppercase tracking-[0.15em] font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Type className="h-3 w-3" /> {bn ? "ফন্টের আকার" : "Font Size"}
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
                      {bn ? fs.label_bn : fs.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Line Height */}
              <div>
                <p className="text-xs uppercase tracking-[0.15em] font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                  <ArrowUpDown className="h-3 w-3" /> {bn ? "লাইনের ব্যবধান" : "Line Height"}
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
                      {bn ? lh.label_bn : lh.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
      )}
    </div>
  );
}
