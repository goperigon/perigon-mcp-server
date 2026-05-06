/**
 * Hand-rolled stub for the `Perigon` client used by MCP tools.
 *
 * Every method the tools call defaults to throwing — that way a test that
 * forgets to override the right method fails immediately instead of silently
 * returning `undefined`. Tests pass overrides via `createMockPerigon({...})`.
 */

import { mock } from "bun:test";
import type { Perigon } from "../../worker/lib/perigon";

type AnyAsyncFn = (...args: any[]) => Promise<any>;

export interface MockPerigonOverrides {
  // V1Api search methods
  searchArticles?: AnyAsyncFn;
  searchStories?: AnyAsyncFn;
  searchJournalists?: AnyAsyncFn;
  searchSources?: AnyAsyncFn;
  searchPeople?: AnyAsyncFn;
  searchCompanies?: AnyAsyncFn;
  searchTopics?: AnyAsyncFn;
  searchWikipedia?: AnyAsyncFn;
  vectorSearchArticles?: AnyAsyncFn;
  vectorSearchWikipedia?: AnyAsyncFn;
  searchSummarizer?: AnyAsyncFn;

  // Perigon-extended methods
  searchStoriesHistory?: AnyAsyncFn;
  getAvgSentiment?: AnyAsyncFn;
  getArticleCounts?: AnyAsyncFn;
  getTopEntities?: AnyAsyncFn;
  getTopPeople?: AnyAsyncFn;
  getTopCompanies?: AnyAsyncFn;
  introspection?: AnyAsyncFn;
}

const ALL_METHODS = [
  "searchArticles",
  "searchStories",
  "searchJournalists",
  "searchSources",
  "searchPeople",
  "searchCompanies",
  "searchTopics",
  "searchWikipedia",
  "vectorSearchArticles",
  "vectorSearchWikipedia",
  "searchSummarizer",
  "searchStoriesHistory",
  "getAvgSentiment",
  "getArticleCounts",
  "getTopEntities",
  "getTopPeople",
  "getTopCompanies",
  "introspection",
] as const;

export type MockPerigon = Perigon & {
  [K in (typeof ALL_METHODS)[number]]: ReturnType<typeof mock>;
};

/**
 * Build a fake `Perigon` instance. Every method is a `bun:test` mock so tests
 * can assert on call counts and arguments. By default each method rejects
 * with a "not stubbed" error so tests fail loudly when the wrong method gets
 * called.
 */
export function createMockPerigon(
  overrides: MockPerigonOverrides = {}
): MockPerigon {
  const fake: Record<string, unknown> = { apiKey: "fake-key" };

  for (const method of ALL_METHODS) {
    const override = overrides[method];
    if (override) {
      fake[method] = mock(override);
    } else {
      fake[method] = mock(async (..._args: unknown[]) => {
        throw new Error(`MockPerigon: method ${method} was not stubbed for this test`);
      });
    }
  }

  return fake as unknown as MockPerigon;
}

/**
 * Convenience: extract the first call's argument from a mocked Perigon method.
 * `expect(spy.mock.calls[0][0])...` works fine but reads worse.
 */
export function firstCallArgs<T = unknown>(
  fn: ReturnType<typeof mock>
): T {
  if (!fn.mock.calls.length) {
    throw new Error("Mock has not been called");
  }
  return fn.mock.calls[0][0] as T;
}
