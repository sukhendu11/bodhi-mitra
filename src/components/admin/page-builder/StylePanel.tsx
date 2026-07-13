// ============================================================================
// Page Builder — Style Panel (visual style controls)
// ============================================================================

import React, { useCallback } from "react";
import type { BuilderComponentNode, StyleProps, BackgroundGradient, BackgroundGradientStop } from "@/lib/page-builder/types";
import { gradientToCss } from "./DefaultComponents";

/* ─── Props ────────────────────────────────────────────────────────── */

interface StylePanelProps {
  node: BuilderComponentNode;
  onUpdateStyles: (id: string, styles: Partial<StyleProps>) => void;
}

/* ─── Style Row Wrapper ────────────────────────────────────────────── */

function StyleRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[0.5rem] font-medium text-muted-foreground min-w-[60px]">{label}</span>
      <div className="flex items-center gap-1 flex-1">{children}</div>
    </div>
  );
}

function StyleSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h5 className="text-[0.5rem] font-semibold text-muted-foreground uppercase tracking-[0.08em]">
        {title}
      </h5>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

/* ─── Style Inputs ─────────────────────────────────────────────────── */

function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="text"
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-2 py-1 text-[0.5rem] border border-border/40 rounded-md bg-background focus:outline-none focus:border-foreground/40 font-mono"
    />
  );
}

function ColorInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-1 flex-1">
      <input
        type="color"
        value={value || "#000000"}
        onChange={(e) => onChange(e.target.value)}
        className="w-7 h-7 rounded border border-border/40 cursor-pointer bg-background shrink-0"
      />
      <input
        type="text"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder="#000000"
        className="w-full px-2 py-1 text-[0.5rem] border border-border/40 rounded-md bg-background focus:outline-none focus:border-foreground/40 font-mono"
      />
    </div>
  );
}

function SelectInput({
  value,
  options,
  onChange,
}: {
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (v: string) => void;
}) {
  return (
    <select
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-2 py-1 text-[0.5rem] border border-border/40 rounded-md bg-background focus:outline-none focus:border-foreground/40"
    >
      <option value="">Default</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );
}

/* ─── Style Panel ──────────────────────────────────────────────────── */

