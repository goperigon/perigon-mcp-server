/**
 * Helpers for stubbing `globalThis.fetch` from inside a test. Each test that
 * wants network I/O calls `installFetchMock(handler)` and pairs it with
 * `restoreFetch()` in an `afterEach`.
 */

type FetchHandler = (
  input: RequestInfo | URL,
  init?: RequestInit
) => Response | Promise<Response>;

const originalFetch = globalThis.fetch;

export function installFetchMock(handler: FetchHandler): void {
  // Cast through `unknown`: Node's `typeof fetch` includes a `preconnect`
  // method our mock doesn't (and shouldn't) implement.
  globalThis.fetch = ((async (input: RequestInfo | URL, init?: RequestInit) => {
    const result = handler(input, init);
    return await result;
  }) as unknown) as typeof fetch;
}

export function restoreFetch(): void {
  globalThis.fetch = originalFetch;
}

/** Resolve any fetch input to a plain URL string for assertions. */
export function urlOf(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

/** Convenience: build a JSON Response. */
export function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
    ...init,
  });
}
