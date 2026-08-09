/**
 * BookCard — stretched-link behavior (whole card clickable).
 *
 * The card uses a stretched-link pattern: ONE absolutely-positioned
 * `<Link to="/books/$slug">` covers the whole card (`absolute inset-0
 * z-10`), while interactive controls (eye, wishlist, stars, add-to-cart,
 * remove) sit above it via higher z-index layers. jsdom has no
 * hit-testing, so we assert:
 *   1. exactly one navigation link, pointing at the right route params
 *   2. the link's positioning/z-index classes (what makes the whole card
 *      clickable in a real browser)
 *   3. controls are layered above the link and fire their own handlers
 *      instead of navigating
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SiteSettingsProvider } from "@/lib/siteSettings";
import { WishlistProvider } from "@/hooks/useWishlist";
import { BookCard } from "@/components/BookCard";
import type { Book } from "@/lib/books";
import type { MockCartBookSnapshot } from "@/lib/mock-cart";

/* ─── Mock the router: capture navigation props from the stretched Link ─── */

const { linkClickSpy } = vi.hoisted(() => ({ linkClickSpy: vi.fn() }));

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    params,
    search,
    children,
    ...rest
  }: {
    to: string;
    params?: Record<string, string>;
    search?: unknown;
    children?: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <a
      href={`/${to.replace("$slug", params?.slug ?? "")}`}
      data-to={to}
      data-slug={params?.slug ?? ""}
      data-search={JSON.stringify(search)}
      onClick={(e) => {
        e.preventDefault();
        linkClickSpy({ to, params, search });
      }}
      {...rest}
    >
      {children}
    </a>
  ),
}));

/* ─── Fixture ─────────────────────────────────────────────────────────── */

