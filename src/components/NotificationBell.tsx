import { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "@tanstack/react-router";
import { Bell, CheckCheck, Inbox, X } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { useLang, formatCountBadge } from "@/lib/i18n";

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
  const rootRef = useRef<HTMLDivElement>(null);
  const { lang } = useLang();
  // Shared notifications state — store, event subscription, topic gate, and
  // mark-read actions all live in the useNotifications hook (also used by
  // the profile Notifications card, so both surfaces stay in sync).
  const { unread, visible, markRead, markAllRead } = useNotifications(userId);

  const handleOpen = useCallback(
    (next: boolean) => {
      // Mark unread items as read when the panel CLOSES — keeps the unread
      // dots visible while the user scans the panel (then clears the badge).
      if (!next && unread > 0) {
        markAllRead();
      }
      setOpen(next);
    },
    [unread, markAllRead],
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
    markRead(id);
    handleOpen(false);
  };

  const visibleUnread = visible.filter((n) => !n.read).length;

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
          {visibleUnread > 0 && (
            <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 rounded-full bg-destructive text-white text-[10px] font-bold leading-none flex items-center justify-center px-1 ring-2 ring-background">
              {formatCountBadge(visibleUnread, lang, 9)}
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
              <div className="flex items-center gap-0.5">
                {visibleUnread > 0 && (
                  <button
                    onClick={markAllRead}
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                    Mark all read
                  </button>
                )}
                {/* Close — same neutral circular style as the modal close buttons */}
                <button
                  onClick={() => handleOpen(false)}
                  aria-label="Close notifications"
                  className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground/70 cursor-pointer transition-all hover:bg-secondary/60 hover:text-foreground hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="max-h-80 overflow-y-auto">
              {visible.length === 0 ? (
                <div className="px-4 py-10 text-center">
                  <Inbox className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">No notifications yet.</p>
                </div>
              ) : (
                <ul className="divide-y divide-border/40">
                  {visible.slice(0, 8).map((n) => {
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

            {visible.length > 8 && (
              <div className="px-4 py-2 border-t border-border/40 text-center">
                <Link
                  to="/notifications"
                  onClick={() => handleOpen(false)}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  View all
                </Link>
              </div>
            )}
          </div>
      )}
    </div>
  );
}
