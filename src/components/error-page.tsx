import { useRouter } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { isAppError, getUserMessage } from "@/lib/errors";
import { captureError } from "@/lib/errors";

interface ErrorPageProps {
  error: Error;
  reset?: () => void;
  title?: string;
}

export function ErrorPage({ error, reset, title }: ErrorPageProps) {
  captureError(error, { component: "ErrorPage" });
  const router = useRouter();

  const statusCode = isAppError(error) ? error.statusCode : 500;
  const userMessage = getUserMessage(error);
  const displayTitle = title ?? (statusCode === 404 ? "Page not found" : "Something went wrong");

  return (
    <div className="flex min-h-[50vh] items-center justify-center px-4">
      <div className="max-w-md text-center">
        {statusCode && <p className="font-serif text-6xl text-foreground/20 mb-4">{statusCode}</p>}
        <h1 className="text-xl font-semibold tracking-tight">{displayTitle}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{userMessage}</p>
        <div className="mt-6 flex items-center justify-center gap-3">
          {reset && (
            <button
              onClick={() => {
                router.invalidate();
                reset();
              }}
              className="border-b border-foreground/40 pb-0.5 text-sm tracking-wide hover:border-foreground transition-colors"
            >
              Try again
            </button>
          )}
          <Link
            to="/"
            className="border-b border-foreground/40 pb-0.5 text-sm tracking-wide hover:border-foreground transition-colors"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export function NotFoundPage() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center px-4">
      <div className="max-w-md text-center">
        <p className="font-serif text-7xl text-foreground/20">404</p>
        <h1 className="mt-4 text-xl font-semibold tracking-tight">
          This page has drifted into stillness.
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link
          to="/"
          className="mt-6 inline-block border-b border-foreground/40 pb-0.5 text-sm tracking-wide hover:border-foreground transition-colors"
        >
          Return home
        </Link>
      </div>
    </div>
  );
}
