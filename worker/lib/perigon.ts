import { Configuration, V1Api } from "@goperigon/perigon-ts";
import { AuthIntrospectionResponse, HttpError } from "../types/types";
import {
  MonitorCreateRequest,
  MonitorDto,
  MonitorEventDto,
  MonitorEventListParams,
  MonitorListParams,
  MonitorNewsletterDto,
  MonitorNewsletterListParams,
  MonitorOutputListParams,
  MonitorSingleResult,
  MonitorSummaryDto,
  MonitorTableResult,
  MonitorUpdateRequest,
} from "../types/monitors";
import {
  ApiLimitsDto,
  ArticleRefreshJobResponse,
  ArticleRefreshPeekResponse,
  ContactPointDto,
  CreateSourceGroupRequest,
  CreateWatchlistRequest,
  SingleResult,
  SourceGroupDto,
  TableResult,
  UpdateSourceGroupRequest,
  UpdateWatchlistRequest,
  WatchlistDto,
} from "../types/platform";
import { typedFetch } from "./typed-fetch";

const BASE_URL = "https://api.perigon.io/v1";

/**
 * Serialize a plain params object into URLSearchParams for raw-fetch calls:
 * arrays repeat the key (`?a=1&a=2`), Dates become ISO 8601 strings, and
 * `undefined`/`null` are omitted. Field names must already match the API's
 * query parameter names (they do for every params object built by the tool
 * layer, since those objects are constructed specifically to be passed to
 * the API).
 */
function buildQueryParams(params: Record<string, unknown>): URLSearchParams {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item === undefined || item === null) continue;
        sp.append(
          key,
          item instanceof Date ? item.toISOString() : String(item),
        );
      }
    } else if (value instanceof Date) {
      sp.set(key, value.toISOString());
    } else {
      sp.set(key, String(value));
    }
  }
  return sp;
}

/**
 * Retry a typed fetch on transient upstream failures (5xx + 429).
 * The /v1/stats/* endpoints are computationally heavy and occasionally throw
 * a 500 with a `reference = <id>` body — those are usually not deterministic
 * and succeed on a second attempt, so we transparently retry a few times
 * before bubbling the error up.
 */
async function fetchWithRetry<T>(
  url: string,
  options: RequestInit,
  attempts = 3,
  baseDelayMs = 400,
): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await typedFetch<T>(url, options);
    } catch (error) {
      lastError = error;
      const isRetryable =
        error instanceof HttpError &&
        (error.statusCode >= 500 || error.statusCode === 429);
      if (!isRetryable || i === attempts - 1) throw error;
      // exponential backoff with jitter
      const delay = baseDelayMs * Math.pow(2, i) + Math.random() * 200;
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastError;
}

export interface StoryHistoryParams {
  clusterId?: string[];
  from?: Date;
  to?: Date;
  sortBy?: "createdAt" | "triggeredAt";
  page?: number;
  size?: number;
  changelogExists?: boolean;
}

/** Shared article-filter params accepted by all /v1/stats/* endpoints */
export interface StatsArticleFilters {
  q?: string;
  from?: Date;
  to?: Date;
  source?: string[];
  sourceGroup?: string[];
  category?: string[];
  topic?: string[];
  language?: string[];
  country?: string[];
  personName?: string[];
  companyDomain?: string[];
  companySymbol?: string[];
  journalistId?: string[];
  personWikidataId?: string[];
  companyId?: string[];
  taxonomy?: string[];
  excludeSource?: string[];
  excludeCategory?: string[];
  excludeTopic?: string[];
}

/** Lowercase enum values accepted by the API for `splitBy`. NONE is represented by omitting the param. */
export type StatsSplitBy = "hour" | "day" | "week" | "month";

export interface StatsTimeSeriesParams extends StatsArticleFilters {
  splitBy?: StatsSplitBy;
}

export interface TopEntitiesParams extends StatsArticleFilters {
  entity?: string[];
  expandEntities?: boolean;
}

export interface TopSpikeParams extends StatsArticleFilters {
  currentFrom?: Date;
  currentTo?: Date;
  baselineFrom?: Date;
  baselineTo?: Date;
  normalizeByDay?: boolean;
  size?: number;
  minBaseline?: number;
  minCurrent?: number;
  smoothingAlpha?: number;
  sortByOverride?: string;
}

