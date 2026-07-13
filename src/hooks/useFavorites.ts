import { useState, useCallback } from "react";

const STORAGE_KEY = "admin-favorites";

interface FavoriteItem {
  to: string;
  label: string;
}

function loadFavorites(): FavoriteItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveFavorites(items: FavoriteItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<FavoriteItem[]>(loadFavorites);

  const toggleFavorite = useCallback((item: FavoriteItem) => {
    setFavorites((prev) => {
      const exists = prev.some((f) => f.to === item.to);
      const next = exists
        ? prev.filter((f) => f.to !== item.to)
        : [...prev, item];
      saveFavorites(next);
      return next;
    });
  }, []);

  const isFavorite = useCallback(
    (to: string) => favorites.some((f) => f.to === to),
    [favorites],
  );

  const removeFavorite = useCallback((to: string) => {
    setFavorites((prev) => {
      const next = prev.filter((f) => f.to !== to);
      saveFavorites(next);
      return next;
    });
  }, []);

  const reorderFavorites = useCallback((items: FavoriteItem[]) => {
    setFavorites(items);
    saveFavorites(items);
  }, []);

  const clearAllFavorites = useCallback(() => {
    setFavorites([]);
    saveFavorites([]);
  }, []);

  return { favorites, toggleFavorite, isFavorite, removeFavorite, reorderFavorites, clearAllFavorites };
}
