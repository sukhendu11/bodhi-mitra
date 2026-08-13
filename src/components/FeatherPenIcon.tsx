/**
 * FeatherPenIcon — the Reflections mark.
 *
 * Hand-drawn full feather quill + ink writing line, drawn in the lucide
 * style (24×24 viewBox, `stroke="currentColor"`, stroke-width 2, round
 * caps/joins). Unlike a raster image, the SVG inherits `currentColor`, so
 * the same `text-*`/`[&_svg]` tinting that drives every other nav icon's
 * active state (saffron on the current route) applies here too.
 *
 * Accepts the same `className` prop as before so every usage site keeps
 * working: sizing classes (`h-4 w-4`, `h-5 w-5`, …) apply directly to the
 * `<svg>`, and stroke-width utilities (e.g. `stroke-[1.8]`) override the
 * default 2 via CSS.
 */

export function FeatherPenIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`pointer-events-none select-none ${className ?? ""}`}
    >
      {/* Feather vane — left and right silhouettes, tapering to the shaft */}
      <path d="M20 4C14.5 2.8 9 5.8 7.8 10.8c-.5 2 .1 3.9 1.7 4.9" />
      <path d="M20 4c.6 3.3-.9 6.8-3.4 9-1.5 1.3-3.6 2-5.5 1.7" />
      {/* Quill shaft: feather tip → nib */}
      <path d="M20 4 8.5 15.5" />
      {/* Barbs along the vane */}
      <path d="M16.4 7.1c-1.3.1-2.6.4-3.7 1" />
      <path d="M13.8 11c-1.2.5-2.3 1.1-3.3 2" />
      {/* Pen nib */}
      <path d="M8.5 15.5 5.2 18.8" />
      <path d="M8.5 15.5 7 18" />
      {/* Ink writing line */}
      <path d="M4.5 19.5c2.6 1.6 6.8 1.9 10.2.6" />
    </svg>
  );
}
