import { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "@tanstack/react-router";
import { Bell, CheckCheck, Inbox } from "lucide-react";
import {
  mockGetNotifications,
  mockGetUnreadCount,
  mockMarkAllRead,
  mockMarkRead,
  MOCK_NOTIFICATIONS_EVENT,
  type MockNotification,
} from "@/lib/mock-notifications";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function NotificationBell({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<MockNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
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

  const handleOpen = useCallback(
    (next: boolean) => {
      // Mark unread items as read when the panel CLOSES — keeps the unread
      // dots visible while the user scans the panel (then clears the badge).
      if (!next && unread > 0) {
        mockMarkAllRead(userId).then(refresh);
      }
      setOpen(next);
    },
    [unread, refresh, userId],
  );

  // Close on outside click / Escape while open. Uses a document-level
  // pointer listener (not a fixed scrim — the sticky header's backdrop-blur
  // turns position:fixed into containing-block-relative, so a scrim would
  // only cover the header strip, not the page).
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        handleOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, handleOpen]);

  const handleItemClick = (id: string) => {
    mockMarkRead(userId, id).then(refresh);
    handleOpen(false);
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        onClick={() => handleOpen(!open)}
        aria-label="Notifications"
        aria-expanded={open}
        aria-pressed={open}
        className="group relative inline-flex items-center justify-center p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:shadow-[0_0_12px_hsl(var(--primary)/0.2)] transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        <span className="relative block group-hover:scale-110 transition-transform duration-300">
          <Bell className="h-5 w-5" strokeWidth={1.8} />
          {unread > 0 && (
            <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 rounded-full bg-destructive text-white text-[10px] font-bold flex items-center justify-center px-1 ring-2 ring-background">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </span>
      </button>

      {open && (
        <div
          className="absolute right-0 mt-3 z-50 w-80 sm:w-96 rounded-xl border border-border/80 bg-popover shadow-2xl ring-1 ring-foreground/5 overflow-hidden"
            role="menu"
            aria-label="Notifications"
          >
            {/* Panel header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
              <p className="text-sm font-medium text-foreground">Notifications</p>
              {unread > 0 && (
                <button
                  onClick={() => mockMarkAllRead(userId).then(refresh)}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Mark all read
                </button>
              )}
            </div>

            {/* List */}
            <div className="max-h-80 overflow-y-auto">
              {items.length === 0 ? (
                <div className="px-4 py-10 text-center">
                  <Inbox className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">No notifications yet.</p>
                </div>
              ) : (
                <ul className="divide-y divide-border/40">
                  {items.slice(0, 8).map((n) => {
                    const body = (
                      <div
                        className={`flex gap-3 px-4 py-3 text-left transition-colors ${
                          n.read ? "opacity-60" : ""
                        }`}
                      >
                        <span
                          className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${
                            n.read ? "bg-transparent" : "bg-destructive"
                          }`}
                          aria-hidden
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-foreground leading-snug">{n.message}</p>
                          <p className="text-xs text-muted-foreground/70 mt-0.5">{timeAgo(n.createdAt)}</p>
                        </div>
                      </div>
                    );
                    return (
                      <li key={n.id}>
                        {n.link ? (
                          <Link
                            to={n.link}
                            onClick={() => handleItemClick(n.id)}
                            className="block hover:bg-secondary/30 transition-colors"
                          >
                            {body}
                          </Link>
                        ) : (
                          <button onClick={() => handleItemClick(n.id)} className="w-full block hover:bg-secondary/30 transition-colors">
                            {body}
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {items.length > 8 && (
              <div className="px-4 py-2 border-t border-border/40 text-center">
                <Link
                  to="/profile"
                  onClick={() => handleOpen(false)}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  View all in profile
                </Link>
              </div>
            )}
          </div>
      )}
    </div>
  );
}
