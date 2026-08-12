/**
 * Responsive Contract — M5–M7 milestone guards (2026-08-11).
 *
 * Non-browser verification: jsdom performs no layout, so horizontal-overflow
 * bugs can't be caught by rendering. These tests assert the *source-level*
 * responsive guarantees for the M5 (profile / settings / stats), M6
 * (commerce), and M7 (full-site sweep + global overflow guard) milestones so
 * the fixes documented in the 2026-08-11 milestones can never silently regress.
 *
 * Each assertion mirrors a concrete layout contract:
 *   - grids collapse to 1–2 columns on mobile (never a fixed 4-col row)
 *   - desktop-only elements always ship with a mobile alternative
 *   - long text is truncation-guarded (never overflows its flex parent)
 *   - scrollable strips hide the native scrollbar (thumbnail-scroll)
 *   - every unwrapped justify-between row is allowlisted (global overflow guard)
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, join, relative } from "node:path";

const read = (rel: string) =>
  readFileSync(resolve(process.cwd(), rel), "utf8");

const profileSrc = read("src/routes/profile.tsx");
const statsSrc = read("src/routes/stats.tsx");
const settingsSrc = read("src/routes/settings.tsx");
const settingsNavSrc = read("src/components/settings/SettingsNav.tsx");
const cartSrc = read("src/routes/cart.tsx");
const checkoutSrc = read("src/routes/checkout.tsx");
const checkoutSuccessSrc = read("src/routes/checkout.success.tsx");
const paymentFormSrc = read("src/components/PaymentForm.tsx");
const ordersSrc = read("src/routes/orders.tsx");
const purchasesSrc = read("src/routes/purchases.tsx");
const wishlistSrc = read("src/routes/wishlist.tsx");
const donateSrc = read("src/routes/donate.tsx");
const statCardSrc = read("src/components/StatCard.tsx");
const indexSrc = read("src/routes/index.tsx");
const reflectionsIndexSrc = read("src/routes/reflections.index.tsx");
const reflectionsSlugSrc = read("src/routes/reflections.$slug.tsx");
const booksIndexSrc = read("src/routes/books.index.tsx");
const booksSlugSrc = read("src/routes/books.$slug.tsx");
const postsSlugSrc = read("src/routes/posts.$slug.tsx");
const readerSrc = read("src/routes/reader.$bookId.tsx");
const adminSrc = read("src/components/admin/mock/MockAdminPanel.tsx");
const postGridSrc = read("src/components/PostGrid.tsx");

// ─────────────────────────────────────────────────────────────────────────────
// M7 global overflow guard — fold-in of the 2026-08-11 static overflow audit
// ─────────────────────────────────────────────────────────────────────────────
// The audit classified every unwrapped `justify-between` row in routes +
// components as safe (40 unique rows across 25 files). This allowlist is that
// audited snapshot; the guard below fails CI whenever a NEW unwrapped row
// appears that isn't listed here. Adding a row to the allowlist is only
// legitimate after the same audit proves it cannot overflow at 320px.
//
// Regenerate with:  node scripts/gen-responsive-allowlist.mjs
//
// Paths use forward slashes; rows are normalized (class set, order-insensitive).
const SAFE_UNWRAPPED_JUSTIFY_BETWEEN: Record<string, string[]> = {
  "src/components/AiChatPanel.tsx": ["flex gap-2 items-center justify-between mb-1.5"],
  "src/components/BookRecommendations.tsx": ["flex items-center justify-between mb-8"],
  "src/components/CartDrawer.tsx": [
    "bg-green-50/50 border border-green-200/30 dark:bg-green-950/20 dark:border-green-800/30 flex gap-2 items-center justify-between px-3 py-2 rounded-lg text-sm",
    "flex items-center justify-between",
    "flex items-center justify-between text-sm",
  ],
  "src/components/Comments.tsx": [
    "flex gap-4 items-baseline justify-between mb-1.5",
    "flex items-center justify-between",
  ],
  "src/components/MobileNav.tsx": [
    "active:scale-[0.98] duration-200 flex focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 font-medium hover:bg-secondary/30 hover:text-foreground hover:translate-x-0.5 items-center justify-between px-4 py-2.5 rounded-lg text-muted-foreground text-sm transition-all w-full",
    "active:scale-[0.98] duration-200 flex focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 group hover:bg-secondary/30 hover:shadow-sm hover:text-foreground hover:translate-x-0.5 items-center justify-between overflow-hidden px-4 py-2.5 relative rounded-lg text-muted-foreground text-sm transition-all",
    "flex items-center justify-between",
  ],
  "src/components/NavDropdown.tsx": ["flex items-center justify-between"],
  "src/components/NotificationBell.tsx": ["border-b border-border/40 flex items-center justify-between px-4 py-3"],
  "src/components/PaymentForm.tsx": [
    "border-border/30 border-t flex items-center justify-between pt-1.5",
    "flex items-center justify-between",
    "flex items-center justify-between text-muted-foreground text-xs",
  ],
  "src/components/admin/mock/MockAdminPanel.tsx": ["flex gap-4 h-14 items-center justify-between max-w-7xl md:px-8 mx-auto px-4"],
  "src/components/settings/AppearanceSection.tsx": ["flex gap-4 items-center justify-between"],
  "src/components/settings/NotificationsSection.tsx": ["flex gap-4 items-center justify-between"],
  "src/components/settings/PrivacySection.tsx": ["flex gap-4 items-center justify-between"],
  "src/components/settings/ProfileAccountSection.tsx": ["border-border/40 border-t flex gap-4 items-start justify-between pt-6"],
  "src/routes/__root.tsx": ["flex gap-2 items-center justify-between md:hidden w-full"],
  "src/routes/admin.tsx": ["flex gap-4 items-center justify-between max-w-screen-2xl mx-auto"],
  "src/routes/books.$slug.tsx": ["flex items-center justify-between mb-1.5 text-muted-foreground text-xs"],
  "src/routes/cart.tsx": [
    "bg-green-50/50 border border-green-200/30 dark:bg-green-950/20 dark:border-green-800/30 flex gap-2 items-center justify-between px-3 py-2 rounded-lg text-sm",
    "border-border/40 border-t flex items-center justify-between pt-2 text-sm",
    "flex items-center justify-between text-sm",
  ],
  "src/routes/checkout.success.tsx": [
    "border-border/30 border-t flex font-medium items-center justify-between pt-1.5",
    "flex items-center justify-between",
    "flex items-center justify-between text-muted-foreground",
  ],
  "src/routes/checkout.tsx": [
    "border-border/40 border-t flex items-center justify-between pt-2",
    "flex gap-3 items-center justify-between text-left w-full",
    "flex items-center justify-between",
  ],
  "src/routes/faq.tsx": ["cursor-pointer flex gap-4 group items-center justify-between py-2 text-left w-full"],
  "src/routes/index.tsx": ["flex items-center justify-between mb-8"],
  "src/routes/orders.tsx": [
    "flex font-medium items-center justify-between pt-1",
    "flex items-center justify-between text-muted-foreground",
  ],
  "src/routes/reader.$bookId.tsx": ["flex items-center justify-between mb-1"],
  "src/routes/reflections.index.tsx": ["flex gap-4 items-start justify-between"],
  "src/routes/settings.tsx": [
    "border-border/40 border-t flex gap-4 items-center justify-between pt-5",
    "flex gap-4 items-center justify-between",
  ],
};

/** Recursively list .tsx files under a src dir (relative paths, fwd slashes). */
const tsxFiles = (dir: string): string[] => {
  const out: string[] = [];
  for (const entry of readdirSync(resolve(process.cwd(), dir))) {
    const abs = join(resolve(process.cwd(), dir), entry);
    if (statSync(abs).isDirectory()) out.push(...tsxFiles(relative(process.cwd(), abs)));
    else if (entry.endsWith(".tsx")) out.push(relative(process.cwd(), abs).replace(/\\/g, "/"));
  }
  return out;
};

