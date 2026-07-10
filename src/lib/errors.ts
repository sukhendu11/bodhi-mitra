import { toast } from "sonner";

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
