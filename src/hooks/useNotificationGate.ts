import { useCallback } from "react";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import type { NotificationTopic } from "@/lib/user-preferences";

/**
 * Read the signed-in user's notification preferences and ask whether a given
 * topic is currently enabled.
 *
 * `canNotify(topic)` returns true only when the master "Email notifications"
 * switch AND that topic's toggle are both on. Guests / signed-out users get
 * `true` (there are no preferences to consult), so public surfaces like the
 * footer newsletter behave exactly as before.
 *
 * Consumed by every toast + bell surface so the /settings toggles visibly do
 * something in mock mode:
 *   - comments → comment/reply/update toasts (Comments.tsx)
 *   - reviews  → review-published + rating-saved toasts (BookReviews, book page)
 *   - orders   → purchase/order-state toasts (home, books grid, book page)
 *   - newsletter → NewsletterSignup success note
 *   - content / recommendations → NotificationBell item + badge filtering
 *
 * The prefs come from the shared `["user-preferences", user.id]` query, which
 * the /settings Save handler warms — so toggling + saving updates every gate
 * immediately on SPA navigation.
 */
export function useNotificationGate() {
  const { data: prefs } = useUserPreferences();

  const canNotify = useCallback(
    (topic: NotificationTopic): boolean => {
      if (!prefs) return true;
      return prefs.email_notifications && prefs.notifications[topic];
    },
    [prefs],
  );

  return { canNotify };
}
