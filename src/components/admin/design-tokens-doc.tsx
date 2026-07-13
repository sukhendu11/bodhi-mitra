import { useState } from "react";
import { Palette, Type, Move, Box, Radius, Timer, Zap } from "lucide-react";

type TokenCategory = "colors" | "typography" | "spacing" | "shadows" | "radius" | "animations";

const categories: { id: TokenCategory; label: string; icon: typeof Palette }[] = [
  { id: "colors", label: "Colors", icon: Palette },
  { id: "typography", label: "Typography", icon: Type },
  { id: "spacing", label: "Spacing", icon: Move },
  { id: "shadows", label: "Shadows", icon: Box },
  { id: "radius", label: "Border Radius", icon: Radius },
  { id: "animations", label: "Animations", icon: Timer },
];

/* ── Main Component ──────────────────────────────────────────────── */

export function DesignTokensDoc() {
  const [activeTab, setActiveTab] = useState<TokenCategory>("colors");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold tracking-tight flex items-center gap-2">
          <Palette className="h-5 w-5 text-muted-foreground/60" />
          Design Tokens
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          All design tokens available through the theme system. Use Tailwind utility classes to apply.
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex flex-wrap gap-1 p-1 bg-secondary/50 rounded-lg">
        {categories.map((cat) => {
          const Icon = cat.icon;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveTab(cat.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                activeTab === cat.id
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="bg-card border border-border/60 rounded-xl p-6">
        {activeTab === "colors" && <ColorsPanel />}
        {activeTab === "typography" && <TypographyPanel />}
        {activeTab === "spacing" && <SpacingPanel />}
        {activeTab === "shadows" && <ShadowsPanel />}
        {activeTab === "radius" && <RadiusPanel />}
        {activeTab === "animations" && <AnimationsPanel />}
      </div>
    </div>
  );
}

/* ─── Color Swatch ───────────────────────────────────────────────── */

function Swatch({ name, bg, desc, code }: { name: string; bg: string; desc: string; code: string }) {
  return (
    <div className="flex items-center gap-3 border border-border/40 rounded-lg p-3">
      <div className={`w-8 h-8 rounded-md ${bg} border border-border/30 shrink-0`} />
      <div className="min-w-0">
        <p className="text-xs font-medium capitalize">{name}</p>
        <p className="text-[0.55rem] text-muted-foreground">{desc}</p>
        <code className="text-[0.5rem] font-mono text-muted-foreground/60">{code}</code>
      </div>
    </div>
  );
}

/* ─── Colors Panel ───────────────────────────────────────────────── */

function ColorsPanel() {
  return (
    <div className="space-y-8">
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 mb-3">
          Semantic Colors
        </h3>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
          <Swatch name="background" bg="bg-background" desc="Page background" code="bg-background" />
          <Swatch name="foreground" bg="bg-foreground" desc="Primary text" code="text-foreground" />
          <Swatch name="card" bg="bg-card" desc="Card surface" code="bg-card" />
          <Swatch name="card-foreground" bg="bg-card-foreground" desc="Card text" code="text-card-foreground" />
          <Swatch name="primary" bg="bg-primary" desc="Interactive primary" code="bg-primary" />
          <Swatch name="secondary" bg="bg-secondary" desc="Secondary surface" code="bg-secondary" />
          <Swatch name="muted" bg="bg-muted" desc="Muted surface" code="bg-muted" />
          <Swatch name="accent" bg="bg-accent" desc="Accent surface" code="bg-accent" />
          <Swatch name="destructive" bg="bg-destructive" desc="Destructive" code="bg-destructive" />
          <Swatch name="border" bg="bg-border" desc="Border color" code="border-border" />
          <Swatch name="input" bg="bg-input" desc="Input border" code="border-input" />
          <Swatch name="ring" bg="bg-ring" desc="Focus ring" code="ring-ring" />
          <Swatch name="saffron" bg="bg-saffron" desc="Brand accent" code="bg-saffron" />
        </div>
      </section>

      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 mb-3">
          Status Colors
        </h3>
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2 border border-border/40 rounded-lg px-3 py-2">
            <div className="w-4 h-4 rounded-full bg-green-500" />
            <span className="text-xs font-medium">Success</span>
          </div>
          <div className="flex items-center gap-2 border border-border/40 rounded-lg px-3 py-2">
            <div className="w-4 h-4 rounded-full bg-amber-500" />
            <span className="text-xs font-medium">Warning</span>
          </div>
          <div className="flex items-center gap-2 border border-border/40 rounded-lg px-3 py-2">
            <div className="w-4 h-4 rounded-full bg-blue-500" />
            <span className="text-xs font-medium">Info</span>
          </div>
          <div className="flex items-center gap-2 border border-border/40 rounded-lg px-3 py-2">
            <div className="w-4 h-4 rounded-full bg-red-500" />
            <span className="text-xs font-medium">Error</span>
          </div>
        </div>
      </section>

      {/* Saffron Scale */}
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 mb-3">
          Saffron Scale
        </h3>
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-full h-6 rounded bg-saffron-50 border border-border/20" />
            <span className="text-[0.55rem] font-mono text-muted-foreground w-8 shrink-0 text-right">50</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-full h-6 rounded bg-saffron-100 border border-border/20" />
            <span className="text-[0.55rem] font-mono text-muted-foreground w-8 shrink-0 text-right">100</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-full h-6 rounded bg-saffron-200 border border-border/20" />
            <span className="text-[0.55rem] font-mono text-muted-foreground w-8 shrink-0 text-right">200</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-full h-6 rounded bg-saffron-300 border border-border/20" />
            <span className="text-[0.55rem] font-mono text-muted-foreground w-8 shrink-0 text-right">300</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-full h-6 rounded bg-saffron-400 border border-border/20" />
            <span className="text-[0.55rem] font-mono text-muted-foreground w-8 shrink-0 text-right">400</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-full h-6 rounded bg-saffron-500 border border-border/20" />
            <span className="text-[0.55rem] font-mono text-muted-foreground w-8 shrink-0 text-right">500</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-full h-6 rounded bg-saffron-600 border border-border/20" />
            <span className="text-[0.55rem] font-mono text-muted-foreground w-8 shrink-0 text-right">600</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-full h-6 rounded bg-saffron-700 border border-border/20" />
            <span className="text-[0.55rem] font-mono text-muted-foreground w-8 shrink-0 text-right">700</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-full h-6 rounded bg-saffron-800 border border-border/20" />
            <span className="text-[0.55rem] font-mono text-muted-foreground w-8 shrink-0 text-right">800</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-full h-6 rounded bg-saffron-900 border border-border/20" />
            <span className="text-[0.55rem] font-mono text-muted-foreground w-8 shrink-0 text-right">900</span>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ─── Typography Panel ───────────────────────────────────────────── */

function TypographyPanel() {
  return (
    <div className="space-y-8">
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 mb-3">
          Type Scale
        </h3>
        <div className="space-y-3">
          <div className="flex items-center gap-4 border-b border-border/20 pb-3">
            <span className="text-[0.5rem] font-mono text-muted-foreground w-24 shrink-0">xxs (10px)</span>
            <span className="text-[0.625rem]">The quick brown fox</span>
          </div>
          <div className="flex items-center gap-4 border-b border-border/20 pb-3">
            <span className="text-[0.5rem] font-mono text-muted-foreground w-24 shrink-0">xs (12px)</span>
            <span className="text-xs">The quick brown fox</span>
          </div>
          <div className="flex items-center gap-4 border-b border-border/20 pb-3">
            <span className="text-[0.5rem] font-mono text-muted-foreground w-24 shrink-0">sm (14px)</span>
            <span className="text-sm">The quick brown fox</span>
          </div>
          <div className="flex items-center gap-4 border-b border-border/20 pb-3">
            <span className="text-[0.5rem] font-mono text-muted-foreground w-24 shrink-0">base (16px)</span>
            <span className="text-base">The quick brown fox</span>
          </div>
          <div className="flex items-center gap-4 border-b border-border/20 pb-3">
            <span className="text-[0.5rem] font-mono text-muted-foreground w-24 shrink-0">lg (18px)</span>
            <span className="text-lg">The quick brown fox</span>
          </div>
          <div className="flex items-center gap-4 border-b border-border/20 pb-3">
            <span className="text-[0.5rem] font-mono text-muted-foreground w-24 shrink-0">xl (20px)</span>
            <span className="text-xl">The quick brown fox</span>
          </div>
          <div className="flex items-center gap-4 border-b border-border/20 pb-3">
            <span className="text-[0.5rem] font-mono text-muted-foreground w-24 shrink-0">2xl (24px)</span>
            <span className="text-2xl">The quick brown</span>
          </div>
          <div className="flex items-center gap-4 border-b border-border/20 pb-3 last:border-0">
            <span className="text-[0.5rem] font-mono text-muted-foreground w-24 shrink-0">3xl (30px)</span>
            <span className="text-3xl">The quick brown</span>
          </div>
        </div>
      </section>

      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 mb-3">
          Font Families
        </h3>
        <div className="space-y-4">
          <div className="space-y-1">
            <p className="text-[0.5rem] font-semibold uppercase tracking-wider text-muted-foreground/60">Sans</p>
            <p className="font-sans">Inter — The quick brown fox jumps over the lazy dog.</p>
          </div>
          <div className="space-y-1">
            <p className="text-[0.5rem] font-semibold uppercase tracking-wider text-muted-foreground/60">Serif</p>
            <p className="font-serif">Cormorant Garamond — The quick brown fox jumps over the lazy dog.</p>
          </div>
          <div className="space-y-1">
            <p className="text-[0.5rem] font-semibold uppercase tracking-wider text-muted-foreground/60">Mono</p>
            <p className="font-mono">SF Mono — const quickBrownFox = true; return typeof fox;</p>
          </div>
        </div>
      </section>

      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 mb-3">
          Line Heights
        </h3>
        <div className="space-y-3">
          <div className="flex items-start gap-4">
            <span className="text-[0.5rem] font-mono text-muted-foreground w-24 shrink-0 mt-0.5">tight (1.15)</span>
            <p className="text-xs w-64 border border-border/20 rounded p-2 leading-tight">
              Three short lines of text showing how line-height affects readability across multiple lines of content.
            </p>
          </div>
          <div className="flex items-start gap-4">
            <span className="text-[0.5rem] font-mono text-muted-foreground w-24 shrink-0 mt-0.5">snug (1.3)</span>
            <p className="text-xs w-64 border border-border/20 rounded p-2 leading-snug">
              Three short lines of text showing how line-height affects readability across multiple lines of content.
            </p>
          </div>
          <div className="flex items-start gap-4">
            <span className="text-[0.5rem] font-mono text-muted-foreground w-24 shrink-0 mt-0.5">normal (1.5)</span>
            <p className="text-xs w-64 border border-border/20 rounded p-2 leading-normal">
              Three short lines of text showing how line-height affects readability across multiple lines of content.
            </p>
          </div>
          <div className="flex items-start gap-4">
            <span className="text-[0.5rem] font-mono text-muted-foreground w-24 shrink-0 mt-0.5">relaxed (1.625)</span>
            <p className="text-xs w-64 border border-border/20 rounded p-2 leading-relaxed">
              Three short lines of text showing how line-height affects readability across multiple lines of content.
            </p>
          </div>
          <div className="flex items-start gap-4">
            <span className="text-[0.5rem] font-mono text-muted-foreground w-24 shrink-0 mt-0.5">loose (2)</span>
            <p className="text-xs w-64 border border-border/20 rounded p-2 leading-loose">
              Three short lines of text showing how line-height affects readability across multiple lines of content.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ─── Spacing Panel ──────────────────────────────────────────────── */

function SpacingPanel() {
  return (
    <section>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 mb-4">
        Spacing Scale
      </h3>
      <div className="space-y-2">
        <div className="flex items-center gap-4">
          <span className="text-[0.5rem] font-mono text-muted-foreground w-20 shrink-0">1 (4px)</span>
          <div className="w-1 h-1 bg-saffron/20 rounded border border-saffron/30" />
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[0.5rem] font-mono text-muted-foreground w-20 shrink-0">2 (8px)</span>
          <div className="w-2 h-2 bg-saffron/20 rounded border border-saffron/30" />
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[0.5rem] font-mono text-muted-foreground w-20 shrink-0">3 (12px)</span>
          <div className="w-3 h-3 bg-saffron/20 rounded border border-saffron/30" />
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[0.5rem] font-mono text-muted-foreground w-20 shrink-0">4 (16px)</span>
          <div className="w-4 h-4 bg-saffron/20 rounded border border-saffron/30" />
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[0.5rem] font-mono text-muted-foreground w-20 shrink-0">5 (20px)</span>
          <div className="w-5 h-5 bg-saffron/20 rounded border border-saffron/30" />
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[0.5rem] font-mono text-muted-foreground w-20 shrink-0">6 (24px)</span>
          <div className="w-6 h-6 bg-saffron/20 rounded border border-saffron/30" />
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[0.5rem] font-mono text-muted-foreground w-20 shrink-0">8 (32px)</span>
          <div className="w-8 h-8 bg-saffron/20 rounded border border-saffron/30" />
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[0.5rem] font-mono text-muted-foreground w-20 shrink-0">10 (40px)</span>
          <div className="w-10 h-10 bg-saffron/20 rounded border border-saffron/30" />
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[0.5rem] font-mono text-muted-foreground w-20 shrink-0">12 (48px)</span>
          <div className="w-12 h-12 bg-saffron/20 rounded border border-saffron/30" />
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[0.5rem] font-mono text-muted-foreground w-20 shrink-0">16 (64px)</span>
          <div className="w-16 h-16 bg-saffron/20 rounded border border-saffron/30" />
        </div>
      </div>
    </section>
  );
}

/* ─── Shadows Panel ──────────────────────────────────────────────── */

function ShadowsPanel() {
  return (
    <section>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 mb-4">
        Elevation Shadows
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="h-24 rounded-lg bg-card border border-border/40 flex items-center justify-center shadow-xs">
          <span className="text-xs font-mono text-muted-foreground">xs</span>
        </div>
        <div className="h-24 rounded-lg bg-card border border-border/40 flex items-center justify-center shadow-sm">
          <span className="text-xs font-mono text-muted-foreground">sm</span>
        </div>
        <div className="h-24 rounded-lg bg-card border border-border/40 flex items-center justify-center shadow-md">
          <span className="text-xs font-mono text-muted-foreground">md</span>
        </div>
        <div className="h-24 rounded-lg bg-card border border-border/40 flex items-center justify-center shadow-lg">
          <span className="text-xs font-mono text-muted-foreground">lg</span>
        </div>
        <div className="h-24 rounded-lg bg-card border border-border/40 flex items-center justify-center shadow-xl">
          <span className="text-xs font-mono text-muted-foreground">xl</span>
        </div>
        <div className="h-24 rounded-lg bg-card border border-border/40 flex items-center justify-center shadow-2xl">
          <span className="text-xs font-mono text-muted-foreground">2xl</span>
        </div>
      </div>
    </section>
  );
}

/* ─── Radius Panel ───────────────────────────────────────────────── */

function RadiusPanel() {
  return (
    <section>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 mb-4">
        Border Radius
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-16 h-16 bg-saffron/20 border border-saffron/30 rounded-xs" />
          <span className="text-[0.55rem] font-mono text-muted-foreground">xs</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <div className="w-16 h-16 bg-saffron/20 border border-saffron/30 rounded-sm" />
          <span className="text-[0.55rem] font-mono text-muted-foreground">sm</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <div className="w-16 h-16 bg-saffron/20 border border-saffron/30 rounded-md" />
          <span className="text-[0.55rem] font-mono text-muted-foreground">md</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <div className="w-16 h-16 bg-saffron/20 border border-saffron/30 rounded-lg" />
          <span className="text-[0.55rem] font-mono text-muted-foreground">lg</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <div className="w-16 h-16 bg-saffron/20 border border-saffron/30 rounded-xl" />
          <span className="text-[0.55rem] font-mono text-muted-foreground">xl</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <div className="w-16 h-16 bg-saffron/20 border border-saffron/30 rounded-2xl" />
          <span className="text-[0.55rem] font-mono text-muted-foreground">2xl</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <div className="w-16 h-16 bg-saffron/20 border border-saffron/30 rounded-3xl" />
          <span className="text-[0.55rem] font-mono text-muted-foreground">3xl</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <div className="w-16 h-16 bg-saffron/20 border border-saffron/30 rounded-full" />
          <span className="text-[0.55rem] font-mono text-muted-foreground">full</span>
        </div>
      </div>
    </section>
  );
}

/* ─── Animations Panel ───────────────────────────────────────────── */

function AnimationsPanel() {
  return (
    <section>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 mb-4">
        Animation Tokens
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="h-16 rounded-lg bg-card border border-border/40 flex flex-col items-center justify-center animate-fade-in">
          <Zap className="h-5 w-5 text-saffron" />
          <span className="text-[0.5rem] font-mono text-muted-foreground mt-1">fade-in</span>
        </div>
        <div className="h-16 rounded-lg bg-card border border-border/40 flex flex-col items-center justify-center animate-slide-in">
          <Zap className="h-5 w-5 text-saffron" />
          <span className="text-[0.5rem] font-mono text-muted-foreground mt-1">slide-in</span>
        </div>
        <div className="h-16 rounded-lg bg-card border border-border/40 flex flex-col items-center justify-center animate-scale-in">
          <Zap className="h-5 w-5 text-saffron" />
          <span className="text-[0.5rem] font-mono text-muted-foreground mt-1">scale-in</span>
        </div>
        <div className="h-16 rounded-lg bg-card border border-border/40 flex flex-col items-center justify-center animate-shimmer">
          <Zap className="h-5 w-5 text-saffron" />
          <span className="text-[0.5rem] font-mono text-muted-foreground mt-1">shimmer</span>
        </div>
        <div className="h-16 rounded-lg bg-card border border-border/40 flex flex-col items-center justify-center animate-spin-slow">
          <Zap className="h-5 w-5 text-saffron" />
          <span className="text-[0.5rem] font-mono text-muted-foreground mt-1">spin-slow</span>
        </div>
        <div className="h-16 rounded-lg bg-card border border-border/40 flex flex-col items-center justify-center animate-pulse-soft">
          <Zap className="h-5 w-5 text-saffron" />
          <span className="text-[0.5rem] font-mono text-muted-foreground mt-1">pulse-soft</span>
        </div>
        <div className="h-16 rounded-lg bg-card border border-border/40 flex flex-col items-center justify-center animate-bounce-subtle">
          <Zap className="h-5 w-5 text-saffron" />
          <span className="text-[0.5rem] font-mono text-muted-foreground mt-1">bounce-subtle</span>
        </div>
        <div className="h-16 rounded-lg bg-card border border-border/40 flex flex-col items-center justify-center animate-spin">
          <Zap className="h-5 w-5 text-saffron" />
          <span className="text-[0.5rem] font-mono text-muted-foreground mt-1">spin</span>
        </div>
        <div className="h-16 rounded-lg bg-card border border-border/40 flex flex-col items-center justify-center animate-pulse">
          <Zap className="h-5 w-5 text-saffron" />
          <span className="text-[0.5rem] font-mono text-muted-foreground mt-1">pulse</span>
        </div>
      </div>
    </section>
  );
}