describe("Responsive contract — shared StatCard/StatGrid (M6 rule extraction)", () => {
  it("money typography rule lives in StatCard: text-xl on phones → text-2xl at sm+", () => {
    expect(statCardSrc).toContain("text-xl sm:text-2xl leading-tight");
    expect(statCardSrc).toContain("tabular-nums");
  });

  it("money grids stack to 1 col below sm when columns > 2", () => {
    expect(statCardSrc).toContain("grid-cols-1 sm:grid-cols-3");
  });

  it("4-col grids are md-gated (2 → 4), 2-col grids stay dense", () => {
    expect(statCardSrc).toContain("grid-cols-2 md:grid-cols-4");
  });
});

describe("Responsive contract — profile.tsx", () => {
  it("identity-card email truncates instead of overflowing the flex row", () => {
    // `min-w-0` on the flex row + `truncate` span around {user.email}
    expect(profileSrc).toMatch(
      /className="flex items-center gap-1\.5 text-sm text-muted-foreground min-w-0"/,
    );
    expect(profileSrc).toMatch(/<Mail className="h-3\.5 w-3\.5 shrink-0" \/>/);
    expect(profileSrc).toMatch(/<span className="truncate">\{user\.email\}<\/span>/);
  });

  it("stats grid collapses to 2 columns on mobile (2 → 4)", () => {
    expect(profileSrc).toContain("grid grid-cols-2 md:grid-cols-4 gap-4");
  });

  it("library summary uses responsive icon cards (stack on mobile, 3-across on sm+)", () => {
    // M5.5 redesign — the Library summary moved off the dense 3-col StatGrid
    // onto icon cards that stack full-width on phones (leading icon + count +
    // label) and lay 3-across from sm up, each with min-w-0/truncate guards.
    expect(profileSrc).toContain("grid grid-cols-1 sm:grid-cols-3 gap-3");
    expect(profileSrc).toMatch(/min-w-0/g);
    // Cards are clickable shortcuts (Purchased → /purchases, In progress /
    // Completed → /stats) rather than inert stat tiles.
    expect(profileSrc).toContain('to="/purchases"');
    expect(profileSrc).toContain('to="/stats"');
    // The library section's icon chips (w-9 h-9 rounded-full tinted circles)
    // discriminate it from the Quick Links grid, which uses the same
    // grid-cols-1 sm:grid-cols-3 classes.
    expect(profileSrc).toContain("w-9 h-9 shrink-0 rounded-full");
  });

  it("quick links stack on mobile (1 → 3)", () => {
    expect(profileSrc).toContain("grid grid-cols-1 sm:grid-cols-3 gap-3");
  });

  it("recent-books page info is hidden on mobile, not overflowing", () => {
    expect(profileSrc).toContain("hidden sm:block text-[10px]");
  });
});

