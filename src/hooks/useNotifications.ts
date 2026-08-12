import { useCallback, useEffect, useMemo, useState } from "react";
import {
  mockGetNotifications,
  mockGetUnreadCount,
  mockMarkAllRead,
  mockMarkRead,
  notificationTypeToTopic,
  MOCK_NOTIFICATIONS_EVENT,
  type MockNotification,
} from "@/lib/mock-notifications";
import { useNotificationGate } from "@/hooks/useNotificationGate";

/**
 * Shared notifications state — consumed by both the header bell
 * (NotificationBell) and the profile Notifications card.
 *
 * Subscribes to the mock-store change event, filters by the user's
 * notification topic preferences (from /settings), and exposes mark-read
 * actions that refresh the list. Mirrors the Supabase seam so a real
 * backend later swaps in behind the same hook contract.
 */
export function useNotifications(userId: string | null) {
  const { canNotify } = useNotificationGate();
  const [items, setItems] = useState<MockNotification[]>([]);
  const [unread, setUnread] = useState(0);

  const refresh = useCallback(async () => {
    if (!userId) return;
    const [list, count] = await Promise.all([
      mockGetNotifications(userId),
      mockGetUnreadCount(userId),
    ]);
    setItems(list);
    setUnread(count);
  }, [userId]);

  useEffect(() => {
    refresh();
    window.addEventListener(MOCK_NOTIFICATIONS_EVENT, refresh);
    return () => window.removeEventListener(MOCK_NOTIFICATIONS_EVENT, refresh);
  }, [refresh]);

  /** Notifications filtered by enabled topics (welcome/contact rows have no topic → always shown). */
  const visible = useMemo(
    () =>
      items.filter((n) => {
        const topic = notificationTypeToTopic(n.type);
        return topic ? canNotify(topic) : true;
      }),
    [items, canNotify],
  );

  const markRead = useCallback(
    (id: string) =>
      userId ? mockMarkRead(userId, id).then(refresh) : Promise.resolve(),
    [userId, refresh],
  );

  const markAllRead = useCallback(
    () => (userId ? mockMarkAllRead(userId).then(refresh) : Promise.resolve()),
    [userId, refresh],
  );

  return { items, unread, visible, markRead, markAllRead };
}
