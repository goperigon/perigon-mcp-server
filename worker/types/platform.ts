/**
 * Types for the platform-management surfaces (watchlists, source groups,
 * contact points, article refresh, limits) mirroring the DTOs returned by
 * `/v1/api/watchlists`, `/v1/api/sourceGroups`, `/v1/api/contactPoints`,
 * `/v1/articles/refresh`, and `/v1/limits` in business-api-server.
 */

export interface WatchlistPerson {
  name: string;
  description?: string;
  aliases?: string[];
  wikidataId?: string | null;
  query?: string | null;
}

export interface WatchlistCompany {
  name: string;
  description?: string;
  id?: string | null;
  domain?: string | null;
  aliases?: string[];
  query?: string | null;
}

export interface WatchlistDto {
  id: number;
  createdAt: string;
  updatedAt: string;
  name: string;
  displayName: string;
  description?: string | null;
  people: WatchlistPerson[];
  companies: WatchlistCompany[];
  organizationId?: number | null;
  visible: boolean;
}

export interface CreateWatchlistRequest {
  name: string;
  displayName?: string;
  description?: string;
  people: WatchlistPerson[];
  companies: WatchlistCompany[];
  visible?: boolean;
}

export interface UpdateWatchlistRequest {
  name?: string;
  displayName?: string;
  description?: string;
  people?: WatchlistPerson[];
  companies?: WatchlistCompany[];
  visible?: boolean;
}

export interface SourceGroupDto {
  id: number;
  createdAt: string;
  updatedAt: string;
  name: string;
  displayName: string;
  description?: string | null;
  domains: string[];
  organizationId?: number | null;
  visible: boolean;
}

export interface CreateSourceGroupRequest {
  name: string;
  displayName?: string;
  description?: string;
  domains: string[];
}

export interface UpdateSourceGroupRequest {
  name?: string;
  displayName?: string;
  description?: string;
  domains?: string[];
}

export type ContactPointType = "EMAIL" | "WEBHOOK" | "FASTN";
export type ContactPointStatus = "PENDING" | "ACTIVE" | "DISABLED";

export interface ContactPointDto {
  uuid: string;
  createdAt: string;
  updatedAt: string;
  type: ContactPointType;
  status: ContactPointStatus;
  name: string;
  email?: string | null;
  webhookUrl?: string | null;
  webhookSecret?: string | null;
  isVerified: boolean;
  verifiedAt?: string | null;
}

export interface ApiKeyStatus {
  keyPreview: string;
  valid: boolean;
  enabled: boolean;
  subscriptionActive: boolean;
  requestCount: number;
}

export interface ApiLimitsDto {
  organizationName: string;
  requestsUsed: number;
  requestLimit?: number | null;
  maxPageSize: number;
  paginationLimit: number;
  articleContentTruncation?: number | null;
  since?: string | null;
  lastMadeAt?: string | null;
  resetAt?: string | null;
  subscriptionCancelAt?: string | null;
  keyStatuses?: ApiKeyStatus[] | null;
}

export type ArticleRefreshJobStatus =
  | "PENDING"
  | "IN_PROGRESS"
  | "COMPLETE"
  | "FAILED";

export interface ArticleRefreshJobArticleResult {
  articleId: string;
  status: string;
  [key: string]: unknown;
}

export interface ArticleRefreshJobResponse {
  jobId: string;
  status: ArticleRefreshJobStatus;
  results: ArticleRefreshJobArticleResult[];
}

export interface ArticleRefreshPeekResult {
  articleId: string;
  [key: string]: unknown;
}

export interface ArticleRefreshPeekResponse {
  results: ArticleRefreshPeekResult[];
}

export interface TableResult<T> {
  total: number;
  data: T[];
}

export interface SingleResult<T> {
  data: T;
}
