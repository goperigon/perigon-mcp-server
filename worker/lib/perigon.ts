import { Configuration, V1Api } from "@goperigon/perigon-ts";
import { AuthIntrospectionResponse } from "../types/types";
import { typedFetch } from "./typed-fetch";

const BASE_URL = "https://api.perigon.io/v1";

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

export type StatsSplitBy = "HOUR" | "DAY" | "WEEK" | "MONTH" | "NONE";

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

export interface CountStatDto {
  pubDate: string;
  addDate: string;
  count: number;
}

export interface AvgSentimentStatDto {
  pubDate: string;
  addDate: string;
  positive: number;
  negative: number;
  neutral: number;
}

export interface StatResult<T> {
  status: number;
  numResults: number;
  results: T[];
}

export interface EntitySpike {
  id: string;
  name: string;
  currentCount: number;
  baselineCount: number;
  spikeScore: number;
  [key: string]: unknown;
}

export interface TableSearchResult<T> {
  status: number;
  numResults: number;
  results: T[];
}

export interface TopEntitiesDto {
  topics?: unknown[];
  people?: unknown[];
  companies?: unknown[];
  cities?: unknown[];
  journalists?: unknown[];
  sources?: unknown[];
  [key: string]: unknown;
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
    return await typedFetch<StatResult<AvgSentimentStatDto>>(
      `${BASE_URL}/stats/avgSentiment?${sp.toString()}`,
      { headers: { Authorization: `Bearer ${this.apiKey}` } },
    );
  }

  async getArticleCounts(
    params: StatsTimeSeriesParams,
  ): Promise<StatResult<CountStatDto>> {
    const sp = this.buildStatsFilters(params);
    if (params.splitBy) sp.set("splitBy", params.splitBy);
    return await typedFetch<StatResult<CountStatDto>>(
      `${BASE_URL}/stats/intervalArticleCounts?${sp.toString()}`,
      { headers: { Authorization: `Bearer ${this.apiKey}` } },
    );
  }

  async getTopEntities(params: TopEntitiesParams): Promise<TopEntitiesDto> {
    const sp = this.buildStatsFilters(params);
    if (params.entity) for (const e of params.entity) sp.append("entity", e);
    return await typedFetch<TopEntitiesDto>(
      `${BASE_URL}/stats/topEntities?${sp.toString()}`,
      { headers: { Authorization: `Bearer ${this.apiKey}` } },
    );
  }

  async getTopPeople(
    params: TopSpikeParams,
  ): Promise<TableSearchResult<EntitySpike>> {
    const sp = this.buildStatsFilters(params);
    this.applySpikePrams(sp, params);
    return await typedFetch<TableSearchResult<EntitySpike>>(
      `${BASE_URL}/stats/topPeople?${sp.toString()}`,
      { headers: { Authorization: `Bearer ${this.apiKey}` } },
    );
  }

  async getTopCompanies(
    params: TopSpikeParams,
  ): Promise<TableSearchResult<EntitySpike>> {
    const sp = this.buildStatsFilters(params);
    this.applySpikePrams(sp, params);
    return await typedFetch<TableSearchResult<EntitySpike>>(
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
