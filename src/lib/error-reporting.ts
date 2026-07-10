import { isAppError } from "./errors";

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
    }
  }
}