describe("Responsive contract — stats.tsx", () => {
  it("chart header stacks title above summary on mobile (no justify-between overflow)", () => {
    expect(statsSrc).toContain(
      "flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between mb-2",
    );
    // the summary span still exists below
    expect(statsSrc).toMatch(/<span className="text-xs text-muted-foreground">/);
  });

  it("stat cards collapse to 2 columns on mobile via the shared 4-col StatGrid", () => {
    expect(statsSrc).toContain('<StatGrid columns={4} className="gap-4">');
    expect(statsSrc).toContain('layout="stacked"');
  });

  it("streak strip scrolls horizontally with the scrollbar hidden", () => {
    expect(statsSrc).toContain("flex gap-1.5 overflow-x-auto pb-1 thumbnail-scroll");
  });

  it("streak dots shrink on mobile so more fit per view (h-7 → h-8 at sm)", () => {
    expect(statsSrc).toContain("h-7 w-7 sm:h-8 sm:w-8 shrink-0 rounded-md");
  });

  it("time-per-book rows give the title a shrinkable flex child", () => {
    expect(statsSrc).toContain("min-w-0 flex-1");
  });
});

describe("Responsive contract — cart.tsx (M6 Commerce)", () => {
  it("header wraps so the Clear button drops below a long subtitle on phones", () => {
    expect(cartSrc).toContain("flex flex-wrap items-center justify-between gap-3 mb-8");
  });

  it("item rows shrink (min-w-0) and keep fixed thumbnail + touch-visible remove", () => {
    expect(cartSrc).toContain("min-w-0 flex-1");
    expect(cartSrc).toContain("shrink-0 w-12 h-16 rounded-lg");
    // remove button is always visible on mobile (hidden on hover only at sm+)
    expect(cartSrc).toContain("sm:opacity-0 sm:group-hover/item:opacity-100");
  });

  it("coupon input + apply button fit one row on phones (flex gap-2, flex-1 input)", () => {
    expect(cartSrc).toContain("flex gap-2");
    expect(cartSrc).toContain("flex-1 px-3 py-2 text-xs");
  });
});

