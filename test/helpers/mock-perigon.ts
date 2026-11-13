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
  // V1Api search methods (from the SDK base class)
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
  introspection?: AnyAsyncFn;
  listMonitors?: AnyAsyncFn;
  getMonitor?: AnyAsyncFn;
  createMonitor?: AnyAsyncFn;
  updateMonitor?: AnyAsyncFn;
  activateMonitor?: AnyAsyncFn;
  pauseMonitor?: AnyAsyncFn;
  archiveMonitor?: AnyAsyncFn;
  getMonitorEvents?: AnyAsyncFn;
  getMonitorNewsletters?: AnyAsyncFn;
  getMonitorSummaries?: AnyAsyncFn;
  getAvgSentiment?: AnyAsyncFn;
  getArticleCounts?: AnyAsyncFn;
  getTopEntities?: AnyAsyncFn;
  getTopPeople?: AnyAsyncFn;
  getTopCompanies?: AnyAsyncFn;
  searchStoriesHistory?: AnyAsyncFn;
  getLimits?: AnyAsyncFn;
  getSourceById?: AnyAsyncFn;
  getTopTopics?: AnyAsyncFn;
  getStoryStats?: AnyAsyncFn;
  getStoryVelocity?: AnyAsyncFn;
  searchArticlesFull?: AnyAsyncFn;
  searchJournalistsFull?: AnyAsyncFn;
  searchStoriesFull?: AnyAsyncFn;
  listWatchlists?: AnyAsyncFn;
  getWatchlist?: AnyAsyncFn;
  resolveWatchlists?: AnyAsyncFn;
  createWatchlist?: AnyAsyncFn;
  updateWatchlist?: AnyAsyncFn;
  listSourceGroups?: AnyAsyncFn;
  getSourceGroup?: AnyAsyncFn;
  resolveSourceGroups?: AnyAsyncFn;
  createSourceGroup?: AnyAsyncFn;
  updateSourceGroup?: AnyAsyncFn;
  listContactPoints?: AnyAsyncFn;
  getContactPoint?: AnyAsyncFn;
  getArticleRefreshJob?: AnyAsyncFn;
  peekArticleRefresh?: AnyAsyncFn;
  searchXPosts?: AnyAsyncFn;
  searchRedditPosts?: AnyAsyncFn;
  searchLinkedInPosts?: AnyAsyncFn;
  getLinkedInPersonActivity?: AnyAsyncFn;
  getLinkedInCompanyPosts?: AnyAsyncFn;
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
  "introspection",
  "listMonitors",
  "getMonitor",
  "createMonitor",
  "updateMonitor",
  "activateMonitor",
  "pauseMonitor",
  "archiveMonitor",
  "getMonitorEvents",
  "getMonitorNewsletters",
  "getMonitorSummaries",
  "getAvgSentiment",
  "getArticleCounts",
  "getTopEntities",
  "getTopPeople",
  "getTopCompanies",
  "searchStoriesHistory",
  "getLimits",
  "getSourceById",
  "getTopTopics",
  "getStoryStats",
  "getStoryVelocity",
  "searchArticlesFull",
  "searchJournalistsFull",
  "searchStoriesFull",
  "listWatchlists",
  "getWatchlist",
  "resolveWatchlists",
  "createWatchlist",
  "updateWatchlist",
  "listSourceGroups",
  "getSourceGroup",
  "resolveSourceGroups",
  "createSourceGroup",
  "updateSourceGroup",
  "listContactPoints",
  "getContactPoint",
  "getArticleRefreshJob",
  "peekArticleRefresh",
  "searchXPosts",
  "searchRedditPosts",
  "searchLinkedInPosts",
  "getLinkedInPersonActivity",
  "getLinkedInCompanyPosts",
] as const;

type MockedMethod = (typeof ALL_METHODS)[number];

export type MockPerigon = Perigon & {
  [K in MockedMethod]: ReturnType<typeof mock>;
};

/** The request (first argument) type of a `Perigon` method. */
export type PerigonRequest<K extends MockedMethod> = NonNullable<
  Parameters<Extract<Perigon[K], (...args: never[]) => unknown>>[0]
>;

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

/** Every request a mocked Perigon method received, typed by the method. */
export function requestsOf<K extends MockedMethod>(
  perigon: MockPerigon,
  method: K
): PerigonRequest<K>[] {
  return perigon[method].mock.calls.map((args: unknown[], i: number) => {
    if (args[0] === undefined) {
      throw new Error(`Mock ${method} call ${i} had no request`);
    }
    return args[0] as PerigonRequest<K>;
  });
}

/** The first request a mocked Perigon method received, typed by the method. */
export function firstRequestOf<K extends MockedMethod>(
  perigon: MockPerigon,
  method: K
): PerigonRequest<K> {
  const requests = requestsOf(perigon, method);
  if (requests.length === 0) {
    throw new Error(`Mock ${method} has not been called`);
  }
  return requests[0];
}
