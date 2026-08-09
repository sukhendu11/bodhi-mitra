import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, PenLine, Trash2, MessageSquareQuote } from "lucide-react";
import {
  fetchBookReviews,
  getUserBookReview,
  submitBookReview,
  deleteBookReview,
  type BookReview,
} from "@/lib/books-reviews";
import { StarRating } from "@/components/StarRating";
import { LetterAvatar } from "@/components/LetterAvatar";
import { BrandCtaButton } from "@/components/BrandCtaButton";

interface BookReviewsProps {
  bookId: string;
  lang: string;
  user: { id: string; name?: string | null; email?: string | null } | null;
  /** Open the page-level AuthModal (auth-gated composer). */
  requireAuth: (action: string) => void;
}

const MAX_PREVIEW = 50;

function formatDate(iso: string, lang: string) {
  const locale = lang === "bn" ? "bn-BD" : "en-US";
  try {
    return new Date(iso).toLocaleDateString(locale, { month: "long", day: "numeric", year: "numeric" });
  } catch {
    return new Date(iso).toDateString();
  }
}

function excerpt(body: string) {
  const trimmed = body.trim();
  return trimmed.length > MAX_PREVIEW ? `${trimmed.slice(0, MAX_PREVIEW).trimEnd()}…` : trimmed;
}

