import { describe, it, expect } from "vitest";
import {
  toBanglaDigits,
  formatCountBadge,
  formatMoney,
  formatDate,
  localizeCartResult,
} from "@/lib/i18n";
import { mockAddToCart, mockRemoveFromCart, mockClearCart, mockGetCart } from "@/lib/mock-cart";
import { mockFetchPublishedBooks } from "@/lib/mock-data";

describe("toBanglaDigits", () => {
  it("converts Latin digits to Bengali numerals", () => {
    expect(toBanglaDigits("20")).toBe("২০");
    expect(toBanglaDigits("1234567890")).toBe("১২৩৪৫৬৭৮৯০");
    expect(toBanglaDigits(42)).toBe("৪২");
  });

  it("keeps decimal separators and other characters intact", () => {
    expect(toBanglaDigits("20.05")).toBe("২০.০৫");
    expect(toBanglaDigits("3 books")).toBe("৩ books");
  });
});

describe("formatCountBadge", () => {
  it("uses Latin digits in English mode", () => {
    expect(formatCountBadge(0, "en")).toBe("0");
    expect(formatCountBadge(12, "en")).toBe("12");
    expect(formatCountBadge(5, "en", 9)).toBe("5");
    expect(formatCountBadge(10, "en", 9)).toBe("9+");
  });

  it("uses Bengali numerals in Bangla mode — digits and the + cap", () => {
    expect(formatCountBadge(0, "bn")).toBe("০");
    expect(formatCountBadge(12, "bn")).toBe("১২");
    expect(formatCountBadge(5, "bn", 9)).toBe("৫");
    expect(formatCountBadge(10, "bn", 9)).toBe("৯+");
    expect(formatCountBadge(150, "bn")).toBe("৯৯+");
  });
});

describe("formatDate", () => {
  it("renders English dates with Latin digits", () => {
    expect(formatDate("2026-08-07T12:00:00Z", "en")).toBe("August 7, 2026");
  });

  it("renders Bangla dates with Bengali numerals (bn-BD + digit pass)", () => {
    const bn = formatDate("2026-08-07T12:00:00Z", "bn");
    // Month name is Bangla and every numeral is Bengali — never Latin digits.
    expect(bn).not.toMatch(/[0-9]/);
    expect(bn).toMatch(/৭/); // day
    expect(bn).toMatch(/২০২৬/); // year
  });

  it("honors custom options and returns empty for invalid dates", () => {
    expect(
      formatDate("2026-08-07T12:00:00Z", "en", { month: "short", day: "numeric", year: "numeric" }),
    ).toBe("Aug 7, 2026");
    expect(formatDate("not-a-date", "en")).toBe("");
  });
});

describe("formatMoney", () => {
  it("uses BDT before the digits for English", () => {
    expect(formatMoney(20, "en", "৳")).toBe("BDT 20.00");
    expect(formatMoney(20, "en", "$")).toBe("BDT 20.00");
    expect(formatMoney(20, "en", null)).toBe("BDT 20.00");
    expect(formatMoney(20, "en", "€")).toBe("BDT 20.00");
  });

  it("renders Bengali numerals with টাকা after the digits for Bangla", () => {
    expect(formatMoney(20, "bn")).toBe("২০.০০ টাকা");
    expect(formatMoney(20.5, "bn")).toBe("২০.৫০ টাকা");
    expect(formatMoney(1200, "bn", "৳")).toBe("১২০০.০০ টাকা");
  });
});

describe("localizeCartResult", () => {
  it("localizes add-to-cart results (alreadyInCart flag)", () => {
    expect(localizeCartResult("en", { message: "Book is already in your cart.", alreadyInCart: true })).toBe(
      "Book is already in your cart.",
    );
    expect(localizeCartResult("bn", { message: "Book is already in your cart.", alreadyInCart: true })).toBe(
      "বইটি ইতিমধ্যে আপনার কার্টে আছে।",
    );
    expect(localizeCartResult("en", { message: "Added to cart.", alreadyInCart: false })).toBe("Added to cart.");
    expect(localizeCartResult("bn", { message: "Added to cart.", alreadyInCart: false })).toBe("কার্টে যোগ করা হয়েছে।");
  });

  it("localizes remove / clear results by service message", () => {
    expect(localizeCartResult("en", { message: "Removed from cart." })).toBe("Removed from cart.");
    expect(localizeCartResult("bn", { message: "Removed from cart." })).toBe("কার্ট থেকে সরানো হয়েছে।");
    expect(localizeCartResult("en", { message: "Cart cleared." })).toBe("Cart cleared.");
    expect(localizeCartResult("bn", { message: "Cart cleared." })).toBe("কার্ট খালি করা হয়েছে।");
    expect(localizeCartResult("bn", { message: "Cart is already empty." })).toBe("কার্ট ইতিমধ্যে খালি।");
  });

  it("passes through unknown messages", () => {
    expect(localizeCartResult("bn", { message: "Something else." })).toBe("Something else.");
    expect(localizeCartResult("bn", {})).toBe("");
  });
});

/**
 * Drift guard: if the cart services (mock-cart.ts / cart.ts) ever reword a
 * message constant, localizeCartResult's switch would silently fall through
 * to the English pass-through in Bangla mode. Run the real mock service and
 * assert every message it can return has a real Bangla translation.
 */
describe("cart service → localizeCartResult contract", () => {
  it("every message the mock cart service can return localizes to Bangla", async () => {
    const books = (await mockFetchPublishedBooks(1, 100)).data;
    const book = books.find((b) => !b.is_free) ?? books[0];
    expect(book).toBeTruthy();
    const snap = {
      id: book.id,
      title_en: book.title_en,
      title_bn: book.title_bn,
      slug: book.slug,
      cover_image: book.cover_image,
      price: book.price,
      is_free: book.is_free,
      author_name: book.author_name,
    };

    const messages: string[] = [];
    const added = await mockAddToCart(book.id, snap);
    messages.push(added.message); // "Added to cart."
    const duplicate = await mockAddToCart(book.id, snap);
    messages.push(duplicate.message); // "Book is already in your cart."
    const cart = await mockGetCart();
    const removed = await mockRemoveFromCart(cart.items[0].id);
    messages.push(removed.message); // "Removed from cart."
    const cleared = await mockClearCart();
    messages.push(cleared.message); // "Cart cleared."

    expect(messages).toHaveLength(4);
    for (const m of messages) {
      const bn = localizeCartResult("bn", { message: m });
      expect(bn, `message "${m}" has no Bangla mapping`).not.toBe("");
      expect(bn, `message "${m}" fell through to English`).not.toBe(m);
    }
  });
});