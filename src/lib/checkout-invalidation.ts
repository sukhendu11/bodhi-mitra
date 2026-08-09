import type { QueryClient } from "@tanstack/react-query";

/**
 * Query keys invalidated when a checkout completes successfully.
 *
 * Note: TanStack Query treats each key as a PREFIX — `["book-owned"]` matches
 * every variant used across the app:
 *   - ["book-owned", bookId]                        (books.index invalidation)
 *   - ["book-owned", bookId, userId]                (BookCard / index / books.$slug)
 * So a single prefix invalidation covers them all.
 */
export const CHECKOUT_SUCCESS_INVALIDATION_KEYS: unknown[][] = [
  ["cart"],
  ["cart-count"],
  ["library"],
  ["book-owned"],
];

/**
 * Invalidate all queries that a successful checkout invalidates.
 * Used by `/checkout/success` on mount so BookCard lock icons flip to the eye
 * icon immediately after a multi-book checkout.
 */
export function invalidateCheckoutQueries(queryClient: QueryClient): Promise<void> {
  return Promise.all(
    CHECKOUT_SUCCESS_INVALIDATION_KEYS.map((key) =>
      queryClient.invalidateQueries({ queryKey: key }),
    ),
  ).then(() => undefined);
}
