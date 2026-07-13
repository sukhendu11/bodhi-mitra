import { useState, useRef, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { Bell, CheckCheck, MessageSquare, CornerDownRight, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAdminNotifications } from "@/lib/notifications";

const TYPE_ICONS = {
  new_comment: MessageSquare,
  comment_reply: CornerDownRight,
  contact_message: Inbox,
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { notifications, unreadCount, markAllRead } = useAdminNotifications();

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg text-muted-foreground/60 hover:text-foreground hover:bg-secondary/60 transition-colors"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-80 bg-white dark:bg-zinc-900 rounded-xl border border-border/60 shadow-lg overflow-hidden z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
            <h3 className="text-xs font-semibold">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={() => {
                  markAllRead();
                }}
                className="flex items-center gap-1 text-[0.55rem] text-muted-foreground hover:text-foreground transition-colors"
              >
                <CheckCheck className="h-3 w-3" />
                Mark all read
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <Inbox className="h-6 w-6 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-xs text-muted-foreground">No notifications yet.</p>
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto divide-y divide-border/30">
              {notifications.map((n) => {
                const Icon = TYPE_ICONS[n.type] ?? Bell;
                return (
                  <div
                    key={n.id}
                    className={cn(
                      "px-4 py-3 flex items-start gap-3 transition-colors",
                      n.read ? "opacity-60" : "bg-amber-50/30 dark:bg-amber-950/10",
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-4 w-4 mt-0.5 shrink-0",
                        n.read ? "text-muted-foreground/40" : "text-amber-600 dark:text-amber-400",
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      {n.link ? (
                        <Link
                          to={n.link as any}
                          className="text-xs hover:underline"
                          onClick={() => setOpen(false)}
                        >
                          {n.message}
                        </Link>
                      ) : (
                        <p className="text-xs">{n.message}</p>
                      )}
                      <p className="text-[0.55rem] text-muted-foreground/60 mt-0.5">
                        {formatTimeAgo(n.created_at)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function formatTimeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
