/**
 * Global test setup loaded via `bunfig.toml`.
 *
 * Keeps the unit suite hermetic: no network, deterministic env vars, and a
 * sensible default `globalThis.fetch` that screams loudly if a test forgets
 * to install its own mock.
 */

// Sensible defaults so handler-level checks (e.g. `env.ANTHROPIC_API_KEY`)
// don't accidentally short-circuit. Tests can override per-case.
process.env.ANTHROPIC_API_KEY ??= "sk-ant-test-fake-key";

// We want every test that hits the network to opt in explicitly. Replace the
// default fetch with a loud version so an un-mocked call surfaces fast.
const originalFetch = globalThis.fetch;
let loudFetchEnabled = !process.env.PERIGON_API_KEY;

if (loudFetchEnabled) {
  // Smoke tests rely on the real fetch; only override when not running them.
  // Note: the smoke suite explicitly imports and restores `originalFetch`.
  // We cast through `unknown` because Node's `typeof fetch` declares an
  // additional `preconnect` method that we don't need to stub.
  globalThis.fetch = ((async (input: RequestInfo | URL) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
    throw new Error(
      `Unmocked fetch in tests: ${url}. Use installFetchMock from test/helpers/mock-fetch.ts.`
    );
  }) as unknown) as typeof fetch;
}

// Re-export for tests that need the unmocked fetch (e.g. smoke tests).
export const realFetch = originalFetch;
