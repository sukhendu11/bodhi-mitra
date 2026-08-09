import { describe, it, expect, beforeEach } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import {
  CHECKOUT_SUCCESS_INVALIDATION_KEYS,
  invalidateCheckoutQueries,
} from "@/lib/checkout-invalidation";

function makeClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
}

/** Seed a query into the cache so getQueryState resolves to a real state. */
function seed(client: QueryClient, key: unknown[]): void {
  client.setQueryData(key, "seeded");
}

describe("invalidateCheckoutQueries", () => {
  let client: QueryClient;

  beforeEach(() => {
    client = makeClient();
  });

  it("declares all four post-checkout key prefixes", () => {
    expect(CHECKOUT_SUCCESS_INVALIDATION_KEYS).toEqual([
      ["cart"],
      ["cart-count"],
      ["library"],
      ["book-owned"],
    ]);
  });

  it("book-owned prefix matches every query-key variant used across the app", async () => {
    // The exact variants found in the codebase:
    const variants = [
      ["book-owned", "book-1"], // books.index.tsx invalidation (no userId segment)
      ["book-owned", "book-1", "user-1"], // BookCard / index / books.index / books.$slug
      ["book-owned", "book-2", "user-1"],
      ["book-owned", "book-3", "user-2", "deeper-segment"], // any deeper prefix
    ];
    variants.forEach((v) => seed(client, v));

    await invalidateCheckoutQueries(client);

    for (const variant of variants) {
      expect(
        client.getQueryState(variant)?.isInvalidated,
        `${JSON.stringify(variant)} should be invalidated`,
      ).toBe(true);
    }
  });

  it("also invalidates cart, cart-count, and library", async () => {
    [["cart"], ["cart-count"], ["library"]].forEach((k) => seed(client, k));

    await invalidateCheckoutQueries(client);

    for (const key of [["cart"], ["cart-count"], ["library"]]) {
      expect(
        client.getQueryState(key)?.isInvalidated,
        `${JSON.stringify(key)} should be invalidated`,
      ).toBe(true);
    }
  });

  it("does NOT invalidate unrelated query keys", async () => {
    const unrelated = [
      ["book-progress", "book-1", "user-1"],
      ["book-user-rating", "book-1", "user-1"],
      ["book-reviews", "book-1"],
      ["public-books"],
      ["featured-books"],
      // First segments differ — prefix matching requires the first element to
      // be identical, so these must survive untouched:
      ["cart-something-else"],
      ["library-catalog"],
    ];
    unrelated.forEach((k) => seed(client, k));

    await invalidateCheckoutQueries(client);

    for (const key of unrelated) {
      expect(
        client.getQueryState(key)?.isInvalidated,
        `${JSON.stringify(key)} should NOT be invalidated`,
      ).not.toBe(true);
    }
  });
});