describe("Responsive contract — checkout.tsx (M6 Commerce)", () => {
  it("two-column layout engages only at md (mobile is single column)", () => {
    expect(checkoutSrc).toContain("grid gap-6 md:grid-cols-5");
    expect(checkoutSrc).toContain("md:col-span-3");
    expect(checkoutSrc).toContain("md:col-span-2");
  });

  it("summary column is sticky only on desktop (no sticky overlap on mobile)", () => {
    expect(checkoutSrc).toContain("md:sticky md:top-24");
  });

  it("item rows and coupon row shrink safely", () => {
    expect(checkoutSrc).toContain("min-w-0 flex-1");
    expect(checkoutSrc).toContain("w-10 h-14 rounded-lg");
    expect(checkoutSrc).toContain("relative flex-1");
  });
});

describe("Responsive contract — orders.tsx (M6 Commerce)", () => {
  it("order-card header wraps so badge/price/chevron never crush the title", () => {
    expect(ordersSrc).toContain(
      "w-full flex flex-wrap items-center gap-x-4 gap-y-2 p-4 text-left",
    );
    expect(ordersSrc).toContain("min-w-0 flex-1");
    // price stays shrink-0 against the wrapping row
    expect(ordersSrc).toContain("text-sm font-semibold shrink-0");
  });

  it("money stat uses the shared StatCard money rule (text-xl → text-2xl at sm)", () => {
    expect(ordersSrc).toContain('<StatCard value={formatMoney(totalSpent, lang)}');
    expect(ordersSrc).toContain("money />");
    // the typography rule itself lives in StatCard.tsx
    expect(statCardSrc).toContain("text-xl sm:text-2xl leading-tight");
  });

  it("stats grid keeps 2-col via StatGrid (money at 2 cols fits the text-xl rule)", () => {
    expect(ordersSrc).toContain('StatGrid columns={2} money className="gap-4 mb-10"');
  });

  it("receipt item rows truncate the title against a shrink-0 price", () => {
    expect(ordersSrc).toContain("min-w-0 flex-1");
  });
});

describe("Responsive contract — purchases.tsx (M6 Commerce)", () => {
  it("money grid stacks to 1 col on phones via StatGrid columns={3} money", () => {
    expect(purchasesSrc).toContain('StatGrid columns={3} money className="gap-4 mb-10"');
    expect(purchasesSrc).toContain('<StatCard value={formatMoney(totalSpent, lang)}');
    expect(purchasesSrc).toContain("money />");
  });

  it("library rows shrink the title against fixed cover + right status block", () => {
    expect(purchasesSrc).toContain("min-w-0 flex-1");
    expect(purchasesSrc).toContain("w-12 h-16 rounded-lg object-cover shrink-0");
    expect(purchasesSrc).toContain("text-right shrink-0");
  });
});

describe("Responsive contract — checkout.success.tsx (M6 Commerce)", () => {
  it("receipt is constrained (max-w-sm) and its item rows truncate against money", () => {
    expect(checkoutSuccessSrc).toContain("max-w-sm mx-auto rounded-2xl");
    expect(checkoutSuccessSrc).toContain("min-w-0 flex-1 truncate pr-3");
    expect(checkoutSuccessSrc).toContain("shrink-0 font-sans tabular-nums");
  });

  it("action buttons wrap instead of overflowing the centered column", () => {
    expect(checkoutSuccessSrc).toContain("flex flex-wrap items-center justify-center gap-3");
  });

  it("recently-purchased rows shrink the title against cover + arrow", () => {
    expect(checkoutSuccessSrc).toContain("min-w-0 flex-1");
    expect(checkoutSuccessSrc).toContain("w-10 h-14 rounded-lg object-cover shrink-0");
  });
});

describe("Responsive contract — PaymentForm.tsx (M6 Commerce card form)", () => {
  it("card number + name are full-width; expiry/CVC are 2 short columns", () => {
    // full-width card number (font-mono, w-full via inputCls)
    expect(paymentFormSrc).toContain("placeholder=\"4242 4242 4242 4242\"");
    // expiry + CVC in a 2-col grid of short inputs — fits 320px
    expect(paymentFormSrc).toContain("grid grid-cols-2 gap-3");
    expect(paymentFormSrc).toContain("placeholder=\"12/28\"");
    expect(paymentFormSrc).toContain("placeholder=\"123\"");
  });

  it("pay button + order summary rows are full-width / truncation-safe", () => {
    expect(paymentFormSrc).toContain("w-full px-6 py-3");
    expect(paymentFormSrc).toContain("tabular-nums");
  });
});