/** Single bucket from /v1/stats/intervalArticleCounts */
export interface CountStatDto {
  date: string;
  numResults: number;
}

/** Single bucket from /v1/stats/avgSentiment */
export interface AvgSentimentStatDto {
  date: string;
  numResults: number;
  avgSentiment: {
    positive: number;
    negative: number;
    neutral: number;
  };
}

/** Generic stats response wrapper (used by interval count + avg sentiment) */
export interface StatResult<T> {
  status: number;
  results: T[];
}

/** Single ranked entry returned by /v1/stats/topEntities for a given entity bucket */
export interface TopEntityItem {
  key: string;
  count: number;
}

/**
 * Response shape for /v1/stats/topEntities. The keys present depend on which
 * entity types were requested. Each entity bucket is paired with a `total*` field
 * indicating the size of the universe that was ranked.
 */
export interface TopEntitiesDto {
  totalArticles?: number;
  totalTopics?: number;
  topics?: TopEntityItem[];
  totalPeople?: number;
  people?: TopEntityItem[];
  totalCompanies?: number;
  companies?: TopEntityItem[];
  totalCities?: number;
  cities?: TopEntityItem[];
  totalJournalists?: number;
  journalists?: TopEntityItem[];
  totalSources?: number;
  sources?: TopEntityItem[];
}

/** Single entry in /v1/stats/topPeople */
export interface PersonSpike {
  wikidataId: string;
  spikeScore: number;
  currentMentions: number;
  baselineMentions: number;
  currentRatePerDay: number;
  baselineRatePerDay: number;
  person: {
    wikidataId: string;
    name: string;
    description?: string | null;
    occupation?: Array<{ wikidataId: string; label: string }>;
    [key: string]: unknown;
  };
}

/** Single entry in /v1/stats/topCompanies */
export interface CompanySpike {
  wikidataId: string;
  spikeScore: number;
  currentMentions: number;
  baselineMentions: number;
  currentRatePerDay: number;
  baselineRatePerDay: number;
  company: {
    id: string;
    name: string;
    domains?: string[];
    industry?: string | null;
    sector?: string | null;
    country?: string | null;
    description?: string | null;
    symbols?: Array<{ symbol: string; exchange: string }>;
    [key: string]: unknown;
  };
}

/** Wrapper shape returned by /v1/stats/topPeople and /v1/stats/topCompanies */
export interface SpikeResult<T> {
  total: number;
  data: T[];
}

export interface StoryHistoryKeyPoint {
  point: string;
  references: string[];
}

export interface StoryHistoryEntry {
  clusterId: string;
  createdAt: string;
  name: string | null;
  triggeredAt: string;
  summary: string;
  shortSummary: string;
  changelog: string | null;
  keyPoints: StoryHistoryKeyPoint[] | null;
  questions: string[] | null;
}

export interface StoryHistoryResult {
  status: number;
  numResults: number;
  results: StoryHistoryEntry[];
}

/**
 * Params accepted by the raw `/v1/articles/all` fetch. Field names mirror the
 * API query params (and thus the SDK's `SearchArticlesRequest`), since this
 * object is built once in the tool layer and reused for both the SDK call
 * shape and this raw-fetch shape.
 */
export type ArticlesFullParams = Record<string, unknown>;

/** A `{name}`-shaped taxonomy entry: categories, topics, taxonomies, entities, eventTypes, labels, keywords. */
export interface ArticleNamedLabel {
  name?: string | null;
  [key: string]: unknown;
}

/** An entry in `Article.matchedAuthors` — the journalist IDs behind a byline. */
export interface ArticleAuthorRef {
  id?: string | null;
  name?: string | null;
  [key: string]: unknown;
}

/** An entry in `Article.people`. */
export interface ArticlePersonRef {
  name?: string | null;
  wikidataId?: string | null;
  [key: string]: unknown;
}

/** An entry in `Article.companies`. */
export interface ArticleCompanyRef {
  name?: string | null;
  domain?: string | null;
  symbol?: string | null;
  [key: string]: unknown;
}