export function BookReviews({ bookId, lang, user, requireAuth }: BookReviewsProps) {
  const queryClient = useQueryClient();
  const bn = lang === "bn";

  /* ── Data ─────────────────────────────────────────────────── */
  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ["book-reviews", bookId],
    queryFn: () => fetchBookReviews(bookId),
    staleTime: 30_000,
  });

  const { data: myReview } = useQuery({
    queryKey: ["book-my-review", bookId, user?.id],
    queryFn: () => getUserBookReview(user!.id, bookId),
    enabled: !!user,
    staleTime: 30_000,
  });

  /* ── Composer state ───────────────────────────────────────── */
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  // Prefill the composer when the user's existing review loads.
  useEffect(() => {
    if (myReview) {
      setRating(myReview.rating);
      setTitle(myReview.title);
      setBody(myReview.body);
    }
  }, [myReview]);

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["book-reviews", bookId] });
    queryClient.invalidateQueries({ queryKey: ["book-my-review", bookId] });
    queryClient.invalidateQueries({ queryKey: ["book-rating-agg", bookId] });
    queryClient.invalidateQueries({ queryKey: ["book-user-rating", bookId] });
    queryClient.invalidateQueries({ queryKey: ["public-books"] });
  };

  /* ── Submit mutation ──────────────────────────────────────── */
  const submitMutation = useMutation({
    mutationFn: () =>
      submitBookReview({
        userId: user!.id,
        bookId,
        rating,
        title,
        body,
        authorName: user?.name || user?.email?.split("@")[0] || undefined,
      }),
    onSuccess: () => {
      toast.success(bn ? "পর্যালোচনা সংরক্ষিত হয়েছে" : "Review published");
      setExpanded(false);
      invalidateAll();
    },
    onError: (err: Error) => toast.error(err.message || (bn ? "পর্যালোচনা পাঠানো যায়নি" : "Failed to publish review")),
  });

  /* ── Delete mutation ──────────────────────────────────────── */
  const deleteMutation = useMutation({
    mutationFn: () => deleteBookReview(user!.id, bookId),
    onSuccess: () => {
      toast.success(bn ? "পর্যালোচনা মুছে ফেলা হয়েছে" : "Review deleted");
      setRating(0);
      setTitle("");
      setBody("");
      setConfirmingDelete(false);
      invalidateAll();
    },
    onError: (err: Error) => toast.error(err.message || (bn ? "মুছে ফেলা যায়নি" : "Failed to delete review")),
  });

  const handleSubmit = () => {
    if (!user) {
      requireAuth("review");
      return;
    }
    if (rating < 1) {
      toast.error(bn ? "অনুগ্রহ করে একটি রেটিং দিন" : "Please select a star rating");
      return;
    }
    if (body.trim().length < 10) {
      toast.error(bn ? "পর্যালোচনা অন্তত ১০ অক্ষরের হতে হবে" : "Review must be at least 10 characters");
      return;
    }
    submitMutation.mutate();
  };

  const pending = submitMutation.isPending || deleteMutation.isPending;

  return (
    <section aria-labelledby="book-reviews-heading">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
        <div>
          <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground font-medium mb-1 flex items-center gap-1.5">
            <MessageSquareQuote className="h-3.5 w-3.5" />
            {bn ? "পাঠকের পর্যালোচনা" : "Reader Reviews"}
          </p>
          <h2 id="book-reviews-heading" className="font-serif text-xl md:text-2xl">
            {bn ? "পাঠকরা কী বলছেন" : "What readers are saying"}
          </h2>
        </div>
        {reviews.length > 0 && (
          <span className="text-sm text-muted-foreground">
            {reviews.length} {bn ? "টি পর্যালোচনা" : reviews.length === 1 ? "review" : "reviews"}
          </span>
        )}
      </div>

      {/* Composer */}
      <div className="rounded-xl border border-border/50 bg-card p-5 md:p-6 shadow-sm mb-8 relative before:absolute before:top-0 before:left-4 before:right-4 before:h-px before:bg-primary/30">
        {!user ? (
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              {bn ? "কিছু বলার আছে? সাইন ইন করে আপনার রেটিং ও পর্যালোচনা শেয়ার করুন।" : "Have something to share? Sign in to rate and review this book."}
            </p>
            <BrandCtaButton
              type="button"
              onClick={() => requireAuth("review")}
              className="px-4 py-2 text-sm"
            >
              <PenLine className="h-4 w-4" />
              {bn ? "সাইন ইন করুন" : "Sign in to review"}
            </BrandCtaButton>
          </div>
        ) : myReview ? (
          /* Edit mode — user already reviewed */
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium">
                {bn ? "আপনার পর্যালোচনা" : "Your review"}
              </p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (confirmingDelete) {
                      deleteMutation.mutate();
                    } else {
                      setConfirmingDelete(true);
                      setTimeout(() => setConfirmingDelete(false), 3500);
                    }
                  }}
                  disabled={pending}
                  className="inline-flex items-center gap-1.5 text-xs text-destructive/80 hover:text-destructive transition-colors disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {confirmingDelete ? (bn ? "নিশ্চিত করুন" : "Confirm delete?") : (bn ? "মুছুন" : "Delete")}
                </button>
                <button
                  type="button"
                  onClick={() => setExpanded((v) => !v)}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {expanded ? (bn ? "বন্ধ করুন" : "Collapse") : (bn ? "সম্পাদনা করুন" : "Edit")}
                </button>
              </div>
            </div>
            {!expanded && (
              <div className="text-sm text-muted-foreground leading-relaxed">
                {myReview.title && <p className="font-medium text-foreground/80 mb-1">{myReview.title}</p>}
                <p>{excerpt(myReview.body)}</p>
              </div>
            )}
            {expanded && <ReviewFormFields rating={rating} setRating={setRating} title={title} setTitle={setTitle} body={body} setBody={setBody} />}
            {expanded && (
              <div className="flex justify-end">
                <SubmitButton onClick={handleSubmit} pending={pending} bn={bn} edit />
              </div>
            )}
          </div>
        ) : (
          /* New review — always expanded */
          <div className="space-y-4">
            <p className="text-sm font-medium">
              {bn ? "আপনার রেটিং ও পর্যালোচনা লিখুন" : "Write a review"}
            </p>
            <ReviewFormFields rating={rating} setRating={setRating} title={title} setTitle={setTitle} body={body} setBody={setBody} />
            <div className="flex justify-end">
              <SubmitButton onClick={handleSubmit} pending={pending} bn={bn} />
            </div>
          </div>
        )}
      </div>

      {/* Reviews list */}
      {isLoading ? (
        <div className="space-y-4">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="rounded-xl border border-border/50 bg-secondary/10 p-5 md:p-6"
            >
              <div className="flex items-start gap-4">
                <div className="h-11 w-11 rounded-full skeleton-shimmer shrink-0" style={{ animationDelay: `${i * 90}ms` }} />
                <div className="flex-1 space-y-3 pt-1">
                  <div className="h-3 w-32 skeleton-shimmer rounded" style={{ animationDelay: `${i * 90}ms` }} />
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <div key={s} className="h-3.5 w-3.5 skeleton-shimmer rounded" style={{ animationDelay: `${i * 90}ms` }} />
                    ))}
                  </div>
                  <div className="h-3 w-full skeleton-shimmer rounded" style={{ animationDelay: `${i * 90}ms` }} />
                  <div className="h-3 w-2/3 skeleton-shimmer rounded" style={{ animationDelay: `${i * 90}ms` }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-10 text-sm text-muted-foreground">
          {bn ? "এখনও কোনো পর্যালোচনা নেই। প্রথমটি লিখুন!" : "No reviews yet. Be the first to share one!"}
        </div>
      ) : (
        <div className="space-y-5">
          {reviews.map((r) => (
            <article
              key={r.id}
              className="rounded-xl border border-border/50 bg-secondary/10 p-5 md:p-6 transition-colors hover:bg-secondary/15"
            >
              <div className="flex items-start gap-4">
                <LetterAvatar name={r.author_name} size={44} />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <p className="text-sm font-medium">{r.author_name}</p>
                    <span className="text-xs text-muted-foreground/60">{formatDate(r.created_at, lang)}</span>
                  </div>
                  <div className="mt-1.5">
                    <StarRating value={r.rating} size="h-3.5 w-3.5" />
                  </div>
                  {r.title && (
                    <p className="mt-2.5 text-sm font-semibold text-foreground/90">{r.title}</p>
                  )}
                  <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{r.body}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

/* ─── Composer form fields ──────────────────────────────────────── */

function ReviewFormFields({
  rating,
  setRating,
  title,
  setTitle,
  body,
  setBody,
}: {
  rating: number;
  setRating: (v: number) => void;
  title: string;
  setTitle: (v: string) => void;
  body: string;
  setBody: (v: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <StarRating value={rating} onChange={setRating} size="h-5 w-5" showValue />
        <span className="text-xs text-muted-foreground/70">1–5</span>
      </div>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={80}
        placeholder="Review title (optional)"
        aria-label="Review title (optional)"
        className="w-full text-sm bg-transparent border-b border-border/60 focus:border-foreground/40 outline-none py-2 placeholder:text-muted-foreground/50 transition-colors"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        maxLength={1000}
        rows={4}
        placeholder="Share what this book meant to you…"
        aria-label="Review body"
        className="w-full text-sm bg-transparent border border-border/60 rounded-lg focus:border-foreground/40 outline-none p-3 resize-y placeholder:text-muted-foreground/50 transition-colors"
      />
    </div>
  );
}

function SubmitButton({
  onClick,
  pending,
  bn,
  edit = false,
}: {
  onClick: () => void;
  pending: boolean;
  bn: boolean;
  edit?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium bg-foreground text-background rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
    >
      {pending && <Loader2 className="h-4 w-4 animate-spin" />}
      {edit ? (bn ? "পর্যালোচনা আপডেট করুন" : "Update review") : (bn ? "পর্যালোচনা প্রকাশ করুন" : "Publish review")}
    </button>
  );
}

export type { BookReview };
