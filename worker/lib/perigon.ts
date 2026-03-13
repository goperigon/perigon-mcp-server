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