/** An entry in `Article.places` or `Article.locations`. */
export interface ArticlePlaceRef {
  city?: string | null;
  state?: string | null;
  country?: string | null;
  [key: string]: unknown;
}

/**
 * SDK's `Article` plus the one field it drops entirely: `enContentWordCount`.
 * Nested collections used by the `search_news_articles` formatter are typed
 * explicitly so a removed/renamed/reshaped upstream field fails type
 * checking instead of silently formatting as `undefined`; any other field
 * this raw endpoint returns still falls through the index signature.
 */
export interface ArticleFull {
  articleId?: string | null;
  title?: string | null;
  url?: string | null;
  description?: string | null;
  summary?: string | null;
  shortSummary?: string | null;
  content?: string | null;
  enContentWordCount?: number | null;
  pubDate?: string | null;
  addDate?: string | null;
  refreshDate?: string | null;
  source?: { domain?: string | null; [key: string]: unknown } | null;
  authorsByline?: string | null;
  language?: string | null;
  country?: string | null;
  medium?: string | null;
  imageUrl?: string | null;
  score?: number | null;
  reprint?: boolean | null;
  reprintGroupId?: string | null;
  claim?: string | null;
  verdict?: string | null;
  sentiment?: unknown;
  clusterId?: string | null;
  categories?: ArticleNamedLabel[] | null;
  topics?: ArticleNamedLabel[] | null;
  taxonomies?: ArticleNamedLabel[] | null;
  entities?: ArticleNamedLabel[] | null;
  eventTypes?: ArticleNamedLabel[] | null;
  labels?: ArticleNamedLabel[] | null;
  keywords?: ArticleNamedLabel[] | null;
  people?: ArticlePersonRef[] | null;
  companies?: ArticleCompanyRef[] | null;
  places?: ArticlePlaceRef[] | null;
  locations?: ArticlePlaceRef[] | null;
  links?: string[] | null;
  matchedAuthors?: ArticleAuthorRef[] | null;
  [key: string]: unknown;
}

export interface ArticlesFullResult {
  status: number;
  numResults: number;
  articles: ArticleFull[];
}

/**
 * Params for the raw `/v1/journalists/all` fetch. Includes the five
 * `location*` filters (`locationCountry`, `locationState`, `locationCounty`,
 * `locationCity`, `locationArea`) added upstream in `f65b52e44`, which the
 * v1 SDK's `SearchJournalistsRequest` does not declare.
 */
export type JournalistsFullParams = Record<string, unknown>;

export interface JournalistLocation {
  country?: string | null;
  state?: string | null;
  county?: string | null;
  city?: string | null;
  area?: string | null;
}

/** Journalist DTO fields the SDK already types correctly; declared here only because this call bypasses SDK deserialization. */
export interface JournalistFull {
  id?: string | null;
  name?: string | null;
  headline?: string | null;
  fullName?: string | null;
  description?: string | null;
  title?: string | null;
  avgMonthlyPosts?: number | null;
  twitterHandle?: string | null;
  linkedinUrl?: string | null;
  imageUrl?: string | null;
  updatedAt?: string | null;
  locations?: JournalistLocation[] | null;
  topSources?: Array<{ name?: string | null; count?: number | null }> | null;
  topCountries?: Array<{ name?: string | null; count?: number | null }> | null;
  topTopics?: Array<{ name?: string | null; count?: number | null }> | null;
  topCategories?: Array<{ name?: string | null; count?: number | null }> | null;
  topLabels?: Array<{ name?: string | null; count?: number | null }> | null;
  [key: string]: unknown;
}

export interface JournalistsFullResult {
  status: number;
  numResults: number;
  results: JournalistFull[];
}

/** `/v1/sources/{id}` response — same fields as a `search_sources` result item. */
export interface SourceDetail {
  name?: string | null;
  domain?: string | null;
  description?: string | null;
  monthlyVisits?: number | null;
  globalRank?: number | null;
  avgMonthlyPosts?: number | null;
  paywall?: boolean | null;
  altNames?: string[] | null;
  topTopics?: Array<{ name?: string | null; count?: number | null }> | null;
  location?: {
    country?: string | null;
    state?: string | null;
    city?: string | null;
  } | null;
  [key: string]: unknown;
}