function makeBook(overrides: Partial<Book> = {}): Book {
  return {
    id: "book-test",
    slug: "test-book",
    title_en: "Test Book",
    title_bn: "টেস্ট বই",
    author_name: "Test Author",
    description_en: "A test book for the stretched-link card.",
    description_bn: "স্ট্রেচড-লিংক কার্ডের জন্য একটি টেস্ট বই।",
    cover_image: "",
    pdf_url: "/pdfs/test-book.pdf",
    pdf_file_size: 1000,
    price: 0,
    is_free: true,
    pages: 100,
    isbn: "978-0-000-00000-0",
    status: "published",
    featured: false,
    tags: [],
    category: "Meditation",
    meta_description_en: "",
    meta_description_bn: "",
    sort_order: 0,
    avg_rating: 4.5,
    total_ratings: 10,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

/* ─── Test wrapper ────────────────────────────────────────────────────── */

function renderCard(props: {
  book?: Book;
  lang?: "en" | "bn";
  userId?: string | null;
  onEyeClick?: (book: Book) => void;
  requireAuth?: (action: () => void) => void;
  onAddToCart?: (book: MockCartBookSnapshot) => void;
  onRemove?: (bookId: string) => void;
} = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <SiteSettingsProvider>
        <WishlistProvider>
          <BookCard
            book={props.book ?? makeBook()}
            lang={props.lang ?? "en"}
            userId={props.userId}
            onEyeClick={props.onEyeClick}
            requireAuth={props.requireAuth}
            onAddToCart={props.onAddToCart}
            onRemove={props.onRemove}
          />
        </WishlistProvider>
      </SiteSettingsProvider>
    </QueryClientProvider>,
  );
  return utils;
}

/* ─── Tests ───────────────────────────────────────────────────────────── */

beforeEach(() => {
  linkClickSpy.mockClear();
  localStorage.clear();
});

describe("BookCard stretched link", () => {
  it("renders exactly ONE navigation link (no duplicate cover/title/chevron anchors)", () => {
    renderCard();
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(1);
  });

  it("routes to /books/$slug with the book's slug and default search params", () => {
    renderCard({ book: makeBook({ slug: "the-heart-of-meditation" }) });
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("data-to", "/books/$slug");
    expect(link).toHaveAttribute("data-slug", "the-heart-of-meditation");
    // Parse instead of comparing the raw string — immune to JSON key ordering.
    expect(JSON.parse(link.getAttribute("data-search")!)).toEqual({ search: "", page: 1 });
  });

  it("announces the whole-card link accessibly (aria-label = title — author)", () => {
    renderCard({
      book: makeBook({ title_en: "The Heart of Meditation", author_name: "Siddhartha" }),
    });
    expect(screen.getByRole("link")).toHaveAttribute(
      "aria-label",
      "The Heart of Meditation — Siddhartha",
    );
  });

  it("covers the entire card via absolute inset-0 z-10 (whole-card clickability)", () => {
    const { container } = renderCard();
    const link = screen.getByRole("link");
    // The stretched link must overlay the full card so a click anywhere
    // on the card hits it in a real browser.
    expect(link.className).toContain("absolute");
    expect(link.className).toContain("inset-0");
    expect(link.className).toContain("z-10");
    // Sanity: the link is inside the card container.
    expect(container.querySelector(".book-card")).toContainElement(link);
  });

  it("clicking the stretched link triggers navigation to the detail route", () => {
    renderCard({ book: makeBook({ slug: "walking-the-middle-way" }) });
    fireEvent.click(screen.getByRole("link"));
    expect(linkClickSpy).toHaveBeenCalledWith({
      to: "/books/$slug",
      params: { slug: "walking-the-middle-way" },
      search: { search: "", page: 1 },
    });
  });
});

describe("BookCard z-index layering", () => {
  it("stacks interactive controls ABOVE the stretched link (z-20/z-30)", () => {
    renderCard({ onEyeClick: vi.fn(), onRemove: vi.fn() });

    // Eye + wishlist container sits at z-20, above the z-10 link.
    const eyeButton = screen.getByTitle("Read book");
    const controlsContainer = eyeButton.parentElement;
    expect(controlsContainer?.className).toContain("z-20");

    // Remove (wishlist page) button at z-30 — highest layer.
    const removeButton = screen.getByTitle("Remove from wishlist");
    expect(removeButton.className).toContain("z-30");

    // The stretched link is still z-10 (lower than all controls).
    expect(screen.getByRole("link").className).toContain("z-10");
  });

  it("lays the hover affordance between the link and the controls (z-[15], pointer-events-none)", () => {
    const { container } = renderCard();
    // Note: lucide icons also carry aria-hidden, so scope to the overlay div.
    const overlay = container.querySelector('div[aria-hidden="true"]');
    expect(overlay).not.toBeNull();
    expect(overlay?.getAttribute("class")).toContain("z-[15]");
    expect(overlay?.getAttribute("class")).toContain("pointer-events-none");
    expect(overlay).toHaveTextContent("View Details");
  });

  it("shows the bilingual 'View Details' pill on the hover overlay", () => {
    renderCard({ lang: "bn" });
    expect(screen.getByText("বিস্তারিত")).toBeInTheDocument();
  });
});

describe("BookCard interactive controls (must not navigate)", () => {
  it("eye button calls onEyeClick instead of navigating", () => {
    const onEyeClick = vi.fn();
    const book = makeBook();
    renderCard({ onEyeClick });
    fireEvent.click(screen.getByTitle("Read book"));
    expect(onEyeClick).toHaveBeenCalledWith(book);
    expect(linkClickSpy).not.toHaveBeenCalled();
  });

  it("wishlist heart toggles the wishlist without navigating", () => {
    renderCard();
    const heart = screen.getByTitle("Add to wishlist");
    fireEvent.click(heart);
    // Toggled → title flips to "Remove from wishlist".
    expect(screen.getByTitle("Remove from wishlist")).toBeInTheDocument();
    expect(linkClickSpy).not.toHaveBeenCalled();
  });

  it("add-to-cart button (paid book) calls onAddToCart with the full book without navigating", () => {
    const onAddToCart = vi.fn();
    renderCard({
      book: makeBook({ is_free: false }),
      onAddToCart,
    });
    fireEvent.click(screen.getByTitle("Add to cart"));
    expect(onAddToCart).toHaveBeenCalledWith(
      expect.objectContaining({ id: "book-test", is_free: false }),
    );
    expect(linkClickSpy).not.toHaveBeenCalled();
  });

  it("remove button (wishlist page) calls onRemove without navigating", () => {
    const onRemove = vi.fn();
    renderCard({ onRemove });
    fireEvent.click(screen.getByTitle("Remove from wishlist"));
    expect(onRemove).toHaveBeenCalledWith("book-test");
    expect(linkClickSpy).not.toHaveBeenCalled();
  });

  it("star rating requires auth (requireAuth) instead of navigating", () => {
    const requireAuth = vi.fn();
    renderCard({ requireAuth });
    fireEvent.click(screen.getByLabelText("5 stars"));
    expect(requireAuth).toHaveBeenCalled();
    expect(linkClickSpy).not.toHaveBeenCalled();
  });
});