describe("Responsive contract — wishlist.tsx + donate.tsx (M6 Commerce)", () => {
  it("wishlist uses the shared responsive book-grid (no fixed-width grid)", () => {
    expect(wishlistSrc).toContain("book-grid");
  });

  it("donate preset chips wrap instead of overflowing", () => {
    expect(donateSrc).toContain("flex flex-wrap gap-2.5");
  });

  it("donate amount input + CTA are full-width on mobile", () => {
    expect(donateSrc).toContain("w-full pl-14 pr-4 py-4");
    expect(donateSrc).toContain("w-full py-4 text-base");
  });
});

describe("M7 Final QA — homepage (index.tsx)", () => {
  it("featured books use the shared responsive book-grid", () => {
    expect(indexSrc).toContain("book-grid");
  });

  it("reflections + videos grids collapse 1 → 2 → 3", () => {
    expect(indexSrc).toContain("grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-10");
  });

  it("category pills carry no taxonomy counters (postCounts removed)", () => {
    // 2026-08-11: counters were removed from the homepage reflections pills;
    // the query + import died with them. Guard the shape that remains.
    expect(indexSrc).not.toContain("postCounts");
    expect(indexSrc).toContain("{f.label}");
  });
});

describe("M7 Final QA — reflections (hub + category)", () => {
  it("category pills wrap instead of overflowing", () => {
    expect(reflectionsSlugSrc).toContain("flex flex-wrap justify-center gap-2");
  });

  it("post grids collapse 1 → 2 → 3 (shared PostGrid)", () => {
    expect(postGridSrc).toContain("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-16");
    expect(reflectionsIndexSrc).toContain("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-16");
  });

  it("hub category pills carry no taxonomy counters (counts removed)", () => {
    // Same 2026-08-11 removal as the homepage; the query + import + span are gone.
    expect(reflectionsIndexSrc).not.toContain("counts");
    expect(reflectionsIndexSrc).not.toContain("fetchPostCounts");
  });
});

describe("M7 Final QA — books (catalog + detail)", () => {
  it("catalog search row stacks on phones; grid uses book-grid", () => {
    expect(booksIndexSrc).toContain("flex flex-col sm:flex-row items-stretch sm:items-center gap-3 max-w-2xl mx-auto mb-6");
    expect(booksIndexSrc).toContain("book-grid");
  });

  it("detail metadata is 2-col on phones (price/file-size cells breathe), 4-col at sm+", () => {
    // Cells are conditional (2-5), so a 3-cell book renders 2+1 with the price
    // alone on row 2 at 2-col — intentional tradeoff so the price fits one line
    // at ~115px/col instead of wrapping at the old 3-col ~77px. Do not revert.
    expect(booksSlugSrc).toContain("grid grid-cols-2 sm:grid-cols-4 gap-5");
  });

  it("detail cover column stacks above details on mobile", () => {
    expect(booksSlugSrc).toContain("grid md:grid-cols-[340px_1fr] gap-10 md:gap-16");
  });

  it("detail CTA buttons wrap instead of overflowing", () => {
    expect(booksSlugSrc).toContain("flex flex-wrap items-center gap-3 pt-2");
  });
});

describe("M7 Final QA — posts (article page)", () => {
  it("mobile ToC renders above the article; desktop sidebar is lg-only", () => {
    expect(postsSlugSrc).toContain("mb-8 lg:hidden");
    expect(postsSlugSrc).toContain("hidden lg:block");
  });

  it("related posts collapse 1 → 3", () => {
    expect(postsSlugSrc).toContain("grid grid-cols-1 md:grid-cols-3 gap-6");
  });
});

describe("M7 Final QA — reader + mock admin", () => {
  it("reader is a full-screen flex column (no page scroll overflow)", () => {
    expect(readerSrc).toContain("h-screen flex flex-col overflow-hidden");
  });

  it("admin shell: sidebar becomes a horizontal scroll row on phones", () => {
    expect(adminSrc).toContain("flex flex-col md:flex-row gap-6");
    expect(adminSrc).toContain("flex md:flex-col gap-1 overflow-x-auto pb-1 md:pb-0");
  });

  it("admin data tables scroll horizontally instead of overflowing", () => {
    expect(adminSrc).toContain("overflow-x-auto rounded-lg border border-border/60 bg-card");
  });

  it("admin stat cards are 2-col on phones (2 → 3 at lg)", () => {
    expect(adminSrc).toContain("grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4");
  });
});

