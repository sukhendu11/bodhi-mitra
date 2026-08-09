/**
 * LotusIcon — Donate button icon with a bloom-on-hover crossfade.
 *
 * **Initial state** — the Flaticon "Lotus" icon (#7373599), stored at
 * `public/icons/lotus-bud.png`. It is a solid black filled silhouette, so a
 * `.dark` invert filter keeps it theme-aware.
 *
 * **Hover state** — the Flaticon "Lotus flower" icon (#1419204), stored at
 * `public/icons/lotus-flower.png`. It is a solid black filled silhouette,
 * so a `.dark` invert filter keeps it theme-aware.
 *
 * The resting bud renders at 28px (`h-[28px] w-[28px]`). On hover the two
 * layers crossfade while the incoming bloom grows to 29.5px (scale 1.054,
 * 1.5px larger than the bud) — a smooth, subtle bud-to-flower feel that
 * fits the header's other micro-interactions (no rotation, no bounce).
 *
 * Parent must carry the `group` class. `prefers-reduced-motion` disables the
 * transitions.
 */

const ICON_CSS = `
  .lotus-root {
    transition: transform 400ms cubic-bezier(0.4, 0, 0.2, 1);
  }
  .group:hover .lotus-root {
    transform: translateY(-1px);
  }

  .lotus-base {
    opacity: 1;
    transition: opacity 300ms cubic-bezier(0.4, 0, 0.2, 1);
  }
  .group:hover .lotus-base {
    opacity: 0;
  }

  .lotus-hover {
    opacity: 0;
    transform: scale(0.92);
    transition:
      opacity 300ms cubic-bezier(0.4, 0, 0.2, 1),
      transform 400ms cubic-bezier(0.4, 0, 0.2, 1);
  }
  .group:hover .lotus-hover {
    opacity: 1;
    /* 28px * 1.054 ≈ 29.5px — the bloom is 1.5px larger than the bud */
    transform: scale(1.054);
  }

  /* Flaticon PNGs are solid black silhouettes — invert in dark mode */
  .dark .lotus-base,
  .dark .lotus-hover {
    filter: invert(1);
  }

  @media (prefers-reduced-motion: reduce) {
    .lotus-root, .lotus-base, .lotus-hover {
      transition-duration: 0ms !important;
    }
  }
`;

export function LotusIcon({ size = 28, className = "" }: { size?: number; className?: string }) {
  return (
    <span
      className={`relative block lotus-root ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Initial icon — Flaticon lotus */}
      <img
        src="/icons/lotus-bud.png"
        alt=""
        draggable={false}
        className="lotus-base pointer-events-none absolute inset-0 h-full w-full select-none"
      />

      {/* Hover icon — Flaticon lotus flower (blooms in) */}
      <img
        src="/icons/lotus-flower.png"
        alt=""
        draggable={false}
        className="lotus-hover pointer-events-none absolute inset-0 h-full w-full select-none"
      />

      <style>{ICON_CSS}</style>
    </span>
  );
}
