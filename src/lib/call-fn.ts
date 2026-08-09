/**
 * Typed wrapper for TanStack Start server function calls.
 *
 * useServerFn() returns a function whose type includes the server-side
 * context parameter, but the client only passes { data }. This helper
 * strips the context and provides a clean typed call.
 *
 * Usage:
 *   const doSomething = useServerFn(someServerFn);
 *   const result = await callFn(doSomething, { bookId: "123" });
 *   // result is properly typed
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function callFn<T>(fn: (...args: any[]) => Promise<T>, data?: Record<string, unknown>): Promise<T> {
  return fn({ data });
}