describe("M7 Final QA — global overflow guard (audit fold-in)", () => {
  it("every unwrapped justify-between row is in the audited allowlist", () => {
    const norm = (cls: string) => cls.split(" ").sort().join(" ");
    const unlisted: string[] = [];
    for (const file of [...tsxFiles("src/routes"), ...tsxFiles("src/components")]) {
      const allowed = new Set((SAFE_UNWRAPPED_JUSTIFY_BETWEEN[file] ?? []).map(norm));
      const src = read(file);
      for (const m of src.matchAll(/className="([^"]*justify-between[^"]*)"/g)) {
        const cls = m[1];
        if (cls.includes("wrap") || cls.includes("flex-col")) continue;
        if (!allowed.has(norm(cls))) unlisted.push(`${file}: ${cls}`);
      }
    }
    expect(unlisted).toEqual([]);
  });

  it("allowlist has no stale entries for deleted files", () => {
    const live = new Set([...tsxFiles("src/routes"), ...tsxFiles("src/components")]);
    const stale = Object.keys(SAFE_UNWRAPPED_JUSTIFY_BETWEEN).filter((f) => !live.has(f));
    expect(stale).toEqual([]);
  });
});

describe("Badge centering contract — digits centered in round pills (2026-08-12)", () => {
  // Every count badge (header cart/wishlist, bottom nav, mobile drawer,
  // avatar dropdown, notification bell) must center its digits BOTH axes:
  // flex centering targets the line box, and `leading-none` collapses the
  // line box to the glyph height so the ink (incl. Bengali numerals like
  // ১২ / ৯৯+) sits dead-center. Guards against the line-height regression.
  const badgeSurfaces: [string, string][] = [
    ["src/routes/__root.tsx", "min-w-[18px] h-[18px] rounded-full"],
    ["src/components/WishlistBadge.tsx", "h-5 min-w-5 rounded-full"],
    ["src/components/BottomNav.tsx", "min-w-[16px] h-4 rounded-full"],
    ["src/components/MobileNav.tsx", "h-5 min-w-5 px-1 rounded-full"],
    ["src/components/AvatarDropdown.tsx", "h-[18px] min-w-[18px] rounded-full"],
    ["src/components/NotificationBell.tsx", "min-w-[16px] h-4 rounded-full"],
  ];

  const badgeClassOf = (src: string, marker: string): string => {
    const esc = marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const m = src.match(new RegExp(`"([^"]*${esc}[^"]*)"`));
    return m?.[1] ?? "";
  };

  it.each(badgeSurfaces)("%s badge centers digits on both axes", (file, marker) => {
    const cls = badgeClassOf(read(file), marker);
    expect(cls, `${file} badge class string not found`).not.toBe("");
    expect(cls).toMatch(/flex|inline-flex/);
    expect(cls).toContain("items-center");
    expect(cls).toContain("justify-center");
    expect(cls).toContain("leading-none");
  });

  it("badge digits localize to Bengali numerals in BN mode (formatCountBadge)", async () => {
    const { formatCountBadge } = await import("@/lib/i18n");
    expect(formatCountBadge(12, "bn")).toBe("১২");
    expect(formatCountBadge(99, "bn", 9)).toBe("৯+");
    expect(formatCountBadge(120, "bn", 99)).toBe("৯৯+");
  });
});

describe("Responsive contract — settings.tsx + SettingsNav.tsx", () => {
  it("desktop sidebar is lg-only and ships a mobile chips alternative", () => {
    expect(settingsNavSrc).toContain("hidden lg:block lg:col-start-1");
    expect(settingsNavSrc).toContain("lg:hidden -mx-6 px-6 mb-8");
  });

  it("mobile chips scroll horizontally with the scrollbar hidden", () => {
    expect(settingsNavSrc).toContain("flex gap-2 overflow-x-auto pb-2 thumbnail-scroll");
  });

  it("two-column layout only engages at lg (mobile is single column)", () => {
    expect(settingsSrc).toContain("lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-10");
    // min-w-0 guard so long section content can't blow out the grid track
    expect(settingsSrc).toContain("min-w-0");
  });

  it("unsaved-changes save bar is sticky (bottom) and its label truncates", () => {
    expect(settingsSrc).toContain("sticky bottom-4 z-10");
    expect(settingsSrc).toContain("flex-1 min-w-0");
  });

  it("section cards keep scroll offset for the sticky header (scroll-mt-28)", () => {
    expect(settingsSrc).toContain("scroll-mt-28");
  });
});
