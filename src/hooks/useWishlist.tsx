/**
 * Wishlist Context — shared state across all components.
 * localStorage-backed, works for guests and authenticated users.
 */

import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from "react";

const WISHLIST_KEY = "sabbe-satta-wishlist";

function readStorage(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(WISHLIST_KEY) || "[]");
  } catch {
    return [];
  }
}

function writeStorage(ids: string[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(WISHLIST_KEY, JSON.stringify(ids));
}

interface WishlistContextValue {
  ids: string[];
  isWishlisted: (id: string) => boolean;
  toggle: (id: string) => void;
  add: (id: string) => void;
  remove: (id: string) => void;
  /** Remove every item (used by the wishlist “Move all to cart” bulk action). */
  clear: () => void;
  count: number;
}

const WishlistContext = createContext<WishlistContextValue | null>(null);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<string[]>([]);
  const hydrated = useRef(false);

  useEffect(() => {
    // Re-read from localStorage after hydration to pick up any
    // items added before a full page load (SSR returns []).
    const stored = readStorage();
    setIds(stored);
    hydrated.current = true;
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    writeStorage(ids);
  }, [ids]);

  const normalize = (id: string) => String(id);

  const isWishlisted = useCallback((id: string) => ids.includes(normalize(id)), [ids]);

  const toggle = useCallback((id: string) => {
    const idStr = normalize(id);
    setIds((prev) => (prev.includes(idStr) ? prev.filter((x) => x !== idStr) : [...prev, idStr]));
  }, []);

  const add = useCallback((id: string) => {
    const idStr = normalize(id);
    setIds((prev) => (prev.includes(idStr) ? prev : [...prev, idStr]));
  }, []);

  const remove = useCallback((id: string) => {
    const idStr = normalize(id);
    setIds((prev) => prev.filter((x) => x !== idStr));
  }, []);

  const clear = useCallback(() => setIds([]), []);

  return (
    <WishlistContext.Provider value={{ ids, isWishlisted, toggle, add, remove, clear, count: ids.length }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used within WishlistProvider");
  return ctx;
}