/** `/v1/stats/topTopics` entry. The `wikidataId` field carries the topic name for topic spikes (topics have no Wikidata ID). */
export interface TopicSpike {
  wikidataId: string;
  spikeScore: number;
  currentMentions: number;
  baselineMentions: number;
  currentRatePerDay: number;
  baselineRatePerDay: number;
}

export interface StoryStatsParams {
  clusterId?: string[];
  name?: string;
  from?: Date;
  to?: Date;
  splitBy?: "hour" | "day" | "week" | "month" | "none";
  aggField?: "pubDate" | "addDate";
}

export interface StoryVelocityParams {
  clusterId: string[];
  from?: Date;
  to?: Date;
  bucketSize?: number;
  bucketTimeUnit: "minute" | "hour" | "day";
}

export interface StoryVelocityEntry {
  clusterId: string;
  date: string;
  count: number;
}

export class Perigon extends V1Api {
  private apiKey: string;

  constructor(apiKey: string) {
    super(new Configuration({ apiKey }));
    this.apiKey = apiKey;
  }

  async introspection(): Promise<AuthIntrospectionResponse> {
    return await typedFetch<AuthIntrospectionResponse>(
      `${BASE_URL}/auth/introspect`,
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      },
    );
  }

  private async monitorFetch<T>(
    path: string,
    options: RequestInit = {},
  ): Promise<T> {
    const headers = new Headers(options.headers);
    headers.set("Authorization", `Bearer ${this.apiKey}`);
    if (options.body !== undefined) {
      headers.set("Content-Type", "application/json");
    }

    return await typedFetch<T>(`${BASE_URL}/api/monitors${path}`, {
      ...options,
      headers,
    });
  }

  private buildMonitorPagination(
    params:
      | MonitorListParams
      | MonitorEventListParams
      | MonitorNewsletterListParams
      | MonitorOutputListParams,
  ): URLSearchParams {
    const searchParams = new URLSearchParams({
      page: String(params.page),
      size: String(params.size),
      sortBy: params.sortBy,
      sortOrder: params.sortOrder,
    });
    if (params.nulls) searchParams.set("nulls", params.nulls);
    return searchParams;
  }

  async listMonitors(
    params: MonitorListParams,
  ): Promise<MonitorTableResult<MonitorDto>> {
    const searchParams = this.buildMonitorPagination(params);
    if (params.uuid) {
      for (const uuid of params.uuid) searchParams.append("uuid", uuid);
    }
    if (params.name) searchParams.set("name", params.name);
    if (params.status) {
      for (const status of params.status) {
        searchParams.append("status", status);
      }
    }
    if (params.classificationType) {
      for (const classificationType of params.classificationType) {
        searchParams.append("classificationType", classificationType);
      }
    }

    return await this.monitorFetch<MonitorTableResult<MonitorDto>>(
      `?${searchParams.toString()}`,
    );
  }

  async getMonitor(uuid: string): Promise<MonitorSingleResult<MonitorDto>> {
    return await this.monitorFetch<MonitorSingleResult<MonitorDto>>(
      `/${encodeURIComponent(uuid)}`,
    );
  }

  async createMonitor(
    body: MonitorCreateRequest,
  ): Promise<MonitorSingleResult<MonitorDto>> {
    return await this.monitorFetch<MonitorSingleResult<MonitorDto>>("", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  async updateMonitor(
    uuid: string,
    body: MonitorUpdateRequest,
  ): Promise<MonitorSingleResult<MonitorDto>> {
    return await this.monitorFetch<MonitorSingleResult<MonitorDto>>(
      `/${encodeURIComponent(uuid)}`,
      {
        method: "PATCH",
        body: JSON.stringify(body),
      },
    );
  }

  async activateMonitor(
    uuid: string,
  ): Promise<MonitorSingleResult<MonitorDto>> {
    return await this.monitorFetch<MonitorSingleResult<MonitorDto>>(
      `/${encodeURIComponent(uuid)}/activate`,
      {
        method: "POST",
      },
    );
  }

  async pauseMonitor(uuid: string): Promise<MonitorSingleResult<MonitorDto>> {
    return await this.monitorFetch<MonitorSingleResult<MonitorDto>>(
      `/${encodeURIComponent(uuid)}/pause`,
      {
        method: "POST",
      },
    );
  }

  async archiveMonitor(uuid: string): Promise<MonitorSingleResult<MonitorDto>> {
    return await this.monitorFetch<MonitorSingleResult<MonitorDto>>(
      `/${encodeURIComponent(uuid)}`,
      {
        method: "DELETE",
      },
    );
  }

  async getMonitorEvents(
    uuid: string,
    params: MonitorEventListParams,
  ): Promise<MonitorTableResult<MonitorEventDto>> {
    const searchParams = this.buildMonitorPagination(params);
    if (params.eventType) searchParams.set("eventType", params.eventType);
    this.applyMonitorDateRange(searchParams, params);
    return await this.monitorFetch<MonitorTableResult<MonitorEventDto>>(
      `/${encodeURIComponent(uuid)}/events?${searchParams.toString()}`,
    );
  }

  async getMonitorNewsletters(
    uuid: string,
    params: MonitorNewsletterListParams,
  ): Promise<MonitorTableResult<MonitorNewsletterDto>> {
    const searchParams = this.buildMonitorPagination(params);
    if (params.title) searchParams.set("title", params.title);
    this.applyMonitorDateRange(searchParams, params);
    return await this.monitorFetch<MonitorTableResult<MonitorNewsletterDto>>(
      `/${encodeURIComponent(uuid)}/newsletters?${searchParams.toString()}`,
    );
  }

  async getMonitorSummaries(
    uuid: string,
    params: MonitorOutputListParams,
  ): Promise<MonitorTableResult<MonitorSummaryDto>> {
    const searchParams = this.buildMonitorPagination(params);
    this.applyMonitorDateRange(searchParams, params);
    return await this.monitorFetch<MonitorTableResult<MonitorSummaryDto>>(
      `/${encodeURIComponent(uuid)}/summary?${searchParams.toString()}`,
    );
  }

  private applyMonitorDateRange(
    searchParams: URLSearchParams,
    params: MonitorOutputListParams,
  ): void {
    if (params.from) searchParams.set("from", params.from);
    if (params.to) searchParams.set("to", params.to);
  }

  /** Build URLSearchParams from shared article filters used by all /v1/stats/* endpoints */
  private buildStatsFilters(params: StatsArticleFilters): URLSearchParams {
    const sp = new URLSearchParams();
    if (params.q) sp.set("q", params.q);
    if (params.from) sp.set("from", params.from.toISOString());
    if (params.to) sp.set("to", params.to.toISOString());
    if (params.source) for (const s of params.source) sp.append("source", s);
    if (params.sourceGroup)
      for (const g of params.sourceGroup) sp.append("sourceGroup", g);
    if (params.category)
      for (const c of params.category) sp.append("category", c);
    if (params.topic) for (const t of params.topic) sp.append("topic", t);
    if (params.language)
      for (const l of params.language) sp.append("language", l);
    if (params.country) for (const c of params.country) sp.append("country", c);
    if (params.personName)
      for (const p of params.personName) sp.append("personName", p);
    if (params.companyDomain)
      for (const d of params.companyDomain) sp.append("companyDomain", d);
    if (params.companySymbol)
      for (const s of params.companySymbol) sp.append("companySymbol", s);
    if (params.journalistId)
      for (const j of params.journalistId) sp.append("journalistId", j);
    if (params.personWikidataId)
      for (const p of params.personWikidataId) sp.append("personWikidataId", p);
    if (params.companyId)
      for (const c of params.companyId) sp.append("companyId", c);
    if (params.taxonomy)
      for (const t of params.taxonomy) sp.append("taxonomy", t);
    if (params.excludeSource)
      for (const s of params.excludeSource) sp.append("excludeSource", s);
    if (params.excludeCategory)
      for (const c of params.excludeCategory) sp.append("excludeCategory", c);
    if (params.excludeTopic)
      for (const t of params.excludeTopic) sp.append("excludeTopic", t);
    return sp;
  }

  async getAvgSentiment(
    params: StatsTimeSeriesParams,
  ): Promise<StatResult<AvgSentimentStatDto>> {
    const sp = this.buildStatsFilters(params);
    if (params.splitBy) sp.set("splitBy", params.splitBy);
    return await fetchWithRetry<StatResult<AvgSentimentStatDto>>(
      `${BASE_URL}/stats/avgSentiment?${sp.toString()}`,
      { headers: { Authorization: `Bearer ${this.apiKey}` } },
    );
  }

  async getArticleCounts(
    params: StatsTimeSeriesParams,
  ): Promise<StatResult<CountStatDto>> {
    const sp = this.buildStatsFilters(params);
    if (params.splitBy) sp.set("splitBy", params.splitBy);
    return await fetchWithRetry<StatResult<CountStatDto>>(
      `${BASE_URL}/stats/intervalArticleCounts?${sp.toString()}`,
      { headers: { Authorization: `Bearer ${this.apiKey}` } },
    );
  }

  async getTopEntities(params: TopEntitiesParams): Promise<TopEntitiesDto> {
    const sp = this.buildStatsFilters(params);
    if (params.entity) for (const e of params.entity) sp.append("entity", e);
    if (params.expandEntities !== undefined)
      sp.set("expandEntities", String(params.expandEntities));
    return await fetchWithRetry<TopEntitiesDto>(
      `${BASE_URL}/stats/topEntities?${sp.toString()}`,
      { headers: { Authorization: `Bearer ${this.apiKey}` } },
    );
  }

  async getTopPeople(
    params: TopSpikeParams,
  ): Promise<SpikeResult<PersonSpike>> {
    const sp = this.buildStatsFilters(params);
    this.applySpikePrams(sp, params);
    return await fetchWithRetry<SpikeResult<PersonSpike>>(
      `${BASE_URL}/stats/topPeople?${sp.toString()}`,
      { headers: { Authorization: `Bearer ${this.apiKey}` } },
    );
  }

  async getTopCompanies(
    params: TopSpikeParams,
  ): Promise<SpikeResult<CompanySpike>> {
    const sp = this.buildStatsFilters(params);
    this.applySpikePrams(sp, params);
    return await fetchWithRetry<SpikeResult<CompanySpike>>(
      `${BASE_URL}/stats/topCompanies?${sp.toString()}`,
      { headers: { Authorization: `Bearer ${this.apiKey}` } },
    );
  }

  private applySpikePrams(sp: URLSearchParams, params: TopSpikeParams) {
    if (params.currentFrom)
      sp.set("currentFrom", params.currentFrom.toISOString());
    if (params.currentTo) sp.set("currentTo", params.currentTo.toISOString());
    if (params.baselineFrom)
      sp.set("baselineFrom", params.baselineFrom.toISOString());
    if (params.baselineTo)
      sp.set("baselineTo", params.baselineTo.toISOString());
    if (params.normalizeByDay !== undefined)
      sp.set("normalizeByDay", String(params.normalizeByDay));
    if (params.size !== undefined) sp.set("size", String(params.size));
    if (params.minBaseline !== undefined)
      sp.set("minBaseline", String(params.minBaseline));
    if (params.minCurrent !== undefined)
      sp.set("minCurrent", String(params.minCurrent));
    if (params.smoothingAlpha !== undefined)
      sp.set("smoothingAlpha", String(params.smoothingAlpha));
    if (params.sortByOverride) sp.set("sortByOverride", params.sortByOverride);
  }

  async searchStoriesHistory(
    params: StoryHistoryParams,
  ): Promise<StoryHistoryResult> {
    const searchParams = new URLSearchParams();

    if (params.clusterId) {
      for (const id of params.clusterId) {
        searchParams.append("clusterId", id);
      }
    }
    if (params.from) searchParams.set("from", params.from.toISOString());
    if (params.to) searchParams.set("to", params.to.toISOString());
    if (params.sortBy) searchParams.set("sortBy", params.sortBy);
    if (params.page !== undefined)
      searchParams.set("page", String(params.page));
    if (params.size !== undefined)
      searchParams.set("size", String(params.size));
    if (params.changelogExists !== undefined)
      searchParams.set("changelogExists", String(params.changelogExists));

    return await typedFetch<StoryHistoryResult>(
      `${BASE_URL}/stories/history?${searchParams.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      },
    );
  }

  private authHeaders(): HeadersInit {
    return { Authorization: `Bearer ${this.apiKey}` };
  }

  /** `GET /v1/limits` — quota-exempt; does not count against the account's request quota. */
  async getLimits(apiKeys?: string[]): Promise<SingleResult<ApiLimitsDto>> {
    const sp = buildQueryParams({ apiKeys });
    return await typedFetch<SingleResult<ApiLimitsDto>>(
      `${BASE_URL}/limits?${sp.toString()}`,
      { headers: this.authHeaders() },
    );
  }

  /** `GET /v1/sources/{id}` — the only route to a source by ID; `SourcesSearchParams.id` is `@InternalParameter`. */
  async getSourceById(id: string): Promise<SourceDetail> {
    return await typedFetch<SourceDetail>(
      `${BASE_URL}/sources/${encodeURIComponent(id)}`,
      { headers: this.authHeaders() },
    );
  }

  /** `GET /v1/stats/topTopics` — the spike endpoint for topics; no MCP tool previously covered it. */
  async getTopTopics(params: TopSpikeParams): Promise<SpikeResult<TopicSpike>> {
    const sp = this.buildStatsFilters(params);
    this.applySpikePrams(sp, params);
    return await fetchWithRetry<SpikeResult<TopicSpike>>(
      `${BASE_URL}/stats/topTopics?${sp.toString()}`,
      { headers: this.authHeaders() },
    );
  }

  /** `GET /v1/stories/stats` — story-level publication volume over time, requires CLUSTERS. */
  async getStoryStats(
    params: StoryStatsParams,
  ): Promise<StatResult<CountStatDto>> {
    const sp = buildQueryParams({ ...params });
    return await fetchWithRetry<StatResult<CountStatDto>>(
      `${BASE_URL}/stories/stats?${sp.toString()}`,
      { headers: this.authHeaders() },
    );
  }

  /** `GET /v1/stories/stats/velocity` — per-cluster mention velocity over time, requires CLUSTERS. */
  async getStoryVelocity(
    params: StoryVelocityParams,
  ): Promise<StatResult<StoryVelocityEntry>> {
    const sp = buildQueryParams({ ...params });
    return await fetchWithRetry<StatResult<StoryVelocityEntry>>(
      `${BASE_URL}/stories/stats/velocity?${sp.toString()}`,
      { headers: this.authHeaders() },
    );
  }

  /**
   * `GET /v1/articles/all` via raw fetch — recovers `enContentWordCount`,
   * which is absent from the v1 SDK's `Article` interface entirely. `params`
   * uses the same field names as `V1Api.searchArticles`'s request object, so
   * callers can pass the exact object already built for the SDK call.
   */
  async searchArticlesFull(
    params: ArticlesFullParams,
  ): Promise<ArticlesFullResult> {
    const sp = buildQueryParams(params);
    return await typedFetch<ArticlesFullResult>(
      `${BASE_URL}/articles/all?${sp.toString()}`,
      { headers: this.authHeaders() },
    );
  }

  /**
   * `GET /v1/journalists/all` via raw fetch — required to send the five
   * `location*` filters (`locationCountry`, `locationState`,
   * `locationCounty`, `locationCity`, `locationArea`) added upstream in
   * `f65b52e44`, which `SearchJournalistsRequest` in
   * `@goperigon/perigon-ts@1.1.2` does not declare.
   */
  async searchJournalistsFull(
    params: JournalistsFullParams,
  ): Promise<JournalistsFullResult> {
    const sp = buildQueryParams(params);
    return await typedFetch<JournalistsFullResult>(
      `${BASE_URL}/journalists/all?${sp.toString()}`,
      { headers: this.authHeaders() },
    );
  }

  // ── Watchlists (/v1/api/watchlists) ────────────────────────────────────

  private async platformFetch<T>(
    basePath: string,
    path: string,
    options: RequestInit = {},
  ): Promise<T> {
    const headers = new Headers(options.headers);
    headers.set("Authorization", `Bearer ${this.apiKey}`);
    if (options.body !== undefined) {
      headers.set("Content-Type", "application/json");
    }
    return await typedFetch<T>(`${BASE_URL}${basePath}${path}`, {
      ...options,
      headers,
    });
  }

  async listWatchlists(params: {
    name?: string;
    page: number;
    size: number;
    sortBy: string;
    sortOrder: string;
  }): Promise<TableResult<WatchlistDto>> {
    const sp = buildQueryParams(params);
    return await this.platformFetch("/api/watchlists", `?${sp.toString()}`);
  }

  async getWatchlist(id: number): Promise<SingleResult<WatchlistDto>> {
    return await this.platformFetch("/api/watchlists", `/${id}`);
  }

  async resolveWatchlists(
    names: string[],
  ): Promise<SingleResult<WatchlistDto[]>> {
    const sp = buildQueryParams({ name: names });
    return await this.platformFetch(
      "/api/watchlists",
      `/resolve?${sp.toString()}`,
    );
  }

  async createWatchlist(
    body: CreateWatchlistRequest,
  ): Promise<SingleResult<WatchlistDto>> {
    return await this.platformFetch("/api/watchlists", "", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  async updateWatchlist(
    id: number,
    body: UpdateWatchlistRequest,
  ): Promise<SingleResult<WatchlistDto>> {
    return await this.platformFetch("/api/watchlists", `/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  }

  // ── Source groups (/v1/api/sourceGroups) ───────────────────────────────

  async listSourceGroups(params: {
    name?: string;
    domain?: string;
    page: number;
    size: number;
    sortBy: string;
    sortOrder: string;
  }): Promise<TableResult<SourceGroupDto>> {
    const sp = buildQueryParams(params);
    return await this.platformFetch("/api/sourceGroups", `?${sp.toString()}`);
  }

  async getSourceGroup(id: number): Promise<SingleResult<SourceGroupDto>> {
    return await this.platformFetch("/api/sourceGroups", `/${id}`);
  }

  async resolveSourceGroups(
    names: string[],
  ): Promise<SingleResult<SourceGroupDto[]>> {
    const sp = buildQueryParams({ name: names });
    return await this.platformFetch(
      "/api/sourceGroups",
      `/resolve?${sp.toString()}`,
    );
  }

  async createSourceGroup(
    body: CreateSourceGroupRequest,
  ): Promise<SingleResult<SourceGroupDto>> {
    return await this.platformFetch("/api/sourceGroups", "", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  async updateSourceGroup(
    id: number,
    body: UpdateSourceGroupRequest,
  ): Promise<SingleResult<SourceGroupDto>> {
    return await this.platformFetch("/api/sourceGroups", `/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  }

  // ── Contact points (/v1/api/contactPoints) — read-only ─────────────────

  async listContactPoints(params: {
    status?: string[];
    type?: string[];
    page: number;
    size: number;
    sortBy: string;
    sortOrder: string;
  }): Promise<TableResult<ContactPointDto>> {
    const sp = buildQueryParams(params);
    return await this.platformFetch("/api/contactPoints", `?${sp.toString()}`);
  }

  async getContactPoint(uuid: string): Promise<SingleResult<ContactPointDto>> {
    return await this.platformFetch(
      "/api/contactPoints",
      `/${encodeURIComponent(uuid)}`,
    );
  }

  // ── Article refresh (/v1/articles/refresh) — read-only per plan ────────

  async getArticleRefreshJob(
    jobId: string,
  ): Promise<ArticleRefreshJobResponse> {
    return await typedFetch<ArticleRefreshJobResponse>(
      `${BASE_URL}/articles/refresh/jobs/${encodeURIComponent(jobId)}`,
      { headers: this.authHeaders() },
    );
  }

  async peekArticleRefresh(
    articleIds: string[],
  ): Promise<ArticleRefreshPeekResponse> {
    return await typedFetch<ArticleRefreshPeekResponse>(
      `${BASE_URL}/articles/refresh/peek`,
      {
        method: "POST",
        headers: {
          ...this.authHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ articleIds }),
      },
    );
  }
}
