import { Configuration, V1Api } from "@goperigon/perigon-ts";
import { AuthIntrospectionResponse, HttpError } from "../types/types";
import { typedFetch } from "./typed-fetch";

const BASE_URL = "https://api.perigon.io/v1";

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
}

/** Lowercase enum values accepted by the API for `splitBy`. NONE is represented by omitting the param. */
export type StatsSplitBy = "hour" | "day" | "week" | "month";

export interface StatsTimeSeriesParams extends StatsArticleFilters {
  splitBy?: StatsSplitBy;
}

export interface TopEntitiesParams extends StatsArticleFilters {
  entity?: string[];
}

export interface TopSpikeParams extends StatsArticleFilters {
  currentFrom?: Date;
  currentTo?: Date;
  baselineFrom?: Date;
  baselineTo?: Date;
  normalizeByDay?: boolean;
  size?: number;
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

  /** Build URLSearchParams from shared article filters used by all /v1/stats/* endpoints */
  private buildStatsFilters(params: StatsArticleFilters): URLSearchParams {
    const sp = new URLSearchParams();
    if (params.q) sp.set("q", params.q);
    if (params.from) sp.set("from", params.from.toISOString());
    if (params.to) sp.set("to", params.to.toISOString());
    if (params.source) for (const s of params.source) sp.append("source", s);
    if (params.sourceGroup) for (const g of params.sourceGroup) sp.append("sourceGroup", g);
    if (params.category) for (const c of params.category) sp.append("category", c);
    if (params.topic) for (const t of params.topic) sp.append("topic", t);
    if (params.language) for (const l of params.language) sp.append("language", l);
    if (params.country) for (const c of params.country) sp.append("country", c);
    if (params.personName) for (const p of params.personName) sp.append("personName", p);
    if (params.companyDomain) for (const d of params.companyDomain) sp.append("companyDomain", d);
    if (params.companySymbol) for (const s of params.companySymbol) sp.append("companySymbol", s);
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
    if (params.currentFrom) sp.set("currentFrom", params.currentFrom.toISOString());
    if (params.currentTo) sp.set("currentTo", params.currentTo.toISOString());
    if (params.baselineFrom) sp.set("baselineFrom", params.baselineFrom.toISOString());
    if (params.baselineTo) sp.set("baselineTo", params.baselineTo.toISOString());
    if (params.normalizeByDay !== undefined) sp.set("normalizeByDay", String(params.normalizeByDay));
    if (params.size !== undefined) sp.set("size", String(params.size));
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
}
