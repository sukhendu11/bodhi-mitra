import { toast } from "sonner";

/* ═══════════════════════════════════════════════════════════════════
 * ║  Error Types & Classes                                        ║
 * ═══════════════════════════════════════════════════════════════════ */

export type ErrorCategory = "auth" | "permission" | "validation" | "not_found" | "server" | "network" | "unknown";

export interface AppErrorOptions {
  message: string;
  code?: string;
  statusCode?: number;
  category?: ErrorCategory;
  userMessage?: string;
  details?: Record<string, unknown>;
  cause?: unknown;
}

export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly category: ErrorCategory;
  public readonly userMessage: string;
  public readonly details?: Record<string, unknown>;

  constructor(options: AppErrorOptions) {
    super(options.message);
    this.name = "AppError";
    this.code = options.code ?? "UNKNOWN_ERROR";
    this.statusCode = options.statusCode ?? 500;
    this.category = options.category ?? "unknown";
    this.userMessage = options.userMessage ?? options.message;
    this.details = options.details;
    if (options.cause instanceof Error) {
      this.cause = options.cause;
    }
  }

  static auth(message: string, details?: Record<string, unknown>): AppError {
    return new AppError({ message, code: "AUTH_ERROR", statusCode: 401, category: "auth", userMessage: "Please sign in to continue.", details });
  }

  static permission(message: string, details?: Record<string, unknown>): AppError {
    return new AppError({ message, code: "PERMISSION_DENIED", statusCode: 403, category: "permission", userMessage: "You don't have permission to perform this action.", details });
  }

  static notFound(entity?: string, details?: Record<string, unknown>): AppError {
    return new AppError({
      message: entity ? `${entity} not found` : "Resource not found",
      code: "NOT_FOUND",
      statusCode: 404,
      category: "not_found",
      userMessage: entity ? `The requested ${entity} could not be found.` : "The requested resource could not be found.",
      details,
    });
  }

  static validation(message: string, details?: Record<string, unknown>): AppError {
    return new AppError({ message, code: "VALIDATION_ERROR", statusCode: 400, category: "validation", userMessage: message, details });
  }

  static server(message: string, details?: Record<string, unknown>): AppError {
    return new AppError({ message, code: "SERVER_ERROR", statusCode: 500, category: "server", userMessage: "Something went wrong on our end. Please try again.", details });
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function getUserMessage(error: unknown): string {
  if (isAppError(error)) return error.userMessage;
  if (error instanceof Error) return error.message;
  return "An unexpected error occurred.";
}

export function toastError(error: unknown): void {
  const message = getUserMessage(error);
  toast.error(message);
}

/* ═══════════════════════════════════════════════════════════════════
 * ║  Error Reporting & Capture                                    ║
 * ═══════════════════════════════════════════════════════════════════ */

export interface ErrorContext {
  component?: string;
  action?: string;
  route?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}

export function captureError(error: unknown, context?: ErrorContext): void {
  const category = isAppError(error) ? error.category : "unknown";
  const code = isAppError(error) ? error.code : "UNKNOWN_ERROR";
  const message = error instanceof Error ? error.message : String(error);

  const entry = {
    category,
    code,
    message,
    timestamp: new Date().toISOString(),
    ...context,
  };

  if (import.meta.env.DEV) {
    console.group(`[Error] ${code}`);
    console.error(message, error);
    if (context) console.log("Context:", context);
    console.groupEnd();
  } else {
    console.error(`[${category}] ${code}: ${message}`, error, context);
  }

  if (typeof window !== "undefined" && "fetch" in window) {
    try {
      const body = JSON.stringify(entry);
      navigator.sendBeacon?.("/api/log-error", body);
    } catch {
      // silent
    }
  }
}

export function reportError(error: unknown, metadata?: Record<string, unknown>): void {
  captureError(error, { metadata });

  if (typeof window !== "undefined" && typeof document !== "undefined") {
    try {
      const detail = {
        error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
        url: location.href,
        timestamp: new Date().toISOString(),
        ...metadata,
      };
      window.dispatchEvent(new CustomEvent("app-error", { detail }));
    } catch {
      // silent
    }
  }
}

/* ═══════════════════════════════════════════════════════════════════
 * ║  Server-side Error Capture (SSR)                              ║
 * ═══════════════════════════════════════════════════════════════════
 * Captures the original Error out-of-band so server.ts can recover
 * the stack when h3 has already swallowed the throw into a generic
 * 500 Response.                                                   */

let lastCapturedError: { error: unknown; at: number } | undefined;
const TTL_MS = 5_000;

function recordError(error: unknown) {
  lastCapturedError = { error, at: Date.now() };
}

if (typeof globalThis.addEventListener === "function") {
  globalThis.addEventListener("error", (event) => recordError((event as ErrorEvent).error ?? event));
  globalThis.addEventListener("unhandledrejection", (event) =>
    recordError((event as PromiseRejectionEvent).reason),
  );
}

export function consumeLastCapturedError(): unknown {
  if (!lastCapturedError) return undefined;
  if (Date.now() - lastCapturedError.at > TTL_MS) {
    lastCapturedError = undefined;
    return undefined;
  }
  const { error } = lastCapturedError;
  lastCapturedError = undefined;
  return error;
}

/* ═══════════════════════════════════════════════════════════════════
 * ║  Server-side Error HTML Page (SSR fallback)                   ║
 * ═══════════════════════════════════════════════════════════════════ */

export function renderErrorPage(): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>This page didn't load</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body { font: 15px/1.5 system-ui, -apple-system, sans-serif; background: #fafafa; color: #111; display: grid; place-items: center; min-height: 100vh; margin: 0; padding: 1.5rem; }
      .card { max-width: 28rem; width: 100%; text-align: center; padding: 2rem; }
      h1 { font-size: 1.25rem; margin: 0 0 0.5rem; }
      p { color: #4b5563; margin: 0 0 1.5rem; }
      .actions { display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap; }
      a, button { padding: 0.5rem 1rem; border-radius: 0.375rem; font: inherit; cursor: pointer; text-decoration: none; border: 1px solid transparent; }
      .primary { background: #111; color: #fff; }
      .secondary { background: #fff; color: #111; border-color: #d1d5db; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>This page didn't load</h1>
      <p>Something went wrong on our end. You can try refreshing or head back home.</p>
      <div class="actions">
        <button class="primary" onclick="location.reload()">Try again</button>
        <a class="secondary" href="/">Go home</a>
      </div>
    </div>
  </body>
</html>`;
}
