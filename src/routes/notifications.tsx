import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuthSession } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";
import { useLang, timeAgo, toBanglaDigits } from "@/lib/i18n";
import { getSiteName } from "@/lib/siteSettings";
import { seoHead } from "@/lib/seo";
import { ErrorPage } from "@/components/error-page";
import { BrandCtaButton } from "@/components/BrandCtaButton";
import { Bell, CheckCheck, Inbox, ArrowLeft, User } from "lucide-react";

export const Route = createFileRoute("/notifications")({
  loader: () => getSiteName(),
  head: ({ loaderData }) =>
    seoHead({
      title: "Notifications",
      description: "Your notifications.",
      path: "/notifications",
      siteName: loaderData,
      noIndex: true,
    }),
  component: NotificationsPage,
  errorComponent: ({ error }) => <ErrorPage error={error} />,
});

function NotificationsPage() {
  const { user, loading } = useAuthSession();
  const { lang } = useLang();
  const { visible, unread, markRead, markAllRead } = useNotifications(user?.id ?? null);

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-20 md:py-28">
        <div className="h-4 w-24 skeleton-shimmer rounded mb-8" />
        <div className="rounded-2xl border border-border/50 bg-card p-6 shadow-sm">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-start gap-3 py-3" style={{ animationDelay: `${i * 80}ms` }}>
              <div className="h-8 w-8 rounded-full skeleton-shimmer shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 skeleton-shimmer rounded w-4/5" />
                <div className="h-2.5 skeleton-shimmer rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-20 md:py-28 text-center">
        <User className="h-12 w-12 mx-auto text-muted-foreground/20 mb-4" />
        <h1 className="font-serif text-3xl text-foreground mb-3">
          {lang === "bn" ? "বিজ্ঞপ্তি" : "Notifications"}
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          {lang === "bn"
            ? "আপনার বিজ্ঞপ্তি দেখতে সাইন ইন করুন।"
            : "Sign in to view your notifications."}
        </p>
        <BrandCtaButton asChild className="px-6 py-2.5 text-xs uppercase tracking-[0.2em]">
          <Link
            to="/login"
            search={{
              message: lang === "bn" ? "আপনার বিজ্ঞপ্তি দেখতে সাইন ইন করুন" : "Sign in to view your notifications",
              redirect: "/notifications",
            }}
          >
            {lang === "bn" ? "সাইন ইন" : "Sign in"}
          </Link>
        </BrandCtaButton>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-20 md:py-28">
      <Link
        to="/profile"
        className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors"
      >
        <ArrowLeft className="h-3 w-3" /> {lang === "bn" ? "প্রোফাইল" : "Profile"}
      </Link>

      <div className="mt-8">
        <div className="flex items-center gap-2 text-sm text-foreground mb-6">
          <Bell className="h-5 w-5 text-[var(--color-saffron)]/70" />
          <h1 className="font-serif text-2xl md:text-3xl tracking-tight">
            {lang === "bn" ? "বিজ্ঞপ্তি" : "Notifications"}
          </h1>
          {unread > 0 && (
            <span className="inline-flex items-center rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-medium text-destructive">
              {lang === "bn" ? toBanglaDigits(unread) : unread}{" "}
              {lang === "bn" ? "অপঠিত" : "unread"}
            </span>
          )}
          {unread > 0 && (
            <button
              type="button"
              onClick={markAllRead}
              className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              {lang === "bn" ? "সব পড়া হয়েছে" : "Mark all read"}
            </button>
          )}
        </div>

        {visible.length === 0 ? (
          <div className="rounded-2xl border border-border/50 bg-card p-10 text-center shadow-sm">
            <Inbox className="h-10 w-10 mx-auto text-muted-foreground/20 mb-3" />
            <p className="text-sm text-muted-foreground">
              {lang === "bn" ? "এখনো কোনো বিজ্ঞপ্তি নেই।" : "No notifications yet."}
            </p>
          </div>
        ) : (
          <ul className="rounded-2xl border border-border/50 bg-card shadow-sm divide-y divide-border/40 overflow-hidden">
            {visible.map((n) => {
              const row = (
                <span
                  className={`flex w-full items-start gap-3 px-5 py-3.5 text-left ${
                    n.read ? "opacity-60" : ""
                  }`}
                >
                  <span
                    className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${
                      n.read ? "bg-transparent" : "bg-destructive"
                    }`}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm text-foreground leading-snug break-words">
                      {n.message}
                    </span>
                    <span className="block mt-1 text-xs text-muted-foreground/70">
                      {timeAgo(n.createdAt, lang)}
                    </span>
                  </span>
                </span>
              );
              return (
                <li key={n.id}>
                  {n.link ? (
                    <Link
                      to={n.link}
                      onClick={() => markRead(n.id)}
                      className="block transition-colors hover:bg-secondary/30"
                    >
                      {row}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => markRead(n.id)}
                      className="block w-full transition-colors hover:bg-secondary/30"
                    >
                      {row}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