export function StylePanel({ node, onUpdateStyles }: StylePanelProps) {
  const update = useCallback(
    (key: keyof StyleProps, value: string | number | BackgroundGradient | undefined) => {
      if (typeof value === "object" && value !== null) {
        onUpdateStyles(node.id, { [key]: value });
      } else {
        onUpdateStyles(node.id, { [key]: (value as string | number | undefined) || undefined });
      }
    },
    [node.id, onUpdateStyles],
  );

  const s = node.styles;
  // Pre-compute gradient CSS to avoid TS narrowing issues inside JSX
  const bgGrad = s.backgroundGradient;
  const gradientPreviewCss = bgGrad ? gradientToCss(bgGrad) : undefined;

  return (
    <div className="space-y-4 divide-y divide-border/40">
      {/* Typography */}
      <StyleSection title="Typography">
        <StyleRow label="Font">
          <SelectInput
            value={s.fontFamily || ""}
            options={[
              { value: "Inter, sans-serif", label: "Inter" },
              { value: "Georgia, serif", label: "Georgia" },
              { value: "system-ui, sans-serif", label: "System UI" },
            ]}
            onChange={(v) => update("fontFamily", v)}
          />
        </StyleRow>
        <StyleRow label="Size">
          <TextInput value={s.fontSize || ""} onChange={(v) => update("fontSize", v)} placeholder="1rem" />
        </StyleRow>
        <StyleRow label="Weight">
          <SelectInput
            value={s.fontWeight || ""}
            options={[
              { value: "400", label: "Normal" },
              { value: "500", label: "Medium" },
              { value: "600", label: "Semibold" },
              { value: "700", label: "Bold" },
            ]}
            onChange={(v) => update("fontWeight", v)}
          />
        </StyleRow>
        <StyleRow label="Align">
          <SelectInput
            value={s.textAlign || ""}
            options={[
              { value: "left", label: "Left" },
              { value: "center", label: "Center" },
              { value: "right", label: "Right" },
              { value: "justify", label: "Justify" },
            ]}
            onChange={(v) => update("textAlign", v)}
          />
        </StyleRow>
        <StyleRow label="Line H">
          <TextInput value={s.lineHeight || ""} onChange={(v) => update("lineHeight", v)} placeholder="1.5" />
        </StyleRow>
        <StyleRow label="Spacing">
          <TextInput value={s.letterSpacing || ""} onChange={(v) => update("letterSpacing", v)} placeholder="0" />
        </StyleRow>
      </StyleSection>

      {/* Colors */}
      <StyleSection title="Colors">
        <StyleRow label="Text">
          <ColorInput value={s.color || ""} onChange={(v) => update("color", v)} />
        </StyleRow>
        <StyleRow label="Bg">
          <ColorInput value={s.backgroundColor || ""} onChange={(v) => update("backgroundColor", v)} />
        </StyleRow>
      </StyleSection>

      {/* Background Gradient */}
      <StyleSection title="Background">
        <StyleRow label="Type">
          <SelectInput
            value={s.backgroundGradient ? "gradient" : s.backgroundColor ? "solid" : "none"}
            options={[
              { value: "none", label: "None" },
              { value: "solid", label: "Solid Color" },
              { value: "gradient", label: "Gradient" },
            ]}
            onChange={(v) => {
              if (v === "gradient") {
                // Initialize gradient with default stops
                const grad: BackgroundGradient = {
                  type: "linear",
                  direction: "to bottom right",
                  stops: [
                    { color: s.backgroundColor || "#6366f1", position: 0 },
                    { color: "#a855f7", position: 100 },
                  ],
                };
                update("backgroundGradient", grad);
              } else if (v === "solid") {
                update("backgroundGradient", undefined);
                if (!s.backgroundColor) update("backgroundColor", "#f8fafc");
              } else {
                // None
                update("backgroundGradient", undefined);
                update("backgroundColor", undefined);
              }
            }}
          />
        </StyleRow>

        {s.backgroundGradient && (
          <>
            <StyleRow label="Gradient">
              <SelectInput
                value={s.backgroundGradient.type}
                options={[
                  { value: "linear", label: "Linear" },
                  { value: "radial", label: "Radial" },
                ]}
                onChange={(v) => {
                  const grad = { ...s.backgroundGradient!, type: v as "linear" | "radial" };
                  if (v === "radial" && !grad.direction) grad.direction = "ellipse at center";
                  if (v === "linear" && grad.direction?.includes("ellipse")) grad.direction = "to bottom right";
                  update("backgroundGradient", grad);
                }}
              />
            </StyleRow>
            <StyleRow label={s.backgroundGradient.type === "radial" ? "Shape" : "Angle"}>
              <TextInput
                value={s.backgroundGradient.direction || (s.backgroundGradient.type === "radial" ? "ellipse at center" : "to bottom right")}
                onChange={(v) => {
                  const grad = { ...s.backgroundGradient!, direction: v || undefined };
                  update("backgroundGradient", grad);
                }}
                placeholder={s.backgroundGradient.type === "radial" ? "ellipse at center" : "45deg"}
              />
            </StyleRow>

            {/* Quick direction buttons */}
            {s.backgroundGradient.type === "linear" && (
              <div className="flex flex-wrap gap-1 px-1">
                {[
                  { label: "↘", value: "to bottom right" },
                  { label: "↓", value: "to bottom" },
                  { label: "↙", value: "to bottom left" },
                  { label: "→", value: "to right" },
                  { label: "←", value: "to left" },
                  { label: "↗", value: "to top right" },
                  { label: "↑", value: "to top" },
                  { label: "↖", value: "to top left" },
                ].map((d) => (
                  <button
                    key={d.value}
                    onClick={() => {
                      const grad = { ...s.backgroundGradient!, direction: d.value };
                      update("backgroundGradient", grad);
                    }}
                  className={`px-1.5 py-0.5 text-[0.4rem] rounded border transition-colors ${
                      s.backgroundGradient?.direction === d.value
                        ? "border-foreground/60 bg-foreground/10 text-foreground"
                        : "border-border/40 text-muted-foreground/60 hover:text-foreground hover:border-foreground/30"
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            )}

            {/* Color stops */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-[0.5rem] font-medium text-muted-foreground">Stops</span>
                <button
                  onClick={() => {
                    const stops = [...(s.backgroundGradient?.stops || [])];
                    const lastColor = stops.length > 0 ? stops[stops.length - 1].color : "#000000";
                    stops.push({ color: lastColor, position: Math.min((stops.length * 33), 100) });
                    const grad = { ...s.backgroundGradient!, stops };
                    update("backgroundGradient", grad);
                  }}
                  className="text-[0.45rem] font-medium text-muted-foreground/60 hover:text-foreground px-1.5 py-0.5 rounded hover:bg-secondary/40 transition-colors"
                >
                  + Add stop
                </button>
              </div>
              {s.backgroundGradient.stops.map((stop: BackgroundGradientStop, i: number) => (
                <div key={i} className="flex items-center gap-1.5">
                  <input
                    type="color"
                    value={stop.color || "#000000"}
                    onChange={(e) => {
                      const stops = [...s.backgroundGradient!.stops];
                      stops[i] = { ...stops[i], color: e.target.value };
                      const grad = { ...s.backgroundGradient!, stops };
                      update("backgroundGradient", grad);
                    }}
                    className="w-6 h-6 rounded border border-border/40 cursor-pointer bg-background shrink-0"
                  />
                  <input
                    type="text"
                    value={stop.color || ""}
                    onChange={(e) => {
                      const stops = [...s.backgroundGradient!.stops];
                      stops[i] = { ...stops[i], color: e.target.value };
                      const grad = { ...s.backgroundGradient!, stops };
                      update("backgroundGradient", grad);
                    }}
                    placeholder="#000000"
                    className="w-full px-1.5 py-1 text-[0.45rem] border border-border/40 rounded-md bg-background focus:outline-none focus:border-foreground/40 font-mono"
                  />
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={stop.position ?? i * 50}
                    onChange={(e) => {
                      const stops = [...s.backgroundGradient!.stops];
                      stops[i] = { ...stops[i], position: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)) };
                      const grad = { ...s.backgroundGradient!, stops };
                      update("backgroundGradient", grad);
                    }}
                    className="w-10 px-1 py-1 text-[0.45rem] border border-border/40 rounded-md bg-background focus:outline-none focus:border-foreground/40 font-mono text-center"
                    placeholder="%"
                  />
                  {s.backgroundGradient!.stops.length > 2 && (
                    <button
                      onClick={() => {
                        const stops = s.backgroundGradient!.stops.filter((_: any, idx: number) => idx !== i);
                        const grad = { ...s.backgroundGradient!, stops };
                        update("backgroundGradient", grad);
                      }}
                      className="p-0.5 rounded text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                      title="Remove stop"
                    >
                      <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Live gradient preview */}
            <div
              className="h-8 rounded-lg border border-border/40"
              style={{
                background: gradientPreviewCss || "none",
              }}
            />
          </>
        )}
      </StyleSection>

      {/* Spacing */}
      <StyleSection title="Spacing">
        <StyleRow label="Margin">
          <TextInput value={s.marginTop || ""} onChange={(v) => update("marginTop", v)} placeholder="T" />
          <TextInput value={s.marginRight || ""} onChange={(v) => update("marginRight", v)} placeholder="R" />
          <TextInput value={s.marginBottom || ""} onChange={(v) => update("marginBottom", v)} placeholder="B" />
          <TextInput value={s.marginLeft || ""} onChange={(v) => update("marginLeft", v)} placeholder="L" />
        </StyleRow>
        <StyleRow label="Padding">
          <TextInput value={s.paddingTop || ""} onChange={(v) => update("paddingTop", v)} placeholder="T" />
          <TextInput value={s.paddingRight || ""} onChange={(v) => update("paddingRight", v)} placeholder="R" />
          <TextInput value={s.paddingBottom || ""} onChange={(v) => update("paddingBottom", v)} placeholder="B" />
          <TextInput value={s.paddingLeft || ""} onChange={(v) => update("paddingLeft", v)} placeholder="L" />
        </StyleRow>
        <StyleRow label="Gap">
          <TextInput value={s.gap || ""} onChange={(v) => update("gap", v)} placeholder="1rem" />
        </StyleRow>
      </StyleSection>

      {/* Sizing */}
      <StyleSection title="Sizing">
        <StyleRow label="Width">
          <TextInput value={s.width || ""} onChange={(v) => update("width", v)} placeholder="100%" />
        </StyleRow>
        <StyleRow label="Height">
          <TextInput value={s.height || ""} onChange={(v) => update("height", v)} placeholder="auto" />
        </StyleRow>
        <StyleRow label="Max W">
          <TextInput value={s.maxWidth || ""} onChange={(v) => update("maxWidth", v)} placeholder="1200px" />
        </StyleRow>
        <StyleRow label="Min H">
          <TextInput value={s.minHeight || ""} onChange={(v) => update("minHeight", v)} placeholder="" />
        </StyleRow>
      </StyleSection>

      {/* Borders */}
      <StyleSection title="Borders">
        <StyleRow label="Width">
          <TextInput value={s.borderWidth || ""} onChange={(v) => update("borderWidth", v)} placeholder="0" />
        </StyleRow>
        <StyleRow label="Style">
          <SelectInput
            value={s.borderStyle || ""}
            options={[
              { value: "solid", label: "Solid" },
              { value: "dashed", label: "Dashed" },
              { value: "dotted", label: "Dotted" },
              { value: "none", label: "None" },
            ]}
            onChange={(v) => update("borderStyle", v === "none" ? "none" : v)}
          />
        </StyleRow>
        <StyleRow label="Color">
          <ColorInput value={s.borderColor || ""} onChange={(v) => update("borderColor", v)} />
        </StyleRow>
        <StyleRow label="Radius">
          <TextInput value={s.borderRadius || ""} onChange={(v) => update("borderRadius", v)} placeholder="0" />
        </StyleRow>
      </StyleSection>

      {/* Shadows */}
      <StyleSection title="Shadows">
        <StyleRow label="Shadow">
          <SelectInput
            value={s.boxShadow || ""}
            options={[
              { value: "0 1px 3px oklch(0 0 0 / 0.1)", label: "Small" },
              { value: "0 4px 12px oklch(0 0 0 / 0.1)", label: "Medium" },
              { value: "0 10px 30px oklch(0 0 0 / 0.1)", label: "Large" },
              { value: "none", label: "None" },
            ]}
            onChange={(v) => update("boxShadow", v === "none" ? "none" : v)}
          />
        </StyleRow>
      </StyleSection>

      {/* Flex */}
      <StyleSection title="Flex">
        <StyleRow label="Display">
          <SelectInput
            value={s.display || ""}
            options={[
              { value: "flex", label: "Flex" },
              { value: "grid", label: "Grid" },
              { value: "block", label: "Block" },
              { value: "inline-block", label: "Inline" },
              { value: "none", label: "None" },
            ]}
            onChange={(v) => update("display", v)}
          />
        </StyleRow>
        <StyleRow label="Direction">
          <SelectInput
            value={s.flexDirection || ""}
            options={[
              { value: "row", label: "Row" },
              { value: "column", label: "Column" },
              { value: "row-reverse", label: "Row Rev" },
              { value: "column-reverse", label: "Col Rev" },
            ]}
            onChange={(v) => update("flexDirection", v)}
          />
        </StyleRow>
        <StyleRow label="Align">
          <SelectInput
            value={s.alignItems || ""}
            options={[
              { value: "flex-start", label: "Start" },
              { value: "center", label: "Center" },
              { value: "flex-end", label: "End" },
              { value: "stretch", label: "Stretch" },
            ]}
            onChange={(v) => update("alignItems", v)}
          />
        </StyleRow>
        <StyleRow label="Justify">
          <SelectInput
            value={s.justifyContent || ""}
            options={[
              { value: "flex-start", label: "Start" },
              { value: "center", label: "Center" },
              { value: "flex-end", label: "End" },
              { value: "space-between", label: "Between" },
              { value: "space-around", label: "Around" },
            ]}
            onChange={(v) => update("justifyContent", v)}
          />
        </StyleRow>
        <StyleRow label="Wrap">
          <SelectInput
            value={s.flexWrap || ""}
            options={[
              { value: "nowrap", label: "No Wrap" },
              { value: "wrap", label: "Wrap" },
            ]}
            onChange={(v) => update("flexWrap", v)}
          />
        </StyleRow>
      </StyleSection>

      {/* Position */}
      <StyleSection title="Position">
        <StyleRow label="Position">
          <SelectInput
            value={s.position || ""}
            options={[
              { value: "relative", label: "Relative" },
              { value: "absolute", label: "Absolute" },
              { value: "fixed", label: "Fixed" },
              { value: "sticky", label: "Sticky" },
              { value: "static", label: "Static" },
            ]}
            onChange={(v) => update("position", v)}
          />
        </StyleRow>
        <StyleRow label="Z-Index">
          <TextInput value={String(s.zIndex || "")} onChange={(v) => update("zIndex", parseInt(v) || 0)} />
        </StyleRow>
        <StyleRow label="Opacity">
          <TextInput value={String(s.opacity || "")} onChange={(v) => update("opacity", parseFloat(v) || 1)} placeholder="1" />
        </StyleRow>
      </StyleSection>

      {/* Animation — Keyframe Presets */}
      <StyleSection title="Animation">
        <StyleRow label="Keyframe">
          <SelectInput
            value={s.animationName || ""}
            options={[
              { value: "fadeIn", label: "Fade In" },
              { value: "slideIn", label: "Slide In" },
              { value: "bounce", label: "Bounce" },
              { value: "pulse", label: "Pulse" },
              { value: "rotate", label: "Rotate" },
              { value: "scaleIn", label: "Scale In" },
              { value: "shake", label: "Shake" },
              { value: "float", label: "Float" },
              { value: "wiggle", label: "Wiggle" },
            ]}
            onChange={(v) => {
              update("animationName", v || undefined);
              // Auto-set sensible defaults
              if (v && !s.animationDuration) update("animationDuration", "0.6s");
              if (v && !s.animationTimingFunction) update("animationTimingFunction", "ease-out");
              if (!v) {
                update("animationDuration", undefined);
                update("animationTimingFunction", undefined);
                update("animationDelay", undefined);
                update("animationIterationCount", undefined);
                update("animationFillMode", undefined);
              }
            }}
          />
        </StyleRow>
        {s.animationName && (
          <>
            <StyleRow label="Duration">
              <TextInput value={s.animationDuration || "0.6s"} onChange={(v) => update("animationDuration", v)} placeholder="0.6s" />
            </StyleRow>
            <StyleRow label="Easing">
              <SelectInput
                value={s.animationTimingFunction || "ease-out"}
                options={[
                  { value: "ease", label: "Ease" },
                  { value: "ease-in", label: "Ease In" },
                  { value: "ease-out", label: "Ease Out" },
                  { value: "ease-in-out", label: "Ease In-Out" },
                  { value: "linear", label: "Linear" },
                  { value: "cubic-bezier(0.68, -0.55, 0.27, 1.55)", label: "Bounce Out" },
                ]}
                onChange={(v) => update("animationTimingFunction", v)}
              />
            </StyleRow>
            <StyleRow label="Delay">
              <TextInput value={s.animationDelay || ""} onChange={(v) => update("animationDelay", v)} placeholder="0s" />
            </StyleRow>
            <StyleRow label="Repeat">
              <SelectInput
                value={s.animationIterationCount || "1"}
                options={[
                  { value: "1", label: "Once" },
                  { value: "2", label: "Twice" },
                  { value: "3", label: "3 Times" },
                  { value: "infinite", label: "Infinite" },
                ]}
                onChange={(v) => update("animationIterationCount", v)}
              />
            </StyleRow>
            <StyleRow label="Fill">
              <SelectInput
                value={s.animationFillMode || "forwards"}
                options={[
                  { value: "none", label: "None" },
                  { value: "forwards", label: "Forwards" },
                  { value: "backwards", label: "Backwards" },
                  { value: "both", label: "Both" },
                ]}
                onChange={(v) => update("animationFillMode", v)}
              />
            </StyleRow>
            {/* Live animation preview icon */}
            <div
              className="h-8 rounded-lg border border-border/40 flex items-center justify-center overflow-hidden bg-gradient-to-r from-zinc-50 to-zinc-100 dark:from-zinc-800 dark:to-zinc-700"
            >
              <div
                className="w-4 h-4 rounded bg-foreground/20"
                style={{
                  animationName: `pb-${s.animationName}`,
                  animationDuration: s.animationDuration || "0.6s",
                  animationTimingFunction: s.animationTimingFunction || "ease-out",
                  animationIterationCount: s.animationIterationCount || "1",
                  animationFillMode: s.animationFillMode || "forwards",
                  animationDelay: s.animationDelay || "0s",
                }}
              />
            </div>
          </>
        )}
      </StyleSection>

      {/* Hover Effects */}
      <StyleSection title="Hover">
        <StyleRow label="Scale">
          <SelectInput
            value={(() => {
              const match = s.hoverTransform?.match(/^scale\(([\d.]+)\)$/);
              return match ? match[1] : "";
            })()}
            options={[
              { value: "1.02", label: "+2%" },
              { value: "1.05", label: "+5%" },
              { value: "1.1", label: "+10%" },
              { value: "0.95", label: "-5%" },
            ]}
            onChange={(v) => {
              update("hoverTransform", v ? `scale(${v})` : undefined);
            }}
          />
        </StyleRow>
        <StyleRow label="Shadow">
          <SelectInput
            value={s.hoverBoxShadow || ""}
            options={[
              { value: "0 4px 12px oklch(0 0 0 / 0.1)", label: "Small" },
              { value: "0 8px 24px oklch(0 0 0 / 0.15)", label: "Medium" },
              { value: "0 12px 40px oklch(0 0 0 / 0.2)", label: "Large" },
              { value: "0 20px 60px oklch(0 0 0 / 0.25)", label: "X-Large" },
            ]}
            onChange={(v) => update("hoverBoxShadow", v || undefined)}
          />
        </StyleRow>
        <StyleRow label="Bg">
          <ColorInput value={s.hoverBackgroundColor || ""} onChange={(v) => update("hoverBackgroundColor", v || undefined)} />
        </StyleRow>
        <StyleRow label="Text">
          <ColorInput value={s.hoverColor || ""} onChange={(v) => update("hoverColor", v || undefined)} />
        </StyleRow>
        <StyleRow label="Border">
          <ColorInput value={s.hoverBorderColor || ""} onChange={(v) => update("hoverBorderColor", v || undefined)} />
        </StyleRow>
      </StyleSection>
    </div>
  );
}
